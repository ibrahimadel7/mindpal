import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MdPsychology, MdChat, MdShowChart, MdAdd } from 'react-icons/md';
import ConversationItem from './ConversationItem';
import DeleteModal from './DeleteModal';
import '../styles/Sidebar.css';

export default function Sidebar({
  conversations = [],
  activeId = null,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const location = useLocation();

  const handleDeleteClick = (conversationId, e) => {
    e.stopPropagation();
    setDeleteTarget(conversationId);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDeleteConversation(deleteTarget);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const isChatActive = location.pathname === '/';
  const isInsightsActive = location.pathname === '/insights';

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand">
          <MdPsychology className="brand-icon" />
          <span className="brand-name">MindPal</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="sidebar-nav">
        <Link
          to="/"
          className={`nav-tab ${isChatActive ? 'active' : ''}`}
        >
          <MdChat className="nav-icon" />
          <span>Chat</span>
        </Link>
        <Link
          to="/insights"
          className={`nav-tab ${isInsightsActive ? 'active' : ''}`}
        >
          <MdShowChart className="nav-icon" />
          <span>Insights</span>
        </Link>
      </nav>

      {/* New Conversation Button - Only show on Chat */}
      {isChatActive && (
        <button className="btn-new-conversation" onClick={onNewConversation}>
          <MdAdd className="btn-icon" />
          <span>New Reflection</span>
        </button>
      )}

      {/* Conversations List - Only show on Chat */}
      {isChatActive && (
        <nav className="conversations-list">
          {conversations && conversations.length > 0 ? (
            conversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeId}
                onSelect={() => onSelectConversation(conv.id)}
                onDelete={(e) => handleDeleteClick(conv.id, e)}
              />
            ))
          ) : (
            <div className="empty-state">
              <p>No reflections yet.</p>
              <p className="empty-sub">Start your first reflection above.</p>
            </div>
          )}
        </nav>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <p className="footer-text">Your emotional journal</p>
      </div>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete reflection?"
        message="This cannot be undone."
      />
    </aside>
  );
}
