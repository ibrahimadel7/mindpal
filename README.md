# 🧠 MindPal v2.0

**Your Personal AI Companion for Emotional Wellness**

MindPal is an intelligent chatbot that tracks your emotions and habits while providing personalized, empathetic conversations. Built with React and FastAPI, it uses advanced ML models to understand your emotional patterns and help you develop better habits.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Python](https://img.shields.io/badge/python-3.8+-green)
![React](https://img.shields.io/badge/react-19.2.4-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688)

---

## ✨ Features

### 🎭 Multi-Emotion Detection
- Detects 7 emotions: joy, sadness, anger, fear, disgust, surprise, neutral
- Multi-class classification with confidence scores
- Real-time emotion tracking during conversations

### 📊 Comprehensive Insights
- **Emotion Analytics**: Frequency analysis, 7-day trends, time-of-day patterns
- **Habit Tracking**: Automatic extraction of 8 habit categories
- **Correlation Analysis**: Discover links between your emotions and habits
- **Peak Period Detection**: Identify your happiest and most challenging times

### 🤖 Personalized AI Conversations
- Context-aware responses powered by Google Gemini API
- Adapts to your emotional patterns and history
- Encourages reflection without providing medical advice
- Graceful fallback when API unavailable

### 🎨 Modern UI
- Clean, responsive design
- React Icons for consistent visuals
- Real-time updates
- Comprehensive insights dashboard

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ibrahimadel7/mindpal.git
   cd mindpal
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   
   # Create .env file
   cp ../.env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Run the Application**
   
   **Terminal 1 - Backend:**
   ```bash
   cd backend
   python backend.py
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm start
   ```

5. **Access the App**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

---

## 📖 Documentation

- **[Quick Start Guide](QUICKSTART_v2.md)** - Get started in 5 minutes
- **[Upgrade Documentation](UPGRADE_v2_DOCUMENTATION.md)** - Complete technical reference
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Architecture overview
- **[Icon Migration Guide](EMOJI_TO_ICONS_MIGRATION.md)** - Design system reference

---

## 🏗️ Architecture

```
MindPal v2.0
│
├── Backend (FastAPI)
│   ├── EmotionService - ML-based emotion detection
│   ├── HabitService - Keyword-based habit extraction
│   ├── InsightsService - Analytics & trend analysis
│   └── ChatService - Personalized AI responses
│
├── Database (SQLite)
│   ├── conversations - Chat threads
│   ├── messages - User/assistant messages
│   ├── emotions - Multi-emotion records
│   ├── habits - Extracted habits
│   └── users - User profiles
│
└── Frontend (React)
    ├── ChatPage - Main conversation interface
    ├── InsightsView - Analytics dashboard
    ├── Sidebar - Conversation list
    └── MessageBubble - Message display with metadata
```

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Transformers** - HuggingFace ML models
- **Google Gemini** - Advanced AI conversations
- **SQLite** - Lightweight database
- **Uvicorn** - ASGI server

### Frontend
- **React 19** - UI framework
- **React Router v7** - Navigation
- **Axios** - HTTP client
- **React Icons** - Icon library
- **Recharts** - Data visualization

### ML Models
- **DistilRoBERTa** - Emotion classification (380MB)
- **BART** - Zero-shot habit classification (optional)

---

## 📊 API Endpoints

### Chat & Conversations
- `POST /chat` - Send message with full insights
- `GET /conversations` - List all conversations
- `POST /conversations` - Create new conversation
- `GET /conversations/{id}` - Get conversation details
- `DELETE /conversations/{id}` - Delete conversation

### Insights
- `GET /insights/emotions` - Emotion frequencies
- `GET /insights/habits` - Habit frequencies
- `GET /insights/time` - Time-of-day analysis
- `GET /insights/summary` - Combined insights

### System
- `GET /health` - Server health check
- `GET /docs` - Interactive API documentation

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Required
GEMINI_API_KEY=your_actual_api_key_here

# Optional (with defaults)
DB_PATH=mindpal.db
CONFIDENCE_THRESHOLD=0.3
HF_HOME=D:/huggingface_cache
HOST=0.0.0.0
PORT=8000
```

### Model Cache

To avoid C drive space issues, models are cached on D drive by default:
```python
HF_HOME=D:/huggingface_cache
```

---

## 🧪 Testing

### Backend Health Check
```bash
curl http://localhost:8000/health
```

### Test Chat API
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"content":"I went for a run and feel amazing!","conversation_id":1}'
```

### Frontend Build
```bash
cd frontend
npm run build
```

---

## 🚢 Deployment

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
# Serve the build/ directory with any static server
```

**Backend:**
```bash
cd backend
python backend.py
# Or use gunicorn/uvicorn for production
```

### Environment Setup

1. Set `GEMINI_API_KEY` in production environment
2. Configure CORS origins if deploying to different domain
3. Use proper database path for persistence
4. Consider Redis for session storage in production

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **HuggingFace** - Emotion detection models
- **Google Gemini** - AI conversation capabilities
- **FastAPI** - Excellent Python web framework
- **React Team** - Modern UI framework

---

## 📧 Contact

**Ibrahim Adel** - [@ibrahimadel7](https://github.com/ibrahimadel7)

Project Link: [https://github.com/ibrahimadel7/mindpal](https://github.com/ibrahimadel7/mindpal)

---

## 🗺️ Roadmap

### Phase 3 (Future)
- [ ] User authentication
- [ ] Export insights as PDF
- [ ] Habit goal tracking
- [ ] Weekly/monthly summary emails
- [ ] Mood predictions
- [ ] Mobile app
- [ ] Dark mode theme
- [ ] Real-time WebSocket updates
- [ ] Multi-language support

---

## 📈 Statistics

- **Lines of Code**: 1,478 (878 backend + 600 frontend)
- **Database Tables**: 5
- **API Endpoints**: 14
- **Services**: 4
- **Frontend Components**: 8+
- **ML Models**: 2 (1 required, 1 optional)

---

**Made with ❤️ by the MindPal Team**

*Your mental wellness matters. Chat with empathy, track with insight.*
