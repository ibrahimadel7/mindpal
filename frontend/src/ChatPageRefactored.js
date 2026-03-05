import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MdPsychology, MdSend } from 'react-icons/md';
import MessageBubble from './components/MessageBubble';
import './ChatPage.css';

const API_BASE = 'http://localhost:8000';

function TypingIndicator() {
  return (
    <div className="message bot-message typing-message">
      <div className="avatar bot-avatar">
        <MdPsychology />
      </div>
      <div className="bubble bot-bubble typing-bubble">
        <span></span><span></span><span></span>
      </div>
    </div>
  );
}

export default function ChatPageRefactored({ conversationId, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatAreaRef = useRef(null);

  // Load conversation on mount or when conversationId changes
  useEffect(() => {
    fetchConversation();
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchConversation = async () => {
    if (!conversationId) {
      setMessages([]);
      setIsFetchingHistory(false);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/conversations/${conversationId}`);
      const conversation = res.data;
      const formattedMessages = conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at,
        emotions: msg.emotions || [],
        habits: msg.habits || [],
      }));
      setMessages(formattedMessages);
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
      setMessages([]);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/chat`, {
        content: text,
        conversation_id: conversationId,
      });

      const { assistant_message, detected_emotions, detected_habits, conversation_id } = res.data;

      // Add user message
      setMessages(prev => [...prev, {
        id: res.data.message_id,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
        emotions: detected_emotions,
        habits: detected_habits,
      }]);

      // Add assistant message
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: assistant_message,
        created_at: new Date().toISOString(),
        emotions: [],
        habits: [],
      }]);

      // Update active conversation if needed
      if (onMessageSent) {
        onMessageSent(conversation_id);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: "I'm having a moment of silence — something went wrong on my end. Please try again.",
        created_at: new Date().toISOString(),
        emotions: [],
        habits: [],
      }]);
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

  if (isFetchingHistory && conversationId) {
    return (
      <div className="chat-page">
        <div className="loading-history">
          <div className="spinner"></div>
          <p>Loading conversation…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      {messages.length === 0 && (
        <div className="welcome-banner">
          <div className="welcome-icon">
            <MdPsychology />
          </div>
          <h1 className="welcome-title">Welcome to MindPal</h1>
          <p className="welcome-sub">
            Share your thoughts and feelings. I'm here to listen and help you reflect on what matters.
          </p>
          <div className="welcome-prompts">
            <button
              className="prompt-chip"
              onClick={() => {
                setInput("I've been feeling stressed about work lately");
                inputRef.current?.focus();
              }}
            >
              I've been stressed
            </button>
            <button
              className="prompt-chip"
              onClick={() => {
                setInput("I had a good day today");
                inputRef.current?.focus();
              }}
            >
              I had a good day
            </button>
            <button
              className="prompt-chip"
              onClick={() => {
                setInput("Help me reflect on my emotions");
                inputRef.current?.focus();
              }}
            >
              Help me reflect
            </button>
          </div>
        </div>
      )}

      <div className="chat-area" ref={chatAreaRef}>
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id || idx}
            message={msg}
            isUser={msg.role === 'user'}
          />
        ))}

        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <div className="input-container">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Share your thoughts…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
          />
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            title="Send message"
          >
            <MdSend />
          </button>
        </div>
        <p className="input-hint">Shift + Enter for new line</p>
      </div>
    </div>
  );
}
