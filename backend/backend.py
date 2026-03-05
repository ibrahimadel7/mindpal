"""
MindPal Backend v2.0
Full emotional and habit insights with personalized AI conversations
"""
import os
import json
import sqlite3
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
import google.generativeai as genai
from dotenv import load_dotenv

# ─── Configure HuggingFace Cache on D Disk ───────────────────────────────────
# This avoids disk space issues on C drive
hf_cache_dir = "D:/huggingface_cache"
Path(hf_cache_dir).mkdir(parents=True, exist_ok=True)
os.environ["HF_HOME"] = hf_cache_dir
print(f"HuggingFace cache configured at: {hf_cache_dir}")

# ─── Configuration ───────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
DB_PATH = "mindpal.db"
CONFIDENCE_THRESHOLD = 0.3

# ─── Gemini Setup ─────────────────────────────────────────────────────────────
gemini_model = None
if GEMINI_API_KEY and GEMINI_API_KEY not in {"YOUR_GEMINI_API_KEY_HERE", "YOUR_GEMINI_KEY_HERE", "your_gemini_api_key_here"}:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel("gemini-1.5-flash")
    except Exception as exc:
        print(f"Gemini initialization failed: {exc}")
else:
    print("GEMINI_API_KEY not configured. Using fallback responses.")

# ─── Load Models ──────────────────────────────────────────────────────────────
# ─── Load Models ──────────────────────────────────────────────────────────────
print("Loading emotion model...")
emotion_classifier = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    top_k=None,
    device=-1,
)
print("✓ Emotion model loaded")

# Habit extraction: Use lightweight keyword-based approach (no BART by default)
# BART can cause disk space issues; keyword matching is efficient and effective
zero_shot_classifier = None
print("Habit extraction: using lightweight keyword-based matching")

# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(title="MindPal API v2", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Database Context Manager ─────────────────────────────────────────────────
@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """Initialize database with proper schema."""
    with get_db() as conn:
        # Conversations table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id         INTEGER DEFAULT 1,
                title           TEXT NOT NULL,
                created_at      TEXT NOT NULL,
                updated_at      TEXT NOT NULL,
                dominant_emotion TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )

        # Messages table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role            TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content         TEXT NOT NULL,
                created_at      TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            )
            """
        )

        # Emotions table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS emotions (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id      INTEGER NOT NULL,
                emotion         TEXT NOT NULL,
                confidence      REAL NOT NULL,
                timestamp       TEXT NOT NULL,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            )
            """
        )

        # Habits table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS habits (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id      INTEGER NOT NULL,
                habit           TEXT NOT NULL,
                confidence      REAL NOT NULL,
                timestamp       TEXT NOT NULL,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            )
            """
        )

        # Users table (for future auth)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                username        TEXT UNIQUE,
                created_at      TEXT NOT NULL
            )
            """
        )

        # Ensure default user exists
        conn.execute(
            """
            INSERT OR IGNORE INTO users (id, username, created_at)
            VALUES (1, 'default', ?)
            """,
            (datetime.utcnow().isoformat(),),
        )

        conn.commit()
        print("✓ Database initialized")


init_db()

# ─── Request/Response Models ──────────────────────────────────────────────────
class MessageCreate(BaseModel):
    content: str
    conversation_id: Optional[int] = None


class ChatResponse(BaseModel):
    assistant_message: str
    detected_emotions: list[dict]  # [{"emotion": "...", "confidence": ...}]
    detected_habits: list[dict]    # [{"habit": "...", "confidence": ...}]
    insights: dict
    conversation_id: int
    message_id: int


class ConversationSummary(BaseModel):
    id: int
    title: str
    dominant_emotion: Optional[str]
    created_at: str
    updated_at: str
    preview: str


class InsightResponse(BaseModel):
    emotion_frequencies: dict
    habit_frequencies: dict
    emotion_trend: list[dict]
    dominant_emotion: str
    time_of_day_analysis: dict
    top_habits: list[dict]


