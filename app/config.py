"""Application configuration.

PDF: NVIDIA-2025-Annual-Report-compressed.pdf
  - 181 pages, ~664K extractable characters
  - ~900-1000 chunks at size=800 chars, overlap=80 chars
  - All 180 pages are text-rich; 1 near-blank page

Gemini SDK: google-genai (v0.8+)
  - Import: from google import genai; from google.genai import types
  - Client: genai.Client(api_key=KEY)
  - Call:   client.models.generate_content(model=M, contents=P, config=C)
"""
import os


class Config:
    # ── Flask ────────────────────────────────────────────────────────────────
    SECRET_KEY = os.environ.get("SECRET_KEY", "nvidia-rag-secret-2025")
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB upload limit

    # ── Paths ────────────────────────────────────────────────────────────────
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    CHROMA_PERSIST_DIR = os.path.join(BASE_DIR, "chroma_store")

    # ── ChromaDB ─────────────────────────────────────────────────────────────
    CHROMA_COLLECTION_NAME = "nvidia_financial_2025"

    # ── Embedding (BAAI/bge-large-en-v1.5) ───────────────────────────────────
    EMBEDDING_MODEL = "BAAI/bge-large-en-v1.5"
    EMBEDDING_BATCH_SIZE = 32

    # ── Chunking (tuned for NVIDIA 2025 report: 181pp, ~665K chars) ──────────
    CHUNK_SIZE = 800    # characters per chunk
    CHUNK_OVERLAP = 80  # overlap between consecutive chunks (~10%)

    # ── RAG Retrieval ────────────────────────────────────────────────────────
    TOP_K_RESULTS = 6           # top chunks retrieved per query
    RELEVANCE_THRESHOLD = 0.35  # cosine distance gate (< threshold = use RAG)

    # ── Gemini (google-genai SDK v0.8+) ──────────────────────────────────────
    # SDK: google-genai  (NOT google-generativeai)
    # ⚠️  IMPORTANT: Get your FREE key from https://aistudio.google.com/apikey
    #     Valid key format: AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  (~39 chars)
    #     Then paste it below OR set env var:  set GEMINI_API_KEY=AIzaSy...
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    GEMINI_MODEL = "gemini-2.5-flash"

    # ── Conversation ─────────────────────────────────────────────────────────
    MAX_HISTORY_TURNS = 10  # number of (user, assistant) pairs to remember
