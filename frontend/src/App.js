import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import ChatPage from './ChatPage';
import DashboardPage from './DashboardPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <nav className="navbar">
          <div className="navbar-brand">
            <span className="brand-icon">🧠</span>
            <span className="brand-name">MindPal</span>
          </div>
          <div className="navbar-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              Chat
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              Insights
            </NavLink>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