# ─── EMOTION SERVICE ──────────────────────────────────────────────────────────
class EmotionService:
    @staticmethod
    def detect_emotions(text: str) -> dict:
        """
        Detect emotions from text using multiclass classification.
        Returns: {emotion_label: confidence, ...}
        """
        try:
            raw_results = emotion_classifier(text)

            if isinstance(raw_results, list) and raw_results:
                first = raw_results[0]
            else:
                first = raw_results

            emotions = {}
            if isinstance(first, list):
                for item in first:
                    if isinstance(item, dict) and "label" in item and "score" in item:
                        emotion = item["label"].lower()
                        confidence = round(float(item["score"]), 4)
                        if confidence >= CONFIDENCE_THRESHOLD:
                            emotions[emotion] = confidence
            elif isinstance(first, dict):
                if "label" in first and "score" in first:
                    emotion = first["label"].lower()
                    confidence = round(float(first["score"]), 4)
                    if confidence >= CONFIDENCE_THRESHOLD:
                        emotions[emotion] = confidence
                else:
                    for label, score in first.items():
                        if isinstance(score, (int, float)):
                            confidence = round(float(score), 4)
                            if confidence >= CONFIDENCE_THRESHOLD:
                                emotions[label] = confidence

            if not emotions:
                emotions = {"neutral": 1.0}

            return emotions
        except Exception as exc:
            print(f"Emotion detection error: {exc}")
            return {"neutral": 1.0}

    @staticmethod
    def get_dominant_emotion(emotions: dict) -> str:
        """Get the emotion with highest confidence."""
        if not emotions:
            return "neutral"
        return max(emotions, key=emotions.get)

    @staticmethod
    def save_emotions(message_id: int, emotions: dict, conn):
        """Save detected emotions to database."""
        now = datetime.utcnow().isoformat()
        for emotion, confidence in emotions.items():
            conn.execute(
                """
                INSERT INTO emotions (message_id, emotion, confidence, timestamp)
                VALUES (?, ?, ?, ?)
                """,
                (message_id, emotion, confidence, now),
            )


# ─── HABIT SERVICE ────────────────────────────────────────────────────────────
class HabitService:
    HABIT_KEYWORDS = {
        "exercise": ["workout", "run", "running", "gym", "jog", "jogging", "walk", "walking", "sport", "sports", "active", "fitness", "training", "train"],
        "sleep": ["sleep", "sleeping", "rest", "bed", "nap", "tired", "fatigue"],
        "eating": ["eat", "eating", "meal", "food", "breakfast", "lunch", "dinner", "snack"],
        "work": ["work", "working", "office", "job", "career", "project", "deadline", "meeting"],
        "social": ["friend", "friends", "party", "social", "hangout", "talk", "chat", "meet", "visit"],
        "meditation": ["meditate", "meditation", "mindful", "mindfulness", "yoga", "breathe"],
        "reading": ["read", "reading", "book", "article"],
        "screen_time": ["phone", "watch", "screen", "scroll", "social media", "instagram", "tiktok"],
    }

    @staticmethod
    def extract_habits(text: str) -> dict:
        """
        Extract habits from text using keyword matching and optional zero-shot classification.
        Returns: {habit_label: confidence, ...}
        """
        text_lower = text.lower()
        detected = {}

        # Keyword-based extraction (always available)
        for habit, keywords in HabitService.HABIT_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text_lower:
                    detected[habit] = 0.9  # High confidence for keywords
                    break

        # Zero-shot classification for habits (if model available)
        if zero_shot_classifier is not None:
            habit_labels = list(HabitService.HABIT_KEYWORDS.keys())
            try:
                result = zero_shot_classifier(text, habit_labels, multi_class=True)
                for label, score in zip(result["labels"], result["scores"]):
                    confidence = round(float(score), 4)
                    if confidence >= CONFIDENCE_THRESHOLD:
                        # Keep the highest confidence score for each habit
                        detected[label] = max(detected.get(label, 0), confidence)
            except Exception as exc:
                print(f"Zero-shot classification error (continuing with keyword results): {exc}")

        return detected

    @staticmethod
    def normalize_habit(habit: str) -> str:
        """Normalize habit labels."""
        return habit.lower().replace("_", " ")

    @staticmethod
    def save_habits(message_id: int, habits: dict, conn):
        """Save detected habits to database."""
        now = datetime.utcnow().isoformat()
        for habit, confidence in habits.items():
            conn.execute(
                """
                INSERT INTO habits (message_id, habit, confidence, timestamp)
                VALUES (?, ?, ?, ?)
                """,
                (message_id, HabitService.normalize_habit(habit), confidence, now),
            )


