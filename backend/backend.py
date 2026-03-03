import os
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
import google.generativeai as genai
from dotenv import load_dotenv

# ─── Configuration ───────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
DB_PATH = "mindpal.db"

# ─── Gemini Setup ─────────────────────────────────────────────────────────────
gemini_model = None
if GEMINI_API_KEY and GEMINI_API_KEY not in {
    "YOUR_GEMINI_API_KEY_HERE",
    "YOUR_GEMINI_KEY_HERE",
    "your_gemini_api_key_here",
}:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel("gemini-1.5-flash")
    except Exception as exc:
        print(f"Gemini initialization failed. Falling back to local responses. Error: {exc}")
else:
    print("GEMINI_API_KEY is missing or placeholder. Falling back to local responses.")

# ─── Emotion Model ────────────────────────────────────────────────────────────
print("Loading emotion model... (first run may take a moment)")
emotion_classifier = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    top_k=None,
    device=-1,   # CPU
)
print("Emotion model loaded.")

# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(title="MindPal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Database ─────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS conversations (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT    NOT NULL DEFAULT 'legacy',
            user_message    TEXT    NOT NULL,
            bot_message     TEXT    NOT NULL,
            dominant_emotion TEXT   NOT NULL,
            emotion_scores  TEXT    NOT NULL,
            timestamp       TEXT    NOT NULL
        )
        """
    )

    columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(conversations)").fetchall()
    }
    if "conversation_id" not in columns:
        conn.execute(
            "ALTER TABLE conversations ADD COLUMN conversation_id TEXT NOT NULL DEFAULT 'legacy'"
        )

    conn.commit()
    conn.close()


init_db()

# ─── Request/Response Models ──────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    emotion_scores: dict
    dominant_emotion: str
    bot_message: str


# ─── Helpers ──────────────────────────────────────────────────────────────────
def detect_emotions(text: str) -> tuple[dict, str]:
    """Run Hugging Face emotion classifier and return scores + dominant emotion."""
    raw_results = emotion_classifier(text)

    if isinstance(raw_results, list) and raw_results:
        first = raw_results[0]
    else:
        first = raw_results

    if isinstance(first, list):
        scores = {
            item["label"]: round(float(item["score"]), 4)
            for item in first
            if isinstance(item, dict) and "label" in item and "score" in item
        }
    elif isinstance(first, dict) and "label" in first and "score" in first:
        scores = {first["label"]: round(float(first["score"]), 4)}
    elif isinstance(first, dict):
        scores = {
            str(label): round(float(score), 4)
            for label, score in first.items()
            if isinstance(score, (int, float))
        }
    else:
        raise ValueError("Unexpected emotion model output format.")

    if not scores:
        raise ValueError("Emotion model returned empty scores.")

    dominant = max(scores, key=scores.get)
    return scores, dominant


GEMINI_SYSTEM_PROMPT = """You are MindPal, a warm and supportive mental wellness companion. 
Your role is to help users reflect on their emotions — not to diagnose, advise, or fix anything.

Guidelines:
- Respond in 1–3 short, empathetic sentences.
- Acknowledge the user's feeling gently, using the detected dominant emotion as context.
- Ask one open, reflective question to help them explore their feelings (e.g., triggers, intensity, patterns).
- Keep tone calm, curious, and non-judgmental.
- Never provide therapy, medical advice, or solutions.
- Do not start sentences with "I" as the first word.
"""


FALLBACK_RESPONSES = {
    "joy": "It sounds like something good is happening for you! What's been bringing that lightness today?",
    "sadness": "It sounds like things feel heavy right now — that's okay. What do you think has been weighing on you most?",
    "anger": "It sounds like something really got to you. What do you think triggered that feeling?",
    "fear": "It sounds like something feels uncertain or scary. What's been on your mind?",
    "disgust": "Something seems to have unsettled you. Can you tell me more about what happened?",
    "surprise": "Something unexpected happened, it seems. How are you sitting with that?",
    "neutral": "Thank you for sharing. How have you been feeling overall today?",
}


def generate_bot_response(user_message: str, dominant_emotion: str) -> str:
    """Generate a reflective response using Gemini."""
    if gemini_model is None:
        return FALLBACK_RESPONSES.get(
            dominant_emotion.lower(),
            "Thank you for sharing that with me. How are you feeling right now, in this moment?",
        )

    prompt = (
        f"{GEMINI_SYSTEM_PROMPT}\n\n"
        f"The user's dominant detected emotion is: {dominant_emotion}.\n"
        f"User message: \"{user_message}\"\n\n"
        f"Respond as MindPal:"
    )
    try:
        response = gemini_model.generate_content(prompt)
        return response.text.strip()
    except Exception as exc:
        print(f"Gemini generate_content failed. Using fallback response. Error: {exc}")
        return FALLBACK_RESPONSES.get(
            dominant_emotion.lower(),
            "Thank you for sharing that with me. How are you feeling right now, in this moment?",
        )


def save_conversation(
    conversation_id: str,
    user_message: str,
    bot_message: str,
    dominant_emotion: str,
    emotion_scores: dict,
):
    conn = get_db()
    conn.execute(
        """
        INSERT INTO conversations (conversation_id, user_message, bot_message, dominant_emotion, emotion_scores, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            conversation_id,
            user_message,
            bot_message,
            dominant_emotion,
            json.dumps(emotion_scores),
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    conn.close()


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    conversation_id = (request.conversation_id or "legacy").strip() or "legacy"

    # 1. Detect emotions
    emotion_scores, dominant_emotion = detect_emotions(request.message)

    # 2. Generate reflective response
    bot_message = generate_bot_response(request.message, dominant_emotion)

    # 3. Persist to SQLite
    save_conversation(
        conversation_id,
        request.message,
        bot_message,
        dominant_emotion,
        emotion_scores,
    )

    return ChatResponse(
        emotion_scores=emotion_scores,
        dominant_emotion=dominant_emotion,
        bot_message=bot_message,
    )


@app.get("/history")
async def get_history():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM conversations ORDER BY timestamp ASC"
    ).fetchall()
    conn.close()

    history = []
    for row in rows:
        history.append(
            {
                "id": row["id"],
                "conversation_id": row["conversation_id"],
                "user_message": row["user_message"],
                "bot_message": row["bot_message"],
                "dominant_emotion": row["dominant_emotion"],
                "emotion_scores": json.loads(row["emotion_scores"]),
                "timestamp": row["timestamp"],
            }
        )
    return {"history": history}


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    conversation_id = (conversation_id or "").strip()
    if not conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id is required.")

    conn = get_db()
    cursor = conn.execute(
        "DELETE FROM conversations WHERE conversation_id = ?",
        (conversation_id,),
    )
    conn.commit()
    deleted = cursor.rowcount
    conn.close()

    if deleted == 0:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    return {"conversation_id": conversation_id, "deleted": deleted}


@app.get("/")
async def root():
    return {"message": "MindPal API is running. Visit /docs for API reference."}
