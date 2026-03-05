# MindPal v2.0 - Complete Upgrade Documentation

## Overview

MindPal has been upgraded from v1.0 to a comprehensive emotion and habit tracking system with personalized AI conversations and advanced insights. The new version includes:

- ✅ **Full Database Schema** with separate tables for conversations, messages, emotions, and habits
- ✅ **Emotion Detection Service** using Hugging Face transformer models
- ✅ **Habit Extraction Service** with lightweight keyword-based matching
- ✅ **Insights Service** with emotion/habit frequency tracking, time-of-day analysis, and correlations
- ✅ **Personalized Chat** that uses user history and insights for contextual responses
- ✅ **Complete Frontend Integration** with real-time insights dashboard
- ✅ **Optimized Performance** with models cached on D disk to avoid C drive space issues

---

## Backend Architecture (v2.0)

### Database Schema

#### `conversations` Table
```sql
id                 INTEGER PRIMARY KEY
user_id            INTEGER (default 1)
title              TEXT
created_at         TEXT ISO
updated_at         TEXT ISO
dominant_emotion   TEXT
```

#### `messages` Table
```sql
id                 INTEGER PRIMARY KEY
conversation_id    INTEGER (FK)
role               TEXT ('user' or 'assistant')
content            TEXT
created_at         TEXT ISO
```

#### `emotions` Table
```sql
id                 INTEGER PRIMARY KEY
message_id         INTEGER (FK)
emotion            TEXT (joy, sadness, anger, fear, disgust, surprise, neutral)
confidence         REAL (0.0-1.0)
timestamp          TEXT ISO
```

#### `habits` Table
```sql
id                 INTEGER PRIMARY KEY
message_id         INTEGER (FK)
habit              TEXT (normalized name)
confidence         REAL (0.0-1.0)
timestamp          TEXT ISO
```

#### `users` Table
```sql
id                 INTEGER PRIMARY KEY
username           TEXT UNIQUE
created_at         TEXT ISO
```

### Services

#### 1. Emotion Service (`EmotionService`)
- **detect_emotions(text)** → dict[emotion → confidence]
  - Uses: `j-hartmann/emotion-english-distilroberta-base`
  - Multiclass classification (all emotions with score > 0.3)
  - Supports 7 emotions: joy, sadness, anger, fear, disgust, surprise, neutral
  
- **get_dominant_emotion(emotions)** → str
  - Returns emotion with highest confidence
  
- **save_emotions(message_id, emotions, conn)**
  - Persists all detected emotions with timestamps

#### 2. Habit Service (`HabitService`)
- **extract_habits(text)** → dict[habit → confidence]
  - Lightweight keyword-based extraction (default)
  - Optional BART zero-shot classification (if enabled and available)
  - Normalizes habit labels for consistency
  - Predefined habit categories:
    - exercise, sleep, eating, work, social, meditation, reading, screen_time

- **save_habits(message_id, habits, conn)**
  - Persists all detected habits with timestamps

#### 3. Insights Service (`InsightsService`)
- **get_emotion_frequencies(user_id)** → dict
  - Emotion occurrence counts across all messages
  
- **get_habit_frequencies(user_id)** → dict
  - Habit occurrence counts across all messages
  
- **get_emotion_trend(days=7, user_id)** → list[dict]
  - Daily emotion distribution for past N days
  - Useful for charting emotional trends
  
- **get_time_of_day_analysis(user_id)** → dict
  - Breaks down emotions by: morning, afternoon, evening, night
  - Identifies saddest, happiest, most stressful periods
  
- **get_emotion_habit_correlations(user_id)** → list[dict]
  - Maps habits to associated emotions
  - Shows which emotions co-occur with each habit
  
- **get_dominant_emotion(user_id)** → str
  - Overall most frequent emotion

#### 4. Chat Service (`ChatService`)
- **generate_personalized_response(user_message, dominant_emotion, insights)** → str
  - Uses Gemini API with contextual awareness
  - Receives: user message, detected emotions, habit patterns, time-of-day insights
  - Fallback responses when Gemini unavailable
  - Encourages reflection without providing therapy/medical advice

---

## API Endpoints

