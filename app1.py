from dotenv import load_dotenv
load_dotenv()

import os
from urllib.parse import urlparse, parse_qs

import streamlit as st

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import IpBlocked

from langchain_mistralai import MistralAIEmbeddings
from langchain_groq import ChatGroq

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate


# ============================================================
# PAGE CONFIG
# ============================================================

st.set_page_config(
    page_title="YouChat RAG",
    page_icon="🎥",
    layout="wide"
)


# ============================================================
# CUSTOM CSS
# ============================================================

st.markdown(
    """
    <style>

    /* Main container */

    .block-container {
        max-width: 1100px;
        padding-top: 2rem;
        padding-bottom: 2rem;
    }


    /* Header */

    .main-title {
        font-size: 42px;
        font-weight: 700;
        margin-bottom: 5px;
    }

    .subtitle {
        font-size: 17px;
        color: #888888;
        margin-bottom: 30px;
    }


    /* Sidebar */

    section[data-testid="stSidebar"] {
        padding-top: 2rem;
    }


    /* Status card */

    .status-card {
        padding: 15px;
        border-radius: 12px;
        background-color: rgba(128, 128, 128, 0.10);
        margin-top: 10px;
        margin-bottom: 15px;
    }


    /* Video card */

    .video-card {
        padding: 15px;
        border-radius: 12px;
        background-color: rgba(128, 128, 128, 0.08);
        margin-top: 15px;
        margin-bottom: 15px;
    }


    /* Chat messages */

    [data-testid="stChatMessage"] {
        border-radius: 12px;
        margin-bottom: 10px;
    }


    /* Buttons */

    .stButton > button {
        border-radius: 8px;
        font-weight: 600;
    }


    /* Footer */

    .footer {
        text-align: center;
        color: #888888;
        margin-top: 50px;
        font-size: 14px;
    }

    </style>
    """,
    unsafe_allow_html=True
)


# ============================================================
# MODELS
# ============================================================

embeddings = MistralAIEmbeddings(
    model="mistral-embed"
)


llm = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0
)


# ============================================================
# PROMPT
# ============================================================

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",

            """
You are an AI assistant that answers questions
about a YouTube video.

Answer ONLY using the provided transcript context.

If the answer is not available in the transcript,
reply exactly:

"I couldn't find the answer in the transcript."

Do not use outside knowledge.

Never hallucinate.
"""
        ),

        (
            "human",

            """
Context:

{context}

Question:

{question}
"""
        )
    ]
)


# ============================================================
# GET VIDEO ID
# ============================================================

def get_video_id(url):

    parsed_url = urlparse(url)

    # -----------------------------------------
    # youtube.com/watch?v=VIDEO_ID
    # -----------------------------------------

    if "youtube.com" in parsed_url.netloc:

        video_id = parse_qs(
            parsed_url.query
        ).get("v")

        if video_id:
            return video_id[0]


    # -----------------------------------------
    # youtu.be/VIDEO_ID
    # -----------------------------------------

    if "youtu.be" in parsed_url.netloc:

        video_id = parsed_url.path.strip("/")

        if video_id:
            return video_id


    return None


# ============================================================
# CREATE DATABASE
# ============================================================

def create_database(video_id):

    try:

        transcript = YouTubeTranscriptApi().fetch(
            video_id
        )

    except IpBlocked:

        raise RuntimeError(
            "YouTube is blocking requests from your current IP. "
            "Try using a mobile hotspot or another network."
        )

    except Exception as e:

        raise RuntimeError(
            f"Could not fetch YouTube transcript: {e}"
        )


    # -----------------------------------------
    # Convert transcript to text
    # -----------------------------------------

    text = " ".join(
        chunk.text
        for chunk in transcript
    )


    if not text.strip():

        raise RuntimeError(
            "The transcript is empty."
        )


    # -----------------------------------------
    # Split text
    # -----------------------------------------

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )


    chunks = splitter.split_text(text)


    # -----------------------------------------
    # Create FAISS
    # -----------------------------------------

    vector_store = FAISS.from_texts(
        texts=chunks,
        embedding=embeddings
    )


    # -----------------------------------------
    # Save database
    # -----------------------------------------

    db_path = f"DATABASES/{video_id}"

    os.makedirs(
        "DATABASES",
        exist_ok=True
    )


    vector_store.save_local(
        db_path
    )


    return vector_store, len(chunks)


# ============================================================
# LOAD DATABASE
# ============================================================

def load_database(video_id):

    db_path = f"DATABASES/{video_id}"


    # -----------------------------------------
    # Database exists
    # -----------------------------------------

    if os.path.exists(db_path):

        vector_store = FAISS.load_local(
            db_path,
            embeddings,
            allow_dangerous_deserialization=True
        )

        return vector_store, "Existing database loaded", False


    # -----------------------------------------
    # Database doesn't exist
    # -----------------------------------------

    vector_store, chunks = create_database(
        video_id
    )


    return (
        vector_store,
        f"New database created • {chunks} chunks",
        True
    )


# ============================================================
# CREATE RETRIEVER
# ============================================================

def create_retriever(vector_store):

    return vector_store.as_retriever(

        search_type="mmr",

        search_kwargs={
            "k": 4,
            "fetch_k": 15,
            "lambda_mult": 0.5
        }
    )


# ============================================================
# SESSION STATE
# ============================================================

if "messages" not in st.session_state:

    st.session_state.messages = []


if "retriever" not in st.session_state:

    st.session_state.retriever = None


