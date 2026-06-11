"""Chat route: RAG chatbot endpoint."""
from __future__ import annotations

import logging
import uuid

from flask import Blueprint, jsonify, request

from app.services import get_ingestion_state, get_rag_engine

logger = logging.getLogger(__name__)
chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/chat", methods=["POST"])
def chat():
    """
    POST /api/chat
    Body: { "message": str, "session_id": str (optional) }
    Returns: { "answer": str, "mode": str, "sources": list, "session_id": str }
    """
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    session_id = data.get("session_id") or str(uuid.uuid4())

    if not message:
        return jsonify({"error": "Message cannot be empty."}), 400

    engine = get_rag_engine()
    if engine is None:
        return jsonify({"error": "RAG engine not initialised. Please restart the server."}), 503

    try:
        result = engine.chat(session_id=session_id, user_message=message)
        return jsonify(result), 200
    except Exception as exc:
        logger.exception("Chat error: %s", exc)
        return jsonify({"error": f"Internal error: {str(exc)}"}), 500


@chat_bp.route("/health", methods=["GET"])
def health():
    """GET /api/health — liveness check."""
    from app.services import get_vector_store
    vs = get_vector_store()
    doc_count = vs.count() if vs else 0
    state = get_ingestion_state()
    return jsonify(
        {
            "status": "ok",
            "chroma_docs": doc_count,
            "ingestion": state["status"],
        }
    ), 200


@chat_bp.route("/clear", methods=["POST"])
def clear_session():
    """POST /api/clear — clear conversation history for a session."""
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id", "")
    if session_id:
        engine = get_rag_engine()
        if engine:
            engine.clear_session(session_id)
    return jsonify({"message": "Session cleared."}), 200
