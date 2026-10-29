import os
import re
import json
import urllib.request
from typing import List, Optional
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    IpBlocked,
    TranscriptsDisabled,
    NoTranscriptFound,
)

from langchain_mistralai import MistralAIEmbeddings, ChatMistralAI
from langchain_groq import ChatGroq
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate

app = FastAPI(
    title="YouChat RAG API",
    description="Backend API powering the YouChat YouTube RAG interface",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASES_DIR = "DATABASES"
os.makedirs(DATABASES_DIR, exist_ok=True)

# Initialize Mistral embeddings (matches existing FAISS indices)
embeddings = MistralAIEmbeddings(model="mistral-embed")

def get_llm(model_choice: Optional[str] = None):
    """Resolve LLM according to model_choice or available environment keys."""
    if model_choice == "mistral":
        return ChatMistralAI(model="mistral-small-latest", temperature=0)
    
    # Default to Groq GPT-OSS 120B
    groq_model = model_choice if model_choice and "gpt-oss" in model_choice else "openai/gpt-oss-120b"
    try:
        return ChatGroq(model=groq_model, temperature=0)
    except Exception:
        return ChatGroq(model="openai/gpt-oss-120b", temperature=0)

qa_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are YouChat AI, a precise, intelligent assistant answering questions about a YouTube video.

Rules:
1. Answer strictly based on the provided video transcript context.
2. If the context does not contain the answer, say clearly: "I couldn't find the answer in the video transcript."
3. Never invent facts or use outside knowledge not supported by the video.
4. Format your responses with clean, readable Markdown (bullet points, clear paragraphs, code blocks if applicable).
5. When relevant, reference the context timestamps if available."""
    ),
    (
        "human",
        """Context from Video Transcript:
{context}

Question:
{question}"""
    )
])

# -----------------------------
# HELPERS
# -----------------------------

def extract_video_id(url_or_id: str) -> Optional[str]:
    url = url_or_id.strip()
    if re.match(r"^[a-zA-Z0-9_-]{11}$", url):
        return url

    parsed = urlparse(url)
    if "youtube.com" in parsed.netloc:
        if parsed.path == "/watch":
            v = parse_qs(parsed.query).get("v")
            if v:
                return v[0]
        if parsed.path.startswith("/embed/"):
            return parsed.path.split("/embed/")[1].split("/")[0]
        if parsed.path.startswith("/shorts/"):
            return parsed.path.split("/shorts/")[1].split("/")[0]

    if "youtu.be" in parsed.netloc:
        return parsed.path.strip("/").split("?")[0]

    return None

def fetch_video_metadata(video_id: str):
    """Fetch title and author from YouTube oEmbed."""
    title = f"YouTube Video ({video_id})"
    author = "YouTube Creator"
    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        req = urllib.request.Request(
            oembed_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode())
            title = data.get("title", title)
            author = data.get("author_name", author)
    except Exception:
        pass

    thumbnail = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
    return {
        "title": title,
        "author": author,
        "thumbnail_url": thumbnail,
        "video_url": f"https://www.youtube.com/watch?v={video_id}"
    }

# -----------------------------
# SCHEMAS
# -----------------------------

class LoadVideoRequest(BaseModel):
    url: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    video_id: str
    question: str
    model: Optional[str] = "openai/gpt-oss-120b"
    history: Optional[List[ChatMessage]] = []

# -----------------------------
# API ROUTES
# -----------------------------

@app.get("/api/health")
def health():
    return {
        "status": "online",
        "mistral_available": bool(os.getenv("MISTRAL_API_KEY")),
        "groq_available": bool(os.getenv("GROQ_API_KEY")),
        "google_available": bool(os.getenv("GOOGLE_API_KEY")),
    }

@app.get("/api/library")
def get_library():
    """List previously indexed videos saved in DATABASES/."""
    videos = []
    if os.path.exists(DATABASES_DIR):
        for entry in os.listdir(DATABASES_DIR):
            folder_path = os.path.join(DATABASES_DIR, entry)
            if os.path.isdir(folder_path):
                meta = fetch_video_metadata(entry)
                videos.append({
                    "video_id": entry,
                    "title": meta["title"],
                    "author": meta["author"],
                    "thumbnail_url": meta["thumbnail_url"],
                    "indexed": True
                })
    return {"videos": videos}

@app.post("/api/video/load")
def load_video(req: LoadVideoRequest):
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL or ID.")

    meta = fetch_video_metadata(video_id)
    db_path = os.path.join(DATABASES_DIR, video_id)
    cached = os.path.exists(db_path)

    transcript_summary = ""
    chunk_count = 0

    if not cached:
        try:
            transcript = YouTubeTranscriptApi().fetch(video_id)
        except IpBlocked:
            raise HTTPException(
                status_code=429,
                detail="YouTube is temporarily blocking requests from this IP. Please try again in a few minutes."
            )
        except TranscriptsDisabled:
            raise HTTPException(
                status_code=400,
                detail="Transcripts are disabled for this YouTube video."
            )
        except NoTranscriptFound:
            raise HTTPException(
                status_code=404,
                detail="No English or auto-generated transcript found for this video."
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch transcript: {str(e)}"
            )

        full_text = " ".join(chunk.text for chunk in transcript)
        if not full_text.strip():
            raise HTTPException(status_code=400, detail="The video transcript is empty.")

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = splitter.split_text(full_text)
        chunk_count = len(chunks)

        vector_store = FAISS.from_texts(
            texts=chunks,
            embedding=embeddings
        )
        vector_store.save_local(db_path)
        transcript_summary = f"{len(transcript)} transcript segments processed into {chunk_count} vector chunks."
    else:
        transcript_summary = "Loaded pre-indexed vector database from disk cache."

    return {
        "video_id": video_id,
        "title": meta["title"],
        "author": meta["author"],
        "thumbnail_url": meta["thumbnail_url"],
        "video_url": meta["video_url"],
        "cached": cached,
        "status": "Ready",
        "message": transcript_summary
    }

@app.post("/api/chat")
def chat(req: ChatRequest):
    video_id = req.video_id
    db_path = os.path.join(DATABASES_DIR, video_id)

    if not os.path.exists(db_path):
        raise HTTPException(
            status_code=404,
            detail="Knowledge base for this video has not been loaded. Please load the video first."
        )

    try:
        vector_store = FAISS.load_local(
            db_path,
            embeddings,
            allow_dangerous_deserialization=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load vector index: {str(e)}")

    retriever = vector_store.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 4,
            "fetch_k": 15,
            "lambda_mult": 0.5
        }
    )

    docs = retriever.invoke(req.question)
    context_chunks = [doc.page_content for doc in docs]
    context = "\n\n---\n\n".join(context_chunks)

    final_prompt = qa_prompt.invoke({
        "context": context,
        "question": req.question
    })

    try:
        llm = get_llm(req.model)
        response = llm.invoke(final_prompt)
        answer = response.content
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM generation error: {str(e)}"
        )

    return {
        "answer": answer,
        "sources": [
            {
                "index": i + 1,
                "content": doc.page_content.strip()
            }
            for i, doc in enumerate(docs)
        ]
    }

@app.get("/api/video/{video_id}/transcript")
def get_transcript(video_id: str):
    try:
        raw_transcript = YouTubeTranscriptApi().fetch(video_id)
        segments = [
            {
                "start": round(chunk.start, 1),
                "duration": round(chunk.duration, 1),
                "text": chunk.text
            }
            for chunk in raw_transcript
        ]
        return {
            "video_id": video_id,
            "total_segments": len(segments),
            "segments": segments
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not load raw transcript: {str(e)}")

# -----------------------------
# PRODUCTION STATIC FRONTEND SERVING
# -----------------------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"status": "Frontend build not found. Run 'npm run build' inside frontend/"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