### Chat
- **POST /chat**
  - Request: `{content: str, conversation_id: int?}`
  - Response:
    ```json
    {
      "assistant_message": "...",
      "detected_emotions": [{"emotion": "joy", "confidence": 0.95}, ...],
      "detected_habits": [{"habit": "exercise", "confidence": 0.9}, ...],
      "insights": {
        "emotion_frequencies": {...},
        "habit_frequencies": {...},
        "dominant_emotion": "joy",
        "time_of_day_analysis": {...}
      },
      "conversation_id": 1,
      "message_id": 42
    }
    ```

### Conversations
- **GET /conversations** → List all conversations with summaries
- **POST /conversations** → Create new empty conversation
- **GET /conversations/{id}** → Get specific conversation with all messages, emotions, habits
- **DELETE /conversations/{id}** → Delete conversation and all related data

### Insights
- **GET /insights/emotions** → Emotion frequency, trends, time-of-day analysis
- **GET /insights/habits** → Habit frequency and emotion correlations
- **GET /insights/time** → Time-of-day emotional analysis
- **GET /insights/summary** → Top emotions, top habits, dominants, overall stats

### Health & Status
- **GET /health** → Detailed system health check
- **GET /** → Root/docs endpoint

---

## Frontend Architecture (v2.0)

### Components

#### App.js (Root Container)
- Manages global conversation list state
- Handles conversation CRUD operations
- Routes between Chat and Insights pages
- Loads conversations from `/conversations` API

#### ChatPageRefactored.js
- Displays messages with emotions/habits metadata
- Handles new messages via `/chat` endpoint
- Shows welcome screen for empty conversations
- Auto-scrolls to latest message
- Displays typing indicator during response generation

#### InsightsViewv2.js
- Fetches data from all insights endpoints
- Displays:
  - Summary cards (dominant emotion, total check-ins, habits tracked)
  - Top emotions ranking
  - 7-day emotion trend chart
  - Time-of-day analysis (morning/afternoon/evening/night)
  - Peak emotional times (saddest, happiest, stressful)
  - Habit frequency cards
  - Emotion-habit correlation cards

#### Sidebar.js
- Navigation between Chat and Insights
- Conversation list with:
  - Title
  - Dominant emotion indicator
  - Last message preview
  - Delete button
- New Reflection button
- Brand header with MindPal icon

#### MessageBubble.js (Updated)
- Displays single message with styling
- Shows detected emotions as colored indicators
- Shows detected habits array
- Handles both user and assistant messages
- Backward compatible with old format

#### InsightCard.js
- Reusable card component for metrics
- Supports both emoji and React Icon components
- Shows title, value, subtitle, and icon

---

## Key Features

### 1. Multi-Emotion Detection
- Messages can have multiple emotions detected simultaneously
- Each emotion has a confidence score (0.0-1.0)
- Threshold filtering (min 0.3 confidence)
- All emotions stored in database for analytics

### 2. Habit-Emotion Correlations
- Tracks which habits appear with which emotions
- Identifies patterns: "You tend to feel happy after exercise"
- Time-aware: knows when each habit occurs
- Used in personalized chat responses

### 3. Time-of-Day Insights
- Identifies emotional peaks by time period
- Shows which emotions are strongest in:
  - Morning (5am-12pm)
  - Afternoon (12pm-5pm)
  - Evening (5pm-9pm)
  - Night (9pm-5am)
- Highlights saddest, happiest, most stressful periods

### 4. Personalized Chat
- AI responses consider:
  - User's dominant emotion pattern
  - Most frequent emotions
  - Common habits
  - Time-of-day emotional trends
- Encourages reflection with contextual questions
- Falls back to semantic responses if Gemini unavailable

### 5. Conversation Organization
- Each conversation is a separate thread
- Track conversation titles, timestamps, dominant emotions
- Full message history with metadata
- Easy navigation and deletion

---

## Configuration

### Model Caching (D Disk)
Models are cached on D drive to avoid C drive space issues:
```python
hf_cache_dir = "D:/huggingface_cache"
os.environ["HF_HOME"] = hf_cache_dir
```

### Emotion Confidence Threshold
```python
CONFIDENCE_THRESHOLD = 0.3  # Only emotions with score >= 0.3
```

### Gemini API
Set in `.env`:
```
GEMINI_API_KEY=your_api_key_here
```

If not configured, uses fallback responses.

---

## Performance Optimizations

### 1. Lightweight Habit Extraction
- Default: Keyword-based only (no BART model)
- No large model downloads required
- Instant habit detection
- User can enable BART if needed (requires space)

### 2. Database Indexing
- Foreign keys on conversation_id and message_id
- Proper cascading deletes to maintain integrity
- Row factory for efficient data mapping

### 3. Model Caching
- Emotion model cached after first load
- Subsequent requests use cached model
- D disk for large cache files

---

## Testing the Upgrade

### 1. Backend Startup
```bash
cd backend
python backend.py
# Should see:
# ✓ HuggingFace cache configured at: D:/huggingface_cache
# ✓ Emotion model loaded
# ✓ Database initialized
# ✓ Uvicorn running on http://0.0.0.0:8000
```

### 2. API Health Check
```bash
curl http://localhost:8000/health
# Response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "emotion_model": "loaded",
#   "habit_model": "keyword_only",
#   "cache_dir": "D:/huggingface_cache"
# }
```

### 3. Frontend Build
```bash
cd frontend
npm run build
# Should compile without errors
```

### 4. Run Full Stack
```bash
# Terminal 1: Backend
cd backend && python backend.py

# Terminal 2: Frontend
cd frontend && npm start
```

Visit: http://localhost:3000

---

## Migration Notes

### Breaking Changes
- Old `/history` endpoint is removed
- New `/conversations` endpoint required
- Message format now: `{id, role, content, emotions[], habits[]}`
- Old format: `{user_message, bot_message, dominant_emotion, emotion_scores}`

### Data Preservation
- Old database (`mindpal.db`) kept as `mindpal.db.bak`
- New database with v2.0 schema in `mindpal.db`
- No automatic data migration (recommend clean start)

### Backward Compatibility
- MessageBubble.js supports both old and new formats
- Graceful fallbacks for missing fields

---

## Future Enhancements

### Phase 3 (Coming Soon)
- [ ] User authentication system
- [ ] Export insights as PDF
- [ ] Habit goal tracking
- [ ] Weekly/monthly summaries
- [ ] Mood predictions based on habits
- [ ] Dark mode support
- [ ] Mobile app native version

### Performance Improvements
- [ ] Redis caching for insights
- [ ] Pagination for large conversations
- [ ] Batch emotion detection for fast uploads
- [ ] WebSocket for real-time insights updates

---

## Support & Troubleshooting

### Issue: C drive disk space
**Solution:** Models already configured to cache on D drive. If you get space errors, delete `~/.cache/huggingface` manually.

### Issue: Slow emotion detection
**Solution:** First run caches model. Subsequent requests are instant. If still slow, check available RAM.

### Issue: Habit extraction not working
**Solution:** Using lightweight keyword-based extraction by default. Check `HabitService.HABIT_KEYWORDS` to see supported habits.

### Issue: Gemini responses not personalized
**Solution:** Ensure `GEMINI_API_KEY` is set in `.env`. Without it, fallback responses are used.

---

## Code References

### Key Files
- **Backend:** `backend/backend.py` (878 lines, fully documented)
- **Frontend:** `frontend/src/App.js`, `ChatPageRefactored.js`, `InsightsViewv2.js`
- **Database:** SQLite3 with proper schema and foreign keys
- **Models:** Emotion (DistilRoBERTa), Habits (keyword matching)

### Integration Points
- Backend: REST API on port 8000
- Frontend: React on port 3000
- Database: SQLite at `backend/mindpal.db`

---

## Deployment Checklist

- [x] Database schema implemented
- [x] Services implemented (Emotion, Habit, Insights, Chat)
- [x] API endpoints implemented
- [x] Frontend components updated
- [x] Model caching configured (D disk)
- [x] Error handling and fallbacks
- [x] Backend tested and running
- [x] Frontend build verified
- [ ] Production deployment
- [ ] Environment variables configured
- [ ] Error logging configured
- [ ] Performance monitoring

---

**Version:** 2.0.0  
**Status:** Ready for deployment  
**Last Updated:** 2026-03-05