# ─── INSIGHTS SERVICE ────────────────────────────────────────────────────────────
class InsightsService:
    @staticmethod
    def get_emotion_frequencies(user_id: int = 1) -> dict:
        """Get frequency of each emotion across user's messages."""
        with get_db() as conn:
            rows = conn.execute(
                """
                SELECT emotion, COUNT(*) as count
                FROM emotions
                WHERE message_id IN (
                    SELECT m.id FROM messages m
                    JOIN conversations c ON m.conversation_id = c.id
                    WHERE c.user_id = ?
                )
                GROUP BY emotion
                ORDER BY count DESC
                """,
                (user_id,),
            ).fetchall()
            return {row["emotion"]: row["count"] for row in rows}

    @staticmethod
    def get_habit_frequencies(user_id: int = 1) -> dict:
        """Get frequency of each habit across user's messages."""
        with get_db() as conn:
            rows = conn.execute(
                """
                SELECT habit, COUNT(*) as count
                FROM habits
                WHERE message_id IN (
                    SELECT m.id FROM messages m
                    JOIN conversations c ON m.conversation_id = c.id
                    WHERE c.user_id = ?
                )
                GROUP BY habit
                ORDER BY count DESC
                """,
                (user_id,),
            ).fetchall()
            return {row["habit"]: row["count"] for row in rows}

    @staticmethod
    def get_emotion_trend(days: int = 7, user_id: int = 1) -> list[dict]:
        """Get daily emotion distribution for the last N days."""
        with get_db() as conn:
            rows = conn.execute(
                """
                SELECT 
                    DATE(e.timestamp) as day,
                    e.emotion,
                    COUNT(*) as count
                FROM emotions e
                WHERE message_id IN (
                    SELECT m.id FROM messages m
                    JOIN conversations c ON m.conversation_id = c.id
                    WHERE c.user_id = ? AND m.created_at >= datetime('now', '-' || ? || ' days')
                )
                GROUP BY day, emotion
                ORDER BY day ASC
                """,
                (user_id, days),
            ).fetchall()

            trend = {}
            for row in rows:
                day = row["day"]
                if day not in trend:
                    trend[day] = {}
                trend[day][row["emotion"]] = row["count"]

            return [{"day": day, **emotions} for day, emotions in sorted(trend.items())]

    @staticmethod
    def get_time_of_day_analysis(user_id: int = 1) -> dict:
        """Analyze emotions by time of day (morning, afternoon, evening, night)."""
        with get_db() as conn:
            rows = conn.execute(
                """
                SELECT 
                    CASE 
                        WHEN CAST(strftime('%H', e.timestamp) AS INTEGER) >= 5 AND CAST(strftime('%H', e.timestamp) AS INTEGER) < 12 THEN 'morning'
                        WHEN CAST(strftime('%H', e.timestamp) AS INTEGER) >= 12 AND CAST(strftime('%H', e.timestamp) AS INTEGER) < 17 THEN 'afternoon'
                        WHEN CAST(strftime('%H', e.timestamp) AS INTEGER) >= 17 AND CAST(strftime('%H', e.timestamp) AS INTEGER) < 21 THEN 'evening'
                        ELSE 'night'
                    END as period,
                    e.emotion,
                    COUNT(*) as count,
                    AVG(e.confidence) as avg_confidence
                FROM emotions e
                WHERE message_id IN (
                    SELECT m.id FROM messages m
                    JOIN conversations c ON m.conversation_id = c.id
                    WHERE c.user_id = ?
                )
                GROUP BY period, emotion
                ORDER BY period ASC
                """,
                (user_id,),
            ).fetchall()

            analysis = {}
            for row in rows:
                period = row["period"]
                if period not in analysis:
                    analysis[period] = {}
                analysis[period][row["emotion"]] = {
                    "count": row["count"],
                    "avg_confidence": round(row["avg_confidence"], 4),
                }

            # Find saddest, happiest, most stressful hour
            emotion_to_period = {}
            for row in rows:
                period = row["period"]
                emotion = row["emotion"]
                if emotion not in emotion_to_period:
                    emotion_to_period[emotion] = {}
                emotion_to_period[emotion][period] = row["count"]

            saddest = max(emotion_to_period.get("sadness", {}).items(), default=("unknown", 0), key=lambda x: x[1])[0] if emotion_to_period.get("sadness") else "unknown"
            happiest = max(emotion_to_period.get("joy", {}).items(), default=("unknown", 0), key=lambda x: x[1])[0] if emotion_to_period.get("joy") else "unknown"
            stressful = max(emotion_to_period.get("anger", {}).items(), default=("unknown", 0), key=lambda x: x[1])[0] if emotion_to_period.get("anger") else "unknown"

            return {
                "by_period": analysis,
                "saddest_period": saddest,
                "happiest_period": happiest,
                "most_stressful_period": stressful,
            }

    @staticmethod
    def get_dominant_emotion(user_id: int = 1) -> str:
        """Get the most frequent emotion."""
        frequencies = InsightsService.get_emotion_frequencies(user_id)
        return max(frequencies, key=frequencies.get) if frequencies else "unknown"

    @staticmethod
    def get_emotion_habit_correlations(user_id: int = 1) -> list[dict]:
        """Get emotions associated with each habit."""
        with get_db() as conn:
            rows = conn.execute(
                """
                SELECT 
                    h.habit,
                    e.emotion,
                    COUNT(*) as co_occurrence
                FROM habits h
                JOIN messages m ON h.message_id = m.id
                JOIN conversations c ON m.conversation_id = c.id
                JOIN emotions e ON e.message_id = m.id
                WHERE c.user_id = ?
                GROUP BY h.habit, e.emotion
                ORDER BY co_occurrence DESC
                """,
                (user_id,),
            ).fetchall()

            correlations = {}
            for row in rows:
                habit = row["habit"]
                if habit not in correlations:
                    correlations[habit] = []
                correlations[habit].append({
                    "emotion": row["emotion"],
                    "co_occurrences": row["co_occurrence"],
                })

            return [{"habit": habit, "emotions": emotions} for habit, emotions in correlations.items()]


