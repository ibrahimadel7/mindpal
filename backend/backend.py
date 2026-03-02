import os
import json
import sqlite3
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
import google.generativeai as genai

# ─── Configuration ───────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")
DB_PATH = "mindpal.db"

# ─── Gemini Setup ─────────────────────────────────────────────────────────────
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-1.5-flash")

# ─── Emotion Model ────────────────────────────────────────────────────────────
print("Loading emotion model... (first run may take a moment)")
emotion_classifier = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    return_all_scores=True,
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
            user_message    TEXT    NOT NULL,
            bot_message     TEXT    NOT NULL,
            dominant_emotion TEXT   NOT NULL,
            emotion_scores  TEXT    NOT NULL,
            timestamp       TEXT    NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


init_db()

# ─── Request/Response Models ──────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    emotion_scores: dict
    dominant_emotion: str
    bot_message: str


# ─── Helpers ──────────────────────────────────────────────────────────────────
def detect_emotions(text: str) -> tuple[dict, str]:
    """Run Hugging Face emotion classifier and return scores + dominant emotion."""
    results = emotion_classifier(text)[0]
    scores = {item["label"]: round(item["score"], 4) for item in results}
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


def generate_bot_response(user_message: str, dominant_emotion: str) -> str:
    """Generate a reflective response using Gemini."""
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
        # Graceful fallback if Gemini is unavailable
        fallback_responses = {
            "joy": "It sounds like something good is happening for you! What's been bringing that lightness today?",
            "sadness": "It sounds like things feel heavy right now — that's okay. What do you think has been weighing on you most?",
            "anger": "It sounds like something really got to you. What do you think triggered that feeling?",
            "fear": "It sounds like something feels uncertain or scary. What's been on your mind?",
            "disgust": "Something seems to have unsettled you. Can you tell me more about what happened?",
            "surprise": "Something unexpected happened, it seems. How are you sitting with that?",
            "neutral": "Thank you for sharing. How have you been feeling overall today?",
        }
        return fallback_responses.get(
            dominant_emotion.lower(),
            "Thank you for sharing that with me. How are you feeling right now, in this moment?",
        )


def save_conversation(user_message: str, bot_message: str, dominant_emotion: str, emotion_scores: dict):
    conn = get_db()
    conn.execute(
        """
        INSERT INTO conversations (user_message, bot_message, dominant_emotion, emotion_scores, timestamp)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
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

    # 1. Detect emotions
    emotion_scores, dominant_emotion = detect_emotions(request.message)

    # 2. Generate reflective response
    bot_message = generate_bot_response(request.message, dominant_emotion)

    # 3. Persist to SQLite
    save_conversation(request.message, bot_message, dominant_emotion, emotion_scores)

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
                "user_message": row["user_message"],
                "bot_message": row["bot_message"],
                "dominant_emotion": row["dominant_emotion"],
                "emotion_scores": json.loads(row["emotion_scores"]),
                "timestamp": row["timestamp"],
            }
        )
    return {"history": history}


@app.get("/")
async def root():
    return {"message": "MindPal API is running. Visit /docs for API reference."}
