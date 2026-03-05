import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import ChatPageRefactored from './ChatPageRefactored';
import InsightsViewv2 from './components/InsightsViewv2';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/conversations`);
      const convs = res.data.conversations || [];
      setConversations(convs);
      
      // Set active to first conversation if available
      if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      const res = await axios.post(`${API_BASE}/conversations`);
      const newConv = res.data;
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      navigate('/');
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleSelectConversation = (conversationId) => {
    setActiveConversationId(conversationId);
    navigate('/');
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await axios.delete(`${API_BASE}/conversations/${conversationId}`);
      setConversations(prevs => prevs.filter(c => c.id !== conversationId));
      
      if (activeConversationId === conversationId) {
        const remaining = conversations.find(c => c.id !== conversationId);
        setActiveConversationId(remaining?.id || null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleMessageSent = (conversationId) => {
    // Update active conversation
    if (conversationId) {
      setActiveConversationId(conversationId);
    }
    // Reload conversations to get updated titles/timestamps
    loadConversations();
  };

  if (loading) {
    return (
      <div className="app-wrapper">
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <ChatPageRefactored
                conversationId={activeConversationId}
                onMessageSent={handleMessageSent}
              />
            }
          />
          <Route
            path="/insights"
            element={<InsightsViewv2 />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;

