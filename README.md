# ▶ YOUCHAT // RAG

Chat with any YouTube video — just paste a link, and ask questions about what was actually said in it.

YOUCHAT pulls a video's captions, indexes them with embeddings in FAISS, and answers your questions using **only** that transcript — no guessing, no hallucinated facts. If the answer isn't in the video, it tells you so.

---

## Architecture & Structure

```
YOUCHAT_RAG/
├── frontend/                   # Modern React + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Top header with health status, model picker & controls
│   │   │   ├── VideoPanel.jsx       # Video URL input, embed player, library shelf, suggestions
│   │   │   ├── ChatPanel.jsx        # Conversation stream, markdown rendering, citations
│   │   │   └── TranscriptDrawer.jsx # Timestamped caption inspector with search & copy
│   │   ├── services/
│   │   │   └── api.js               # Client API methods
│   │   ├── App.jsx                  # Main application orchestrator
│   │   └── index.css                # Tailwind CSS styling & animations
│   ├── package.json
│   └── vite.config.js               # Vite config with proxy to backend
├── server.py                   # High-performance FastAPI backend server
├── app.py                      # Original Streamlit app (Mistral AI)
├── app1.py                     # Streamlit app (Groq + Mistral embeddings)
├── DATABASES/                  # Saved FAISS vector indices per video ID
├── requirements.txt            # Python dependencies
└── .env                        # API keys
```

---

## Features

- 🔗 **Paste any YouTube link** — Standard URLs, `youtu.be`, Shorts, or embed URLs.
- 🧠 **Retrieval-Augmented Generation (RAG)** — Grounded strictly in the video transcript via FAISS MMR retrieval.
- 📺 **Interactive In-App Video Player** — Watch side-by-side with chat or toggle preview.
- ⏱️ **Timestamped Transcript Inspector** — Full searchable timeline with one-click YouTube timestamp jumps.
- 📚 **Cached Video Library** — Instant switching between previously indexed videos without re-fetching captions.
- 🔍 **Source Citations** — Expandable context chunks for every AI answer to verify factual correctness.
- ⚡ **Multi-Model Support** — Groq (GPT-OSS 120B) for ultra-fast generation and Mistral AI embeddings.

---

## Quick Start (Modern React Frontend + FastAPI Backend)

### 1. Setup Python Environment & Backend

```bash
# Windows
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI backend
python server.py
# Server runs at http://127.0.0.1:8000 (API docs at http://127.0.0.1:8000/docs)
```

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

---

## Alternative: Streamlit App

You can also run the legacy Streamlit UI:

```bash
streamlit run app1.py
```

---

## License

MIT
