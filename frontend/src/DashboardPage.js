import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    BarChart, Bar, Cell,
} from 'recharts';
import './DashboardPage.css';

const API_BASE = 'http://localhost:8000';

const EMOTION_CONFIG = {
    joy: { color: '#fbbf24', emoji: '😊' },
    sadness: { color: '#60a5fa', emoji: '😢' },
    anger: { color: '#f87171', emoji: '😠' },
    fear: { color: '#a78bfa', emoji: '😨' },
    disgust: { color: '#34d399', emoji: '🤢' },
    surprise: { color: '#f472b6', emoji: '😲' },
    neutral: { color: '#94a3b8', emoji: '😐' },
};

const ALL_EMOTIONS = Object.keys(EMOTION_CONFIG);

function formatTime(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
    });
}

function StatCard({ emoji, label, value, sub, color }) {
    return (
        <div className="stat-card" style={{ '--card-accent': color }}>
            <div className="stat-icon">{emoji}</div>
            <div className="stat-body">
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
                {sub && <div className="stat-sub">{sub}</div>}
            </div>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p className="tooltip-label">{label}</p>
                {payload.map(p => (
                    <p key={p.dataKey} style={{ color: p.color }} className="tooltip-row">
                        {EMOTION_CONFIG[p.dataKey]?.emoji || ''} {p.name}: {(p.value * 100).toFixed(1)}%
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const BarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const cfg = EMOTION_CONFIG[label?.toLowerCase()] || {};
        return (
            <div className="chart-tooltip">
                <p style={{ color: cfg.color || '#fff' }}>
                    {cfg.emoji} {label}: {payload[0].value} message{payload[0].value !== 1 ? 's' : ''}
                </p>
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API_BASE}/history`);
            setHistory(res.data.history || []);
        } catch (err) {
            setError('Could not load history. Make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    // ── Derived Analytics ───────────────────────────────────────────────────────
    const { lineData, barData, dominantEmotion, stabilityScore, totalMessages } = useMemo(() => {
        if (!history.length) return { lineData: [], barData: [], dominantEmotion: '—', stabilityScore: '—', totalMessages: 0 };

        // Line chart: each message is a point with all emotion scores
        const lineData = history.map(item => ({
            name: formatTime(item.timestamp),
            ...item.emotion_scores,
        }));

        // Bar chart: count dominant emotions
        const counts = {};
        history.forEach(item => {
            const e = item.dominant_emotion?.toLowerCase();
            if (e) counts[e] = (counts[e] || 0) + 1;
        });
        const barData = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([emotion, count]) => ({ emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1), count }));

        // Dominant overall emotion
        const dominant = barData[0]?.emotion || '—';

        // Stability: standard deviation of dominant emotion scores (lower = more stable)
        const dominant_key = dominant.toLowerCase();
        const scores = history.map(h => h.emotion_scores?.[dominant_key] || 0);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
        const std = Math.sqrt(variance);
        const stability = std < 0.1 ? 'Stable' : std < 0.2 ? 'Moderate' : 'Variable';

        return {
            lineData,
            barData,
            dominantEmotion: dominant,
            stabilityScore: stability,
            totalMessages: history.length,
        };
    }, [history]);

    // Determine which emotions appear in the data (for line chart)
    const activeEmotions = useMemo(() => {
        const seen = new Set();
        history.forEach(item => {
            Object.keys(item.emotion_scores || {}).forEach(e => seen.add(e));
        });
        return Array.from(seen);
    }, [history]);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Loading your emotional insights…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <span className="error-icon">⚠️</span>
                <p>{error}</p>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="dashboard-empty">
                <div className="empty-icon">📊</div>
                <h2>No data yet</h2>
                <p>Start a conversation in the Chat tab and your emotional patterns will appear here.</p>
            </div>
        );
    }

    const dominantCfg = EMOTION_CONFIG[dominantEmotion.toLowerCase()] || {};

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <h1 className="dashboard-title">Emotional Insights</h1>
                <p className="dashboard-sub">Your emotional patterns at a glance</p>
            </div>

            {/* ── Stat Cards ── */}
            <div className="stat-cards">
                <StatCard
                    emoji={dominantCfg.emoji || '💭'}
                    label="Dominant Emotion"
                    value={dominantEmotion}
                    sub="Most frequent feeling"
                    color={dominantCfg.color || '#8b5cf6'}
                />
                <StatCard
                    emoji="📈"
                    label="Emotional Stability"
                    value={stabilityScore}
                    sub="Based on score variance"
                    color="#60a5fa"
                />
                <StatCard
                    emoji="💬"
                    label="Total Check-ins"
                    value={totalMessages}
                    sub="Messages shared"
                    color="#2dd4bf"
                />
            </div>

            {/* ── Line Chart: Emotion Trends ── */}
            <div className="chart-card">
                <div className="chart-header">
                    <h2>Emotion Trends Over Time</h2>
                    <p>How your emotions have shifted across conversations</p>
                </div>
                <div className="chart-body">
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={lineData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: '#6b6b8a', fontSize: 11 }}
                                tickLine={false}
                                axisLine={{ stroke: '#2e2e55' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fill: '#6b6b8a', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                                domain={[0, 1]}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ fontSize: 12, paddingTop: 16, color: '#a0a0c0' }}
                            />
                            {activeEmotions.map(emotion => (
                                <Line
                                    key={emotion}
                                    type="monotone"
                                    dataKey={emotion}
                                    name={emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                                    stroke={EMOTION_CONFIG[emotion]?.color || '#8b5cf6'}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Bar Chart: Most Frequent Emotions ── */}
            <div className="chart-card">
                <div className="chart-header">
                    <h2>Emotion Frequency</h2>
                    <p>Which emotions appeared most in your messages</p>
                </div>
                <div className="chart-body">
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={barData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="emotion"
                                tick={{ fill: '#6b6b8a', fontSize: 12 }}
                                tickLine={false}
                                axisLine={{ stroke: '#2e2e55' }}
                            />
                            <YAxis
                                tick={{ fill: '#6b6b8a', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {barData.map((entry) => (
                                    <Cell
                                        key={entry.emotion}
                                        fill={EMOTION_CONFIG[entry.emotion.toLowerCase()]?.color || '#8b5cf6'}
                                        fillOpacity={0.85}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
