import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ChatPage.css';

const API_BASE = 'http://localhost:8000';

const EMOTION_CONFIG = {
    joy: { emoji: '😊', color: '#fbbf24', label: 'Joy' },
    sadness: { emoji: '😢', color: '#60a5fa', label: 'Sadness' },
    anger: { emoji: '😠', color: '#f87171', label: 'Anger' },
    fear: { emoji: '😨', color: '#a78bfa', label: 'Fear' },
    disgust: { emoji: '🤢', color: '#34d399', label: 'Disgust' },
    surprise: { emoji: '😲', color: '#f472b6', label: 'Surprise' },
    neutral: { emoji: '😐', color: '#94a3b8', label: 'Neutral' },
};

function getEmotionStyle(emotion) {
    const key = emotion?.toLowerCase();
    return EMOTION_CONFIG[key] || { emoji: '💭', color: '#94a3b8', label: emotion || 'Unknown' };
}

function TypingIndicator() {
    return (
        <div className="message bot-message typing-message">
            <div className="avatar bot-avatar">🧠</div>
            <div className="bubble bot-bubble typing-bubble">
                <span></span><span></span><span></span>
            </div>
        </div>
    );
}

function ChatMessage({ item, isUser }) {
    const emotion = isUser ? getEmotionStyle(item.dominant_emotion) : null;

    if (isUser) {
        return (
            <div className="message user-message">
                <div className="message-content user-content">
                    <div className="bubble user-bubble">{item.user_message}</div>
                    {item.dominant_emotion && (
                        <div className="emotion-tag" style={{ '--emotion-color': emotion.color }}>
                            <span className="emotion-emoji">{emotion.emoji}</span>
                            <span>Detected: {emotion.label}</span>
                        </div>
                    )}
                </div>
                <div className="avatar user-avatar">👤</div>
            </div>
        );
    }

    return (
        <div className="message bot-message">
            <div className="avatar bot-avatar">🧠</div>
            <div className="bubble bot-bubble">{item.bot_message}</div>
        </div>
    );
}

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingHistory, setIsFetchingHistory] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const chatAreaRef = useRef(null);

    // Load history on mount
    useEffect(() => {
        fetchHistory();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API_BASE}/history`);
            const history = res.data.history || [];
            // Each history item has both user_message and bot_message - render as pairs
            setMessages(history);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setIsFetchingHistory(false);
        }
    };

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        // Optimistically add user message (placeholder, no emotion yet)
        const tempUserMsg = {
            id: `temp-${Date.now()}`,
            user_message: text,
            bot_message: null,
            dominant_emotion: null,
            emotion_scores: {},
            timestamp: new Date().toISOString(),
            isTemp: true,
        };

        setMessages(prev => [...prev, tempUserMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post(`${API_BASE}/chat`, { message: text });
            const { emotion_scores, dominant_emotion, bot_message } = res.data;

            // Replace temp message with real one
            setMessages(prev => [
                ...prev.filter(m => !m.isTemp),
                {
                    id: Date.now(),
                    user_message: text,
                    bot_message,
                    dominant_emotion,
                    emotion_scores,
                    timestamp: new Date().toISOString(),
                },
            ]);
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [
                ...prev.filter(m => !m.isTemp),
                {
                    id: Date.now(),
                    user_message: text,
                    bot_message: "I'm having a moment of silence — something went wrong on my end. Please try again.",
                    dominant_emotion: 'neutral',
                    emotion_scores: {},
                    timestamp: new Date().toISOString(),
                },
            ]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="chat-page">
            {/* ── Welcome Banner ── */}
            {messages.length === 0 && !isFetchingHistory && (
                <div className="welcome-banner">
                    <div className="welcome-icon">🧠</div>
                    <h1 className="welcome-title">Welcome to MindPal</h1>
                    <p className="welcome-sub">
                        A safe space to talk about your day, explore your feelings,<br />
                        and reflect on what matters.
                    </p>
                    <div className="welcome-prompts">
                        {[
                            "How are you feeling right now?",
                            "Tell me about your day",
                            "I've been feeling anxious lately",
                            "Something good happened today",
                        ].map(prompt => (
                            <button
                                key={prompt}
                                className="prompt-chip"
                                onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Chat Area ── */}
            <div className="chat-area" ref={chatAreaRef}>
                {isFetchingHistory ? (
                    <div className="loading-history">
                        <div className="spinner"></div>
                        <span>Loading your conversation history…</span>
                    </div>
                ) : (
                    messages.map((item) => (
                        <React.Fragment key={item.id}>
                            {/* User message */}
                            <ChatMessage item={item} isUser={true} />
                            {/* Bot message (if available, i.e. not a temp placeholder) */}
                            {item.bot_message && (
                                <ChatMessage item={item} isUser={false} />
                            )}
                        </React.Fragment>
                    ))
                )}

                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Input Area ── */}
            <div className="input-area">
                <div className="input-container">
                    <textarea
                        ref={inputRef}
                        className="chat-input"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Share what's on your mind…"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        className="send-btn"
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        aria-label="Send message"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
                <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
            </div>
        </div>
    );
}
