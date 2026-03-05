import React, { useState } from 'react';
import { MdMoreVert } from 'react-icons/md';
import '../styles/ConversationItem.css';

export default function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'Today';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const getEmotionColor = (emotion) => {
    const emotionColors = {
      joy: '#f4d03f',
      sadness: '#85c1e2',
      anger: '#e57373',
      fear: '#ce93d8',
      disgust: '#81c784',
      surprise: '#f48fb1',
      neutral: '#b0bec5',
    };
    return emotionColors[emotion?.toLowerCase()] || '#b0bec5';
  };

  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="conv-content">
        <div className="conv-header">
          <h3 className="conv-title">{conversation.title || 'Untitled'}</h3>
          <div
            className="emotion-dot"
            style={{ backgroundColor: getEmotionColor(conversation.emotion) }}
            title={conversation.emotion}
          />
        </div>
        <p className="conv-date">{formatDate(conversation.timestamp)}</p>
        {conversation.preview && (
          <p className="conv-preview">{conversation.preview}</p>
        )}
      </div>

      <button
        className="btn-menu"
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        aria-label="Conversation menu"
      >
        <MdMoreVert />
      </button>

      {showMenu && (
        <div className="menu-dropdown">
          <button className="menu-item" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}>
            Rename
          </button>
          <button
            className="menu-item delete"
            onClick={(e) => {
              setShowMenu(false);
              onDelete(e);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
