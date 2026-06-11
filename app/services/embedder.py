"""BGE-large-en-v1.5 embedding service (singleton)."""
from __future__ import annotations

import logging
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# BGE models expect a query prefix for retrieval tasks
_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


class Embedder:
    """
    Singleton wrapper around BAAI/bge-large-en-v1.5.

    BGE-specific notes:
        • Passage (document) embeddings: no prefix required.
        • Query embeddings: prepend the BGE query instruction prefix.
        • normalize_embeddings=True ensures cosine similarity == dot product.
    """

    _instance: "Embedder | None" = None

    def __new__(cls, model_name: str = "BAAI/bge-large-en-v1.5") -> "Embedder":
        if cls._instance is None:
            logger.info("Loading embedding model: %s", model_name)
            instance = super().__new__(cls)
            # token=False forces anonymous download — bypasses any expired
            # HuggingFace cached credentials (model is public, no token needed)
            instance._model = SentenceTransformer(model_name, token=False)
            instance._model_name = model_name
            cls._instance = instance
            logger.info("Embedding model loaded successfully.")
        return cls._instance

    # ── Public API ────────────────────────────────────────────────────────────

    def embed_documents(
        self, texts: List[str], batch_size: int = 32
    ) -> List[List[float]]:
        """
        Embed a list of document/passage texts.
        Returns a list of float vectors (one per text).
        """
        logger.info("Embedding %d document chunks (batch_size=%d)", len(texts), batch_size)
        vectors: np.ndarray = self._model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=True,
            show_progress_bar=len(texts) > 50,
        )
        return vectors.tolist()

    def embed_query(self, query: str) -> List[float]:
        """
        Embed a single user query with the BGE query-prefix instruction.
        Returns a single float vector.
        """
        prefixed = _QUERY_PREFIX + query.strip()
        vector: np.ndarray = self._model.encode(
            prefixed,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return vector.tolist()

    @property
    def model_name(self) -> str:
        return self._model_name