if "video_id" not in st.session_state:

    st.session_state.video_id = None


if "video_url" not in st.session_state:

    st.session_state.video_url = None


if "database_status" not in st.session_state:

    st.session_state.database_status = None


# ============================================================
# HEADER
# ============================================================

st.markdown(
    '<div class="main-title">🎥 YouChat RAG</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="subtitle">'
    'Chat with any YouTube video using RAG, FAISS, Mistral Embeddings and Groq.'
    '</div>',
    unsafe_allow_html=True
)


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:

    st.header("🎥 YouTube Video")

    st.write(
        "Enter a YouTube URL to create or load its knowledge base."
    )


    url = st.text_input(
        "YouTube URL",
        placeholder="https://www.youtube.com/watch?v=..."
    )


    load_video = st.button(
        "🚀 Load Video",
        use_container_width=True
    )


    st.divider()


    # ========================================================
    # LOAD VIDEO
    # ========================================================

    if load_video:

        if not url.strip():

            st.warning(
                "Please enter a YouTube URL."
            )

        else:

            video_id = get_video_id(
                url.strip()
            )


            if not video_id:

                st.error(
                    "Invalid YouTube URL."
                )

            else:

                try:

                    # ----------------------------------------
                    # Video thumbnail
                    # ----------------------------------------

                    thumbnail = (
                        f"https://img.youtube.com/vi/"
                        f"{video_id}/0.jpg"
                    )


                    st.image(
                        thumbnail,
                        use_container_width=True
                    )


                    # ----------------------------------------
                    # Load/create database
                    # ----------------------------------------

                    with st.spinner(
                        "Loading video knowledge base..."
                    ):

                        vector_store, status, created = (
                            load_database(video_id)
                        )


                    # ----------------------------------------
                    # Create retriever
                    # ----------------------------------------

                    retriever = create_retriever(
                        vector_store
                    )


                    # ----------------------------------------
                    # Save in session
                    # ----------------------------------------

                    st.session_state.retriever = (
                        retriever
                    )

                    st.session_state.video_id = (
                        video_id
                    )

                    st.session_state.video_url = (
                        url.strip()
                    )

                    st.session_state.database_status = (
                        status
                    )

                    # Clear previous chat
                    st.session_state.messages = []


                    st.success(
                        "Video loaded successfully!"
                    )


                    st.info(
                        status
                    )


                except Exception as e:

                    st.error(
                        str(e)
                    )


    # ========================================================
    # CURRENT VIDEO
    # ========================================================

    if st.session_state.video_id:

        st.divider()

        st.subheader("Current Video")

        st.caption(
            f"Video ID: {st.session_state.video_id}"
        )


        if st.session_state.database_status:

            st.success(
                st.session_state.database_status
            )


    # ========================================================
    # CLEAR CHAT
    # ========================================================

    st.divider()


    if st.button(
        "🗑️ Clear Chat",
        use_container_width=True
    ):

        st.session_state.messages = []

        st.rerun()


    # ========================================================
    # ABOUT
    # ========================================================

    st.divider()

    st.subheader("⚙️ Stack")

    st.markdown(
        """
        **LLM:** Groq  
        
        **Embeddings:** Mistral AI  
        
        **Vector Store:** FAISS  
        
        **Retrieval:** MMR  
        
        **Framework:** LangChain
        """
    )


# ============================================================
# CHAT HISTORY
# ============================================================

for message in st.session_state.messages:

    with st.chat_message(
        message["role"]
    ):

        st.markdown(
            message["content"]
        )


# ============================================================
# CHAT INPUT
# ============================================================

question = st.chat_input(
    "Ask something about the video..."
)


if question:

    # ========================================================
    # CHECK VIDEO
    # ========================================================

    if st.session_state.retriever is None:

        st.warning(
            "⚠️ Please load a YouTube video first."
        )

        st.stop()


    # ========================================================
    # USER MESSAGE
    # ========================================================

    st.session_state.messages.append(
        {
            "role": "user",
            "content": question
        }
    )


    with st.chat_message("user"):

        st.markdown(
            question
        )


    # ========================================================
    # ASSISTANT
    # ========================================================

    with st.chat_message("assistant"):

        try:

            with st.spinner(
                "🔎 Searching transcript..."
            ):

                docs = st.session_state.retriever.invoke(
                    question
                )


            # ----------------------------------------------
            # Build context
            # ----------------------------------------------

            context = "\n\n".join(
                doc.page_content
                for doc in docs
            )


            # ----------------------------------------------
            # Prompt
            # ----------------------------------------------

            final_prompt = prompt.invoke(
                {
                    "context": context,
                    "question": question
                }
            )


            # ----------------------------------------------
            # Groq
            # ----------------------------------------------

            with st.spinner(
                "🤖 Generating answer..."
            ):

                response = llm.invoke(
                    final_prompt
                )


            answer = response.content


            # ----------------------------------------------
            # Display answer
            # ----------------------------------------------

            st.markdown(
                answer
            )


            # ----------------------------------------------
            # Save answer
            # ----------------------------------------------

            st.session_state.messages.append(
                {
                    "role": "assistant",
                    "content": answer
                }
            )


        except Exception as e:

            error_message = (
                f"❌ Something went wrong:\n\n{e}"
            )

            st.error(
                error_message
            )


# ============================================================
# FOOTER
# ============================================================

st.markdown(
    """
    <div class="footer">
        YouChat RAG • Mistral Embeddings • FAISS • Groq
    </div>
    """,
    unsafe_allow_html=True
)