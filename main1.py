from dotenv import load_dotenv
load_dotenv()

import os
from urllib.parse import urlparse, parse_qs

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import IpBlocked

from langchain_mistralai import (
    MistralAIEmbeddings
)

from langchain_groq import ChatGroq

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate


embeddings = MistralAIEmbeddings(
    model="mistral-embed"
)

llm = ChatGroq(model = "openai/gpt-oss-120b")

def get_video_id(url):

    parsed_url = urlparse(url)

    # Normal YouTube URL
    if "youtube.com" in parsed_url.netloc:

        video_id = parse_qs(parsed_url.query).get("v")

        if video_id:
            return video_id[0]

    # Short YouTube URL
    if "youtu.be" in parsed_url.netloc:

        video_id = parsed_url.path.strip("/")

        if video_id:
            return video_id

    return None


def create_database(video_id):

    print("        FETCHING TRANSCRIPT")

    try:

        transcript = YouTubeTranscriptApi().fetch(video_id)

    except IpBlocked:

        print("YouTube is blocking your current IP address.")
        print()
        print("Possible solutions:")
        print("1. Try using your mobile hotspot.")
        print("2. Update youtube-transcript-api:")
        print("   pip install -U youtube-transcript-api")
        print("3. Try again after some time.")
        print()

        return False

    except Exception as e:

        print("Could not fetch transcript.")
        print()
        print("Error:", e)
        print()

        return False


    text = " ".join(
        chunk.text
        for chunk in transcript
    )

    if not text.strip():

        print("Transcript is empty.")
        return False


    print("Transcript fetched successfully.")
    print()


    print("Splitting transcript into chunks...\n")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = splitter.split_text(text)

    print(f"Created {len(chunks)} chunks.")
    print()


    print("Creating embeddings...\n")

    vector_store = FAISS.from_texts(
        texts=chunks,
        embedding=embeddings
    )


    db_path = f"DATABASES/{video_id}"

    os.makedirs("DATABASES", exist_ok=True)

    vector_store.save_local(db_path)

    print("   DATABASE CREATED SUCCESSFULLY")

    return True


def load_database(video_id):

    db_path = f"DATABASES/{video_id}"


    if os.path.exists(db_path):

        print("          DATABASE FOUND")

        print("Loading database...\n")


    else:

        print("DATABASE NOT FOUND")


        print("Creating database...\n")

        success = create_database(video_id)

        if not success:

            return None


    try:

        vector_store = FAISS.load_local(
            db_path,
            embeddings,
            allow_dangerous_deserialization=True
        )

    except Exception as e:

        print("Failed to load FAISS database.")
        print()
        print("Error:", e)

        return None


    print("Database loaded successfully.\n")

    return vector_store


prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",

            """
You are an AI Assistant.

Answer ONLY using the provided YouTube transcript context.

If the answer is not available in the transcript, reply exactly:

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


print("YOUCHAT RAG")


url = input("Enter YouTube URL : ").strip()


video_id = get_video_id(url)


if not video_id:

    print("\nInvalid YouTube URL.")
    exit()


print("\nVideo ID:", video_id)


vector_store = load_database(video_id)


if vector_store is None:

    print("\nCould not create/load database.")
    print("Program terminated.")

    exit()

retriever = vector_store.as_retriever(

    search_type="mmr",

    search_kwargs={

        "k": 4,

        "fetch_k": 15,

        "lambda_mult": 0.5
    }
)


print("YOUCHAT IS READY")
print("\nAsk questions about the video.")
print("Type 0 to exit.\n")


while True:

    query = input("You : ").strip()

    if query == "0":

        print("\nGoodbye!")
        break


    if not query:

        print("Please enter a question.\n")
        continue


    try:

        docs = retriever.invoke(query)

    except Exception as e:

        print("\nRetrieval error:")
        print(e)
        print()

        continue

    context = "\n\n".join(
        doc.page_content
        for doc in docs
    )


    final_prompt = prompt.invoke(
        {
            "context": context,
            "question": query
        }
    )


    try:

        response = llm.invoke(final_prompt)

    except Exception as e:

        print("\nLLM error:")
        print(e)
        print()

        continue

    print("\nAI :", response.content)
    print()