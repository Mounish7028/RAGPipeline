"""Shared dependency container — initialised once at app startup."""
from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Module-level singletons — populated in run.py before Flask starts
_embedder = None
_vector_store = None
_rag_engine = None

# Ingestion state tracker
_ingestion_state: dict = {
    "status": "idle",        # idle | running | done | error
    "progress": 0,           # 0-100
    "message": "",
    "total_chunks": 0,
}


def get_embedder():
    return _embedder


def get_vector_store():
    return _vector_store


def get_rag_engine():
    return _rag_engine


def get_ingestion_state() -> dict:
    return dict(_ingestion_state)


def set_ingestion_state(**kwargs) -> None:
    _ingestion_state.update(kwargs)


def init_services(app) -> None:
    """Bootstrap all services using the Flask app config."""
    global _embedder, _vector_store, _rag_engine

    from app.services.embedder import Embedder
    from app.services.vector_store import VectorStore
    from app.services.rag_engine import RAGEngine

    logger.info("Initialising services…")

    _embedder = Embedder(app.config["EMBEDDING_MODEL"])

    _vector_store = VectorStore(
        persist_dir=app.config["CHROMA_PERSIST_DIR"],
        collection_name=app.config["CHROMA_COLLECTION_NAME"],
    )

    _rag_engine = RAGEngine(
        embedder=_embedder,
        vector_store=_vector_store,
        gemini_api_key=app.config["GEMINI_API_KEY"],
        gemini_model=app.config["GEMINI_MODEL"],
        top_k=app.config["TOP_K_RESULTS"],
        relevance_threshold=app.config["RELEVANCE_THRESHOLD"],
        max_history_turns=app.config["MAX_HISTORY_TURNS"],
    )

    logger.info("All services initialised successfully.")