# ─── CHAT SERVICE ────────────────────────────────────────────────────────────────
class ChatService:
    @staticmethod
    def generate_personalized_response(user_message: str, dominant_emotion: str, insights: dict) -> str:
        """Generate personalized response using Gemini with context."""
        if gemini_model is None:
            return ChatService._fallback_response(dominant_emotion)

        emotion_freq = insights.get("emotion_frequencies", {})
        habit_freq = insights.get("habit_frequencies", {})
        time_analysis = insights.get("time_of_day_analysis", {})

        # Build context string
        context = f"""
User Context:
- Dominant emotion pattern: {insights.get('dominant_emotion', 'unknown')}
- Most frequent emotions: {', '.join(list(emotion_freq.keys())[:3])}
- Common habits: {', '.join(list(habit_freq.keys())[:3])}
- Saddest period: {time_analysis.get('saddest_period', 'unknown')}
"""

        prompt = f"""You are MindPal, a warm and supportive mental wellness companion focused on emotional reflection.

{context}

Guidelines:
- Respond in 1-3 short, empathetic sentences
- Acknowledge the user's feeling gently, especially relative to their patterns
- Ask one reflective question to help them explore deeper
- Use their context to personalize the response
- Keep tone calm, curious, non-judgmental
- Never diagnose, advise, or fix
- Do not start sentences with "I"

User's detected emotion: {dominant_emotion}
User message: "{user_message}"

Respond as MindPal:"""

        try:
            response = gemini_model.generate_content(prompt)
            return response.text.strip()
        except Exception as exc:
            print(f"Gemini error: {exc}")
            return ChatService._fallback_response(dominant_emotion)

    @staticmethod
    def _fallback_response(emotion: str) -> str:
        """Fallback responses when Gemini unavailable."""
        responses = {
            "joy": "It sounds like something wonderful is happening! What's bringing you this joy?",
            "sadness": "It sounds like things feel heavy right now. What's weighing on you most?",
            "anger": "It sounds like something really got to you. What triggered that feeling?",
            "fear": "It sounds like something feels uncertain. What's been on your mind?",
            "disgust": "Something seems to have unsettled you. Can you tell me more?",
            "surprise": "Something unexpected happened. How are you feeling about it?",
            "neutral": "Thank you for sharing. How are you feeling right now?",
        }
        return responses.get(emotion.lower(), "Thank you for sharing that with me. How are you feeling?")


