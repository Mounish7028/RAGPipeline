"""ChromaDB vector store service."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import chromadb  # type: ignore


try:
    from chromadb.config import Settings as _ChromaSettings  # type: ignore

    def _make_settings() -> dict:
        return {"settings": _ChromaSettings(anonymized_telemetry=False)}
except ImportError:
    def _make_settings() -> dict:  # type: ignore[misc]
        return {}

from app.services.pdf_processor import TextChunk

logger = logging.getLogger(__name__)



class VectorStore:
    """
    Wraps ChromaDB persistent client for upsert and similarity search.

    ChromaDB stores embeddings, documents, and metadata.
    We pass pre-computed embeddings (from BGE) so ChromaDB does NOT
    run its own embedding function — this gives us full control.
    """

    def __init__(self, persist_dir: str, collection_name: str):
        self._persist_dir = persist_dir
        self._collection_name = collection_name
        self._client = chromadb.PersistentClient(
            path=persist_dir,
            **_make_settings(),
        )
        # Use no embedding function — we supply our own vectors
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},   # cosine similarity
        )
        logger.info(
            "ChromaDB collection '%s' ready — %d documents stored.",
            collection_name,
            self._collection.count(),
        )

    # ── Public API ────────────────────────────────────────────────────────────

    def upsert_chunks(
        self,
        chunks: List[TextChunk],
        embeddings: List[List[float]],
    ) -> None:
        """
        Upsert a list of TextChunks with their pre-computed embeddings.
        Batch inserts for performance.
        """
        if len(chunks) != len(embeddings):
            raise ValueError("chunks and embeddings must have the same length")

        ids = [c.chunk_id for c in chunks]
        documents = [c.text for c in chunks]
        metadatas = [
            {
                "page": c.page,
                "chunk_index": c.metadata.get("chunk_index", 0),
                "source": c.source,
            }
            for c in chunks
        ]

        # ChromaDB upsert in batches of 500 to avoid memory spikes
        batch_size = 500
        for i in range(0, len(ids), batch_size):
            self._collection.upsert(
                ids=ids[i : i + batch_size],
                embeddings=embeddings[i : i + batch_size],
                documents=documents[i : i + batch_size],
                metadatas=metadatas[i : i + batch_size],
            )
        logger.info("Upserted %d chunks into ChromaDB.", len(chunks))

    def query(
        self,
        query_embedding: List[float],
        n_results: int = 6,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve the top-n most similar chunks for a query embedding.

        Returns a list of dicts with keys: text, page, source, distance.
        """
        if self._collection.count() == 0:
            return []

        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, self._collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        hits = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            hits.append(
                {
                    "text": doc,
                    "page": meta.get("page", "?"),
                    "source": meta.get("source", ""),
                    "distance": round(dist, 4),
                }
            )
        return hits

    def count(self) -> int:
        """Return total number of documents in the collection."""
        return self._collection.count()

    def reset(self) -> None:
        """Delete and recreate the collection (for re-ingestion)."""
        self._client.delete_collection(self._collection_name)
        self._collection = self._client.get_or_create_collection(
            name=self._collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("Collection '%s' reset.", self._collection_name)

    @property
    def is_populated(self) -> bool:
        return self._collection.count() > 0
