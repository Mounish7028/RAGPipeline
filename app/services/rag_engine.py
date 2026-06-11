"""RAG orchestration engine using google-genai SDK (v0.8+) with Gemini 2.5 Flash.

google-genai SDK usage pattern:
    client = genai.Client(api_key=KEY)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="...",
        config=types.GenerateContentConfig(
            system_instruction="...",
            temperature=0.2,
            max_output_tokens=2048,
        )
    )
    text = response.text
"""
from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any, Dict, List, Tuple

from google import genai
from google.genai import types

from app.services.embedder import Embedder
from app.services.vector_store import VectorStore

logger = logging.getLogger(__name__)

# ── System Persona ────────────────────────────────────────────────────────────
_SYSTEM_INSTRUCTION = """You are NvidiaBot, an expert AI financial analyst assistant specialised \
in NVIDIA's business, technology, financials, and strategy.

Your behaviour rules:
1. When the user asks about NVIDIA or topics covered in the provided CONTEXT section, \
   answer using ONLY that context. Be precise — cite specific figures, segment names, and \
   year-over-year comparisons. Structure responses with ### headers and bullet points.
2. When the user asks a general question NOT about NVIDIA (greetings, general AI topics, \
   personal questions), answer helpfully and conversationally using your general knowledge.
3. NEVER invent specific numbers, dates, product names, or financial figures that are not \
   explicitly present in the provided context.
4. If the context is insufficient to answer a specific NVIDIA question, clearly say so and \
   explain what additional information would be needed.
5. Keep responses structured, accurate, and professional yet approachable.
6. Remember and reference prior turns in the conversation when relevant.
7. For greetings or identity questions, be warm: introduce yourself as NvidiaBot, an AI \
   analyst assistant built to help users understand NVIDIA's 2025 Annual Report and beyond."""

# ── Prompt Templates ──────────────────────────────────────────────────────────
_RAG_PROMPT = """CONTEXT FROM NVIDIA 2025 ANNUAL REPORT
Retrieved pages: {pages}

{context}

---
CONVERSATION HISTORY:
{history}

USER QUESTION: {question}

Answer using ONLY the provided context above. Be thorough and cite specific data points \
(figures, percentages, product names). Use markdown: ### headers and bullet points for clarity. \
Do not fabricate any information not present in the context."""

_GENERAL_PROMPT = """CONVERSATION HISTORY:
{history}

USER MESSAGE: {question}

Respond naturally. For greetings be warm and introduce yourself as NvidiaBot. \
For knowledge questions be accurate and helpful."""


