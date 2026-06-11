"""Application entry point."""
import logging
import os

# ── HuggingFace: disable implicit token for public model downloads ────────────
# Prevents 401 errors from expired cached credentials (e.g., old hf login tokens)
os.environ.setdefault("HF_HUB_DISABLE_IMPLICIT_TOKEN", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")   # suppress tokenizer fork warning

from app import create_app
from app.services import init_services


# ── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Create Flask App ──────────────────────────────────────────────────────────
app = create_app()

# ── Initialise Services (Embedder + ChromaDB + RAGEngine) ─────────────────────
with app.app_context():
    init_services(app)

# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info("Starting NVIDIA RAG Chatbot on http://127.0.0.1:%d", port)
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
