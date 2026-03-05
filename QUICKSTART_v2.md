# MindPal v2.0 - Quick Start Guide

## What's New

MindPal v2.0 is a complete rewrite with:
- 🧠 Multi-emotion detection with confidence scores
- 🎯 Habit tracking and correlations
- 📊 Advanced insights dashboard
- 💬 Personalized AI conversations using your history
- ⏰ Time-of-day emotional analysis
- 📱 Full frontend integration

---

## Installation & Setup

### 1. Backend Setup

```bash
cd backend

# Ensure Python 3.8+ installed
python --version

# Install dependencies (if not already done)
pip install -r requirements.txt

# Start backend
python backend.py
```

Expected output:
```
✓ Emotion model loaded
✓ Database initialized
INFO: Uvicorn running on http://0.0.0.0:8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (already done)
npm install

# Option A: Production Build (recommended for testing)
npm run build
# Then serve with any static server

# Option B: Development Server (requires disk space)
npm start
# Runs on http://localhost:3000
```

### 3. Configuration

Create `.env` in backend directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

If not set, app uses fallback responses (still works perfectly).

---

## Testing the Full Stack

### 1. Start Backend
```bash
cd backend && python backend.py
```
Keep this running.

### 2. In another terminal, test API
```powershell
# Test 1: Health check
Invoke-WebRequest -Uri "http://localhost:8000/health" | Select-Object -ExpandProperty Content

# Test 2: Create a conversation
Invoke-WebRequest -Uri "http://localhost:8000/conversations" -Method POST | Select-Object -ExpandProperty Content

# Test 3: Send a message
$body = @{
    content = "I've been feeling great today, went for a run"
    conversation_id = 1
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/chat" -Method POST -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content
```

### 3. Start Frontend
```bash
cd frontend && npm start
```
Open http://localhost:3000

---

## Using the App

### Chat Page
1. **New Reflection:** Click "New Reflection" in sidebar to start a conversation
2. **Send Message:** Type your thoughts and press Enter or click Send
3. **Metadata:** Below each message, see detected emotions and habits
4. **History:** All previous messages appear in the conversation

### Insights Page
1. **Summary Cards:** See dominant emotion, total check-ins, habits tracked
2. **Top Emotions:** Ranked list of your most frequent emotions
3. **Emotion Trend:** 7-day chart of your emotional patterns
4. **Time Analysis:** Breakdown of emotions by time of day
5. **Peak Times:** When you're saddest, happiest, most stressful
6. **Habit Links:** Which emotions correlate with which habits

---

## Key Concepts

### Emotions Detected
- **joy** - Happy, content, satisfied
- **sadness** - Sad, down, low mood
- **anger** - Frustrated, irritated, angry
- **fear** - Anxious, worried, scared
- **disgust** - Upset, bothered, disgusted
- **surprise** - Shocked, taken aback, amazed
- **neutral** - Not strongly emotional

### Habits Tracked
- exercise, sleep, eating, work, social, meditation, reading, screen_time

### Confidence Scores
- 0.0 = Not confident
- 0.5 = Medium confidence
- 1.0 = Fully confident

Only emotions/habits with score ≥ 0.3 are shown.

---

## API Overview

All endpoints return JSON and require `Content-Type: application/json`

### /chat (POST)
Send a message and get personalized response with insights
```json
{
  "content": "I had a great workout today",
  "conversation_id": 1
}
```

### /conversations (GET)
List all your conversations
```json
{
  "conversations": [
    {
      "id": 1,
      "title": "My first reflection...",
      "dominant_emotion": "joy",
      "created_at": "2026-03-05T...",
      "preview": "I had a great workout..."
    }
  ]
}
```

### /conversations (POST)
Create new conversation
```json
{
  "id": 2,
  "title": "New Reflection",
  "created_at": "2026-03-05T..."
}
```

### /conversations/{id} (GET)
Get a specific conversation with all messages and metadata

### /insights/summary (GET)
Get overall insights summary
```json
{
  "dominant_emotion": "joy",
  "total_emotions_tracked": 42,
  "total_habits_tracked": 5,
  "top_emotions": [["joy", 15], ["contentment", 10]],
  "top_habits": [["exercise", 8], ["reading", 5]]
}
```

### /insights/emotions (GET)
Emotion frequencies and trends

### /insights/habits (GET)
Habit frequencies and emotion correlations

### /insights/time (GET)
Time-of-day emotional analysis

---

## Performance Tips

1. **First Run Takes Longer**
   - Emotion model is downloaded and cached
   - First `/chat` request may take 3-5 seconds
   - Subsequent requests are instant

2. **Database Size**
   - Each message stores emotions + habits
   - 100 messages ≈ 1 MB
   - Database grows slowly and is efficient

3. **Model Caching**
   - Models cached on D disk (not C) to save space
   - Safe to delete cache, will redownload if needed
   - Check `D:/huggingface_cache` if disk space concerns

---

## Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.8+

# Reinstall dependencies
pip install --upgrade transformers torch

# Check port 8000 isn't in use
netstat -ano | findstr :8000
```

### Frontend won't compile
```bash
# Clear cache and node_modules
rmdir /s node_modules
rmdir /s .cache
npm cache clean --force

# Reinstall
npm install
npm run build
```

### Models won't load
- Check D disk has 3GB+ free space
- Check network connection (downloads models)
- Models cache after first load, then instant

### Slow API response
- First request loads model (3-5s) ✓ Normal
- Check available RAM (8GB+ recommended)
- Database queries should be <100ms

---

## Architecture Quick Reference

```
MindPal v2.0
├── Backend (FastAPI)
│   ├── Emotion Service (Hugging Face)
│   ├── Habit Service (Keyword matching)
│   ├── Insights Service (Analytics)
│   ├── Chat Service (Gemini + fallbacks)
│   └── SQLite Database
│       ├── conversations
│       ├── messages
│       ├── emotions
│       ├── habits
│       └── users
│
└── Frontend (React)
    ├── App (Router)
    ├── ChatPageRefactored (Chat UI)
    ├── InsightsViewv2 (Dashboard)
    ├── Sidebar (Navigation)
    └── Components (MessageBubble, InsightCard, etc.)
```

---

## Next Steps

1. **Explore Insights:** Send several messages and check the dashboard
2. **Test Personalization:** Message with different emotions and see responses adapt
3. **Track Habits:** Mention activities (exercise, reading, sleep) to see correlations
4. **Customize:** Modify emotion labels, habits, or response tone in the code
5. **Deploy:** Follow deployment checklist in full documentation

---

## Support Resources

- **Full Documentation:** See `UPGRADE_v2_DOCUMENTATION.md`
- **API Docs:** http://localhost:8000/docs (when backend running)
- **Code Comments:** Backend has extensive inline documentation
- **Example Requests:** See testing section above

---

**Happy reflecting! 🧠**

Your emotional wellness journey starts here.