class RAGEngine:
    """
    Orchestrates the full RAG pipeline:
        1. Embed the user query via BGE.
        2. Retrieve top-k chunks from ChromaDB via cosine similarity.
        3. Relevance gate: if best distance < threshold → RAG-grounded answer.
        4. Build the appropriate prompt and call Gemini 2.5 Flash.
        5. Maintain per-session conversation history (last N turns).

    Uses google-genai SDK v0.8+ (not google-generativeai).
    """

    def __init__(
        self,
        embedder: Embedder,
        vector_store: VectorStore,
        gemini_api_key: str,
        gemini_model: str = "gemini-2.5-flash",
        top_k: int = 6,
        relevance_threshold: float = 0.35,
        max_history_turns: int = 10,
    ):
        self._embedder = embedder
        self._vector_store = vector_store
        self._top_k = top_k
        self._relevance_threshold = relevance_threshold
        self._max_history = max_history_turns
        self._gemini_model = gemini_model

        # ── Initialise google-genai client ────────────────────────────────────
        self._client = genai.Client(api_key=gemini_api_key)

        # Pre-build the GenerateContentConfig (reused per call, temperature only)
        self._gen_config = types.GenerateContentConfig(
            system_instruction=_SYSTEM_INSTRUCTION,
            temperature=0.2,
            max_output_tokens=2048,
        )

        # In-memory session store: session_id → [(role, text), ...]
        self._sessions: Dict[str, List[Tuple[str, str]]] = defaultdict(list)

        logger.info(
            "RAGEngine initialised | model=%s | top_k=%d | threshold=%.2f",
            gemini_model, top_k, relevance_threshold,
        )

    # ── Public API ────────────────────────────────────────────────────────────

    def chat(self, session_id: str, user_message: str) -> Dict[str, Any]:
        """
        Process a user message and return the assistant response dict.

        Returns:
            {
                "answer": str,
                "mode":   "rag" | "general",
                "sources": [{"page": int, "excerpt": str}, ...],
                "session_id": str,
            }
        """
        user_message = user_message.strip()
        if not user_message:
            return self._make_response(session_id, "Please enter a message.", "general", [])

        # ── Step 1: Embed query ───────────────────────────────────────────────
        query_vector = self._embedder.embed_query(user_message)

        # ── Step 2: Retrieve from ChromaDB ────────────────────────────────────
        hits: List[Dict] = []
        mode = "general"
        if self._vector_store.is_populated:
            hits = self._vector_store.query(query_vector, n_results=self._top_k)
            if hits:
                best_distance = hits[0]["distance"]
                logger.debug(
                    "Query: '%s…' | best_distance=%.4f | threshold=%.2f",
                    user_message[:40], best_distance, self._relevance_threshold,
                )
                # Cosine distance: 0=identical, 1=orthogonal, 2=opposite
                # Values < threshold → strong semantic match → use RAG
                if best_distance < self._relevance_threshold:
                    mode = "rag"

        # ── Step 3: Build prompt and call Gemini ──────────────────────────────
        history_text = self._format_history(session_id)
        if mode == "rag":
            prompt = self._build_rag_prompt(user_message, hits, history_text)
        else:
            prompt = self._build_general_prompt(user_message, history_text)

        answer = self._call_gemini(prompt)

        # ── Step 4: Update session history ────────────────────────────────────
        self._update_history(session_id, user_message, answer)

        # ── Step 5: Build source citations ────────────────────────────────────
        sources = self._extract_sources(hits, mode)

        return self._make_response(session_id, answer, mode, sources)

    def clear_session(self, session_id: str) -> None:
        """Clear conversation history for a session."""
        self._sessions.pop(session_id, None)
        logger.info("Session cleared: %s", session_id)

    # ── Private: Prompt Builders ──────────────────────────────────────────────

    def _build_rag_prompt(
        self, question: str, hits: List[Dict], history: str
    ) -> str:
        """Assemble the RAG-grounded prompt with retrieved context blocks."""
        context_blocks = []
        pages = []
        for idx, hit in enumerate(hits, start=1):
            context_blocks.append(
                f"[Chunk {idx} | Page {hit['page']}]\n{hit['text']}"
            )
            pages.append(str(hit["page"]))

        context = "\n\n".join(context_blocks)
        unique_pages = sorted(set(pages), key=lambda x: int(x) if x.isdigit() else 0)

        return _RAG_PROMPT.format(
            pages=", ".join(unique_pages),
            context=context,
            history=history,
            question=question,
        )

    def _build_general_prompt(self, question: str, history: str) -> str:
        """Assemble the general conversational prompt."""
        return _GENERAL_PROMPT.format(history=history, question=question)

    # ── Private: Gemini Call ──────────────────────────────────────────────────

    def _call_gemini(self, prompt: str) -> str:
        """
        Call Gemini 2.5 Flash via the google-genai SDK.

        SDK pattern (google-genai v0.8+):
            client.models.generate_content(
                model=MODEL,
                contents=PROMPT_STRING,
                config=GenerateContentConfig(...)
            )
        """
        try:
            response = self._client.models.generate_content(
                model=self._gemini_model,
                contents=prompt,
                config=self._gen_config,
            )
            return response.text.strip()
        except Exception as exc:
            logger.error("Gemini API error: %s", exc, exc_info=True)
            return (
                f"I encountered an error connecting to the AI service. "
                f"Please try again in a moment.\n\n_Error: {exc}_"
            )

    # ── Private: History Helpers ──────────────────────────────────────────────

    def _format_history(self, session_id: str) -> str:
        """Format the last N conversation turns as readable text."""
        turns = self._sessions.get(session_id, [])
        if not turns:
            return "(No prior conversation)"
        lines = []
        for role, text in turns[-(self._max_history * 2):]:
            prefix = "User" if role == "user" else "NvidiaBot"
            lines.append(f"{prefix}: {text[:600]}")
        return "\n".join(lines)

    def _update_history(
        self, session_id: str, user_msg: str, assistant_msg: str
    ) -> None:
        """Append the latest exchange to the session history."""
        history = self._sessions[session_id]
        history.append(("user", user_msg))
        history.append(("assistant", assistant_msg))
        max_entries = self._max_history * 2
        if len(history) > max_entries:
            self._sessions[session_id] = history[-max_entries:]

    # ── Private: Utilities ────────────────────────────────────────────────────

    @staticmethod
    def _extract_sources(hits: List[Dict], mode: str) -> List[Dict]:
        """Build deduplicated source citation list for RAG responses."""
        if mode != "rag":
            return []
        seen_pages: set = set()
        sources = []
        for hit in hits:
            page = hit["page"]
            if page not in seen_pages:
                sources.append({
                    "page": page,
                    "excerpt": hit["text"][:220] + "…",
                })
                seen_pages.add(page)
        return sources

    @staticmethod
    def _make_response(
        session_id: str, answer: str, mode: str, sources: list
    ) -> Dict[str, Any]:
        return {
            "answer": answer,
            "mode": mode,
            "sources": sources,
            "session_id": session_id,
        }