# ─── API ROUTES ───────────────────────────────────────────────────────────────

# ─── Chat Endpoint ─────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(request: MessageCreate, background_tasks: BackgroundTasks):
    """Send a message and get personalized AI response with insights."""
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    with get_db() as conn:
        user_id = 1  # Default user for now

        # Get or create conversation
        if request.conversation_id:
            conv_row = conn.execute(
                "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
                (request.conversation_id, user_id),
            ).fetchone()
            if not conv_row:
                raise HTTPException(status_code=404, detail="Conversation not found")
            conversation_id = request.conversation_id
        else:
            # Create new conversation
            title = request.content[:50] + ("..." if len(request.content) > 50 else "")
            now = datetime.utcnow().isoformat()
            cursor = conn.execute(
                """
                INSERT INTO conversations (user_id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, title, now, now),
            )
            conversation_id = cursor.lastrowid
            conn.commit()

        # 1. Detect emotions
        emotions = EmotionService.detect_emotions(request.content)
        dominant_emotion = EmotionService.get_dominant_emotion(emotions)

        # 2. Extract habits
        habits = HabitService.extract_habits(request.content)

        # 3. Get user insights
        insights = {
            "emotion_frequencies": InsightsService.get_emotion_frequencies(user_id),
            "habit_frequencies": InsightsService.get_habit_frequencies(user_id),
            "dominant_emotion": InsightsService.get_dominant_emotion(user_id),
            "time_of_day_analysis": InsightsService.get_time_of_day_analysis(user_id),
        }

        # 4. Generate personalized response
        assistant_message = ChatService.generate_personalized_response(
            request.content, dominant_emotion, insights
        )

        # 5. Save messages
        now = datetime.utcnow().isoformat()

        # Save user message
        user_msg_cursor = conn.execute(
            """
            INSERT INTO messages (conversation_id, role, content, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (conversation_id, "user", request.content, now),
        )
        user_message_id = user_msg_cursor.lastrowid

        # Save emotions and habits for user message
        EmotionService.save_emotions(user_message_id, emotions, conn)
        HabitService.save_habits(user_message_id, habits, conn)

        # Save assistant message
        asst_msg_cursor = conn.execute(
            """
            INSERT INTO messages (conversation_id, role, content, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (conversation_id, "assistant", assistant_message, now),
        )
        message_id = asst_msg_cursor.lastrowid

        # Update conversation
        conn.execute(
            "UPDATE conversations SET dominant_emotion = ?, updated_at = ? WHERE id = ?",
            (dominant_emotion, now, conversation_id),
        )

        conn.commit()

        return ChatResponse(
            assistant_message=assistant_message,
            detected_emotions=[
                {"emotion": emotion, "confidence": confidence}
                for emotion, confidence in emotions.items()
            ],
            detected_habits=[
                {"habit": habit, "confidence": confidence}
                for habit, confidence in habits.items()
            ],
            insights=insights,
            conversation_id=conversation_id,
            message_id=user_message_id,
        )


# ─── Conversations Endpoints ───────────────────────────────────────────────────
@app.get("/conversations")
async def list_conversations(user_id: int = 1):
    """List all conversations for a user."""
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT 
                c.id,
                c.title,
                c.dominant_emotion,
                c.created_at,
                c.updated_at,
                (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'user' ORDER BY created_at DESC LIMIT 1) as last_user_message
            FROM conversations c
            WHERE c.user_id = ?
            ORDER BY c.updated_at DESC
            """,
            (user_id,),
        ).fetchall()

        conversations = []
        for row in rows:
            preview = row["last_user_message"]
            if preview:
                preview = preview[:50] + ("..." if len(preview) > 50 else "")
            conversations.append(
                ConversationSummary(
                    id=row["id"],
                    title=row["title"],
                    dominant_emotion=row["dominant_emotion"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                    preview=preview or "No messages",
                )
            )

        return {"conversations": conversations}


@app.post("/conversations")
async def create_conversation(user_id: int = 1):
    """Create a new empty conversation."""
    with get_db() as conn:
        now = datetime.utcnow().isoformat()
        cursor = conn.execute(
            """
            INSERT INTO conversations (user_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, "New Reflection", now, now),
        )
        conn.commit()
        conversation_id = cursor.lastrowid

        return {"id": conversation_id, "title": "New Reflection", "created_at": now}


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int, user_id: int = 1):
    """Delete a conversation and all its messages."""
    with get_db() as conn:
        # Verify ownership and delete
        cursor = conn.execute(
            "DELETE FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user_id),
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Conversation not found")

        return {"id": conversation_id, "deleted": True}


@app.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: int, user_id: int = 1):
    """Get a specific conversation with all messages."""
    with get_db() as conn:
        conv = conn.execute(
            "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user_id),
        ).fetchone()

        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        messages = conn.execute(
            """
            SELECT 
                m.id,
                m.role,
                m.content,
                m.created_at
            FROM messages m
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
            """,
            (conversation_id,),
        ).fetchall()

        message_list = []
        for msg in messages:
            # Get emotions for this message
            emotions = conn.execute(
                "SELECT emotion, confidence FROM emotions WHERE message_id = ?",
                (msg["id"],),
            ).fetchall()

            # Get habits for this message
            habits = conn.execute(
                "SELECT habit, confidence FROM habits WHERE message_id = ?",
                (msg["id"],),
            ).fetchall()

            message_list.append({
                "id": msg["id"],
                "role": msg["role"],
                "content": msg["content"],
                "created_at": msg["created_at"],
                "emotions": [dict(e) for e in emotions],
                "habits": [dict(h) for h in habits],
            })

        return {
            "id": conv["id"],
            "title": conv["title"],
            "dominant_emotion": conv["dominant_emotion"],
            "created_at": conv["created_at"],
            "updated_at": conv["updated_at"],
            "messages": message_list,
        }


# ─── Insights Endpoints ────────────────────────────────────────────────────────
@app.get("/insights/emotions")
async def get_emotion_insights(user_id: int = 1):
    """Get emotion frequency and trend data."""
    return InsightResponse(
        emotion_frequencies=InsightsService.get_emotion_frequencies(user_id),
        habit_frequencies=InsightsService.get_habit_frequencies(user_id),
        emotion_trend=InsightsService.get_emotion_trend(days=7, user_id=user_id),
        dominant_emotion=InsightsService.get_dominant_emotion(user_id),
        time_of_day_analysis=InsightsService.get_time_of_day_analysis(user_id),
        top_habits=[
            {"habit": h, "count": c}
            for h, c in sorted(
                InsightsService.get_habit_frequencies(user_id).items(),
                key=lambda x: x[1],
                reverse=True,
            )[:5]
        ],
    )


@app.get("/insights/habits")
async def get_habit_insights(user_id: int = 1):
    """Get habit frequency and emotion correlations."""
    return {
        "habit_frequencies": InsightsService.get_habit_frequencies(user_id),
        "correlations": InsightsService.get_emotion_habit_correlations(user_id),
    }


@app.get("/insights/time")
async def get_time_insights(user_id: int = 1):
    """Get time-of-day analysis."""
    return InsightsService.get_time_of_day_analysis(user_id)


@app.get("/insights/summary")
async def get_insights_summary(user_id: int = 1):
    """Get overall insights summary."""
    emotions = InsightsService.get_emotion_frequencies(user_id)
    habits = InsightsService.get_habit_frequencies(user_id)
    
    return {
        "dominant_emotion": InsightsService.get_dominant_emotion(user_id),
        "total_emotions_tracked": len(emotions),
        "total_habits_tracked": len(habits),
        "top_emotions": sorted(emotions.items(), key=lambda x: x[1], reverse=True)[:3],
        "top_habits": sorted(habits.items(), key=lambda x: x[1], reverse=True)[:3],
        "time_of_day": InsightsService.get_time_of_day_analysis(user_id),
    }


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "MindPal API v2.0 is running",
        "status": "healthy",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": "connected",
        "gemini_model": "configured" if gemini_model else "not_configured",
        "emotion_model": "loaded",
        "habit_model": "bart_loaded" if zero_shot_classifier else "keyword_only",
        "cache_dir": hf_cache_dir,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
