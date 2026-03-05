import React from 'react';
 import '../styles/MessageBubble.css';

const EMOTION_COLORS = {
  joy: '#f4d03f',
  sadness: '#85c1e2',
  anger: '#e57373',
  fear: '#ce93d8',
  disgust: '#81c784',
  surprise: '#f48fb1',
  neutral: '#b0bec5',
};

export default function MessageBubble({ message, isUser }) {
  const getEmotionColor = (emotion) => {
    return EMOTION_COLORS[emotion?.toLowerCase()] || '#b0bec5';
  };

  // Handle both old and new message formats
  const content = message.content || message.text || '';
  const emotions = message.emotions || [];
  const habits = message.habits || [];
  const dominant_emotion = message.dominant_emotion;

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
        <p className="message-text">{content}</p>
      </div>

      {isUser && (emotions.length > 0 || habits.length > 0) && (
        <div className="emotion-metadata">
          {emotions.slice(0, 2).map((e, idx) => (
            <React.Fragment key={idx}>
              <div
                className="emotion-indicator"
                style={{ backgroundColor: getEmotionColor(e.emotion) }}
                title={`${e.emotion} (${(e.confidence * 100).toFixed(0)}%)`}
              />
              <span className="emotion-label">
                {e.emotion.charAt(0).toUpperCase() + e.emotion.slice(1)}
              </span>
              {idx === 0 && (emotions.length > 1 || habits.length > 0) && (
                <span className="metadata-divider">•</span>
              )}
            </React.Fragment>
          ))}
          {habits.length > 0 && (
            <>
              <span className="habit-label">
                {habits.map(h => h.habit).join(', ')}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
