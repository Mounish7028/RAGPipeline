"""Upload route: PDF ingestion pipeline."""
from __future__ import annotations

import logging
import os
import threading

from flask import Blueprint, current_app, jsonify, request

from app.services import (
    get_embedder,
    get_ingestion_state,
    get_vector_store,
    set_ingestion_state,
)
from app.services.pdf_processor import PDFProcessor
from app.utils.helpers import allowed_file, safe_filename

logger = logging.getLogger(__name__)
upload_bp = Blueprint("upload", __name__)


@upload_bp.route("/upload", methods=["POST"])
def upload_pdf():
    """
    POST /api/upload
    Accepts a multipart/form-data PDF file.
    Starts the ingestion pipeline in a background thread.
    Returns immediately with job status.
    """
    state = get_ingestion_state()
    if state["status"] == "running":
        return jsonify({"error": "An ingestion is already in progress. Please wait."}), 409

    if "file" not in request.files:
        return jsonify({"error": "No file part in the request."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF files are supported."}), 415

    # Save file temporarily
    filename = safe_filename(file.filename)
    upload_dir = current_app.config["UPLOAD_FOLDER"]
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    # Capture config values before leaving app context
    chunk_size = current_app.config["CHUNK_SIZE"]
    chunk_overlap = current_app.config["CHUNK_OVERLAP"]
    embedding_batch_size = current_app.config["EMBEDDING_BATCH_SIZE"]

    # Launch background ingestion
    thread = threading.Thread(
        target=_run_ingestion,
        args=(filepath, chunk_size, chunk_overlap, embedding_batch_size),
        daemon=True,
    )
    thread.start()

    return jsonify(
        {
            "message": "File received. Ingestion pipeline started.",
            "filename": filename,
            "status": "running",
        }
    ), 202


@upload_bp.route("/status", methods=["GET"])
def ingestion_status():
    """GET /api/status — returns current ingestion progress."""
    state = get_ingestion_state()
    return jsonify(state), 200


# ── Background Ingestion Logic ────────────────────────────────────────────────


def _run_ingestion(filepath: str, chunk_size: int, overlap: int, batch_size: int):
    """
    Full ingestion pipeline (runs in a background thread):
        1. Extract & chunk PDF
        2. Embed chunks via BGE
        3. Upsert into ChromaDB
    """
    try:
        set_ingestion_state(
            status="running",
            progress=5,
            message="Extracting text from PDF…",
            total_chunks=0,
        )

        # ── Step 1: Process PDF ───────────────────────────────────────────────
        processor = PDFProcessor(chunk_size=chunk_size, overlap=overlap)
        chunks = processor.process(filepath)

        if not chunks:
            set_ingestion_state(
                status="error",
                progress=0,
                message="No extractable text found in the PDF.",
            )
            return

        set_ingestion_state(
            progress=30,
            message=f"PDF parsed — {len(chunks)} chunks created. Generating embeddings…",
            total_chunks=len(chunks),
        )

        # ── Step 2: Embed ─────────────────────────────────────────────────────
        embedder = get_embedder()
        texts = [c.text for c in chunks]
        embeddings = embedder.embed_documents(texts, batch_size=batch_size)

        set_ingestion_state(
            progress=70,
            message=f"Embeddings generated. Storing {len(chunks)} chunks in ChromaDB…",
        )

        # ── Step 3: Store in ChromaDB ─────────────────────────────────────────
        vector_store = get_vector_store()
        # Reset old data if re-uploading
        vector_store.reset()
        vector_store.upsert_chunks(chunks, embeddings)

        set_ingestion_state(
            status="done",
            progress=100,
            message=f"✅ Ingestion complete! {len(chunks)} chunks indexed from {os.path.basename(filepath)}.",
            total_chunks=len(chunks),
        )
        logger.info("Ingestion complete: %d chunks stored.", len(chunks))

    except Exception as exc:
        logger.exception("Ingestion failed: %s", exc)
        set_ingestion_state(
            status="error",
            progress=0,
            message=f"❌ Ingestion failed: {str(exc)}",
        )
    finally:
        # Clean up uploaded file
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass
