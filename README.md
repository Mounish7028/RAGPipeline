# NVIDIA RAG Chatbot 🤖

> A production-grade Retrieval-Augmented Generation (RAG) chatbot powered by **BAAI/bge-large-en-v1.5** embeddings, **ChromaDB** vector store, and **Gemini 2.5 Flash** LLM — built on **Flask**.

---

## 📁 Project Structure

```
RAGPipeline/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── config.py            # All config constants
│   ├── routes/
│   │   ├── upload.py        # POST /api/upload, GET /api/status
│   │   └── chat.py          # POST /api/chat, GET /api/health, POST /api/clear
│   ├── services/
│   │   ├── __init__.py      # Dependency container + init_services()
│   │   ├── pdf_processor.py # PyMuPDF extraction + sliding-window chunking
│   │   ├── embedder.py      # BGE-large singleton embedder
│   │   ├── vector_store.py  # ChromaDB persistent client
│   │   └── rag_engine.py    # RAG orchestration + Gemini 2.5 Flash
│   └── utils/helpers.py
├── static/css/style.css
├── static/js/main.js
├── templates/index.html
├── chroma_store/            # Auto-created — persisted ChromaDB
├── uploads/                 # Auto-created — temp PDF storage
├── run.py                   # Entry point
├── requirements.txt
└── README.md
```

---

## ⚡ Quick Start

### 1. Create a virtual environment

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

> **GPU acceleration (optional):** Replace `torch==2.3.1` in requirements.txt with the appropriate CUDA build from [pytorch.org](https://pytorch.org/get-started/locally/).

### 3. Run the application

```bash
python run.py
```

Open **http://127.0.0.1:5000** in your browser.

---

## 🔄 How It Works

### Ingestion Pipeline
1. Upload NVIDIA 2025 Annual Report PDF via the sidebar.
2. **PyMuPDF** extracts text page-by-page, skipping image-only pages.
3. Text is split into chunks (`size=800 chars`, `overlap=80 chars`).
4. **BGE-large-en-v1.5** embeds each chunk (normalised cosine embeddings).
5. Chunks + embeddings upserted into **ChromaDB** (persisted to `./chroma_store`).

### RAG Pipeline (per query)
1. User query → embedded with BGE query-instruction prefix.
2. Top-6 most similar chunks retrieved from ChromaDB via cosine distance.
3. **Relevance gating:** If best distance < 0.35 → RAG-grounded answer; else → general Gemini answer.
4. Prompt built with system persona + retrieved context + conversation history.
5. **Gemini 2.5 Flash** generates the response.
6. Per-session conversation history maintained (last 10 turns).

---

## 🌐 API Endpoints

| Method | Endpoint        | Description                              |
|--------|-----------------|------------------------------------------|
| `POST` | `/api/upload`   | Upload PDF; starts ingestion pipeline    |
| `GET`  | `/api/status`   | Poll ingestion progress (0-100%)         |
| `POST` | `/api/chat`     | Send a message; get RAG/general response |
| `GET`  | `/api/health`   | Health check + ChromaDB doc count        |
| `POST` | `/api/clear`    | Clear conversation history for a session |

### `/api/chat` Request Body
```json
{
  "message": "What was NVIDIA's total revenue in Fiscal 2025?",
  "session_id": "optional-uuid-string"
}
```

### `/api/chat` Response
```json
{
  "answer": "NVIDIA's total revenue was $130.5 billion...",
  "mode": "rag",
  "sources": [{"page": 42, "excerpt": "..."}],
  "session_id": "uuid"
}
```

---

## ⚙️ Configuration (`app/config.py`)

| Parameter              | Default              | Description                         |
|------------------------|----------------------|-------------------------------------|
| `CHUNK_SIZE`           | `800`                | Characters per chunk                |
| `CHUNK_OVERLAP`        | `80`                 | Overlap between chunks              |
| `EMBEDDING_MODEL`      | `BAAI/bge-large-en-v1.5` | HuggingFace embedding model    |
| `EMBEDDING_BATCH_SIZE` | `32`                 | Chunks per embedding batch          |
| `TOP_K_RESULTS`        | `6`                  | Number of chunks retrieved          |
| `RELEVANCE_THRESHOLD`  | `0.35`               | Cosine distance RAG gate            |
| `GEMINI_MODEL`         | `gemini-2.5-flash`   | Gemini model version                |
| `MAX_HISTORY_TURNS`    | `10`                 | Conversation turns to keep          |

---

## 🔑 Environment Variables

You can override the API key via environment variable:

```bash
set GEMINI_API_KEY=your_api_key_here   # Windows
export GEMINI_API_KEY=your_api_key_here  # Linux/Mac
```

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| `torch` install slow | Use `--index-url https://download.pytorch.org/whl/cpu` |
| ChromaDB conflicts | `pip install chromadb==0.5.5 --force-reinstall` |
| BGE model slow first run | Model downloads ~1.3GB on first use; cached afterwards |
| Gemini 429 error | You've hit rate limits; wait a moment and retry |
