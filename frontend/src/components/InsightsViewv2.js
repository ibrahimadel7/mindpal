import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MdShowChart, MdGpsFixed, MdBalance, MdNotes, MdTrendingUp } from 'react-icons/md';
import InsightCard from './InsightCard';
import ChartContainer from './ChartContainer';
import StatBlock from './StatBlock';
import '../styles/InsightsViewv2.css';

const API_BASE = 'http://localhost:8000';

export default function InsightsView() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const res = await axios.get(`${API_BASE}/insights/summary`);
      const emotionsRes = await axios.get(`${API_BASE}/insights/emotions`);
      const habitsRes = await axios.get(`${API_BASE}/insights/habits`);
      const timeRes = await axios.get(`${API_BASE}/insights/time`);

      setInsights({
        summary: res.data,
        emotions: emotionsRes.data,
        habits: habitsRes.data,
        time: timeRes.data,
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setError('Unable to load insights');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="insights-loading">
        <div className="spinner"></div>
        <p>Loading your insights…</p>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="insights-empty">
        <div className="empty-illustration">
          <MdShowChart />
        </div>
        <h2>No insights yet</h2>
        <p>Start chatting to see your emotional patterns and analytics.</p>
      </div>
    );
  }

  const { summary, emotions, habits, time } = insights;
  const topEmotions = summary.top_emotions || [];
  const topHabits = summary.top_habits || [];
  const timeAnalysis = time.by_period || {};

  return (
    <div className="insights-view">
      {/* Header */}
      <div className="insights-header">
        <h1>Your Emotional Insights</h1>
        <p>Understand your emotional patterns and wellbeing trends</p>
      </div>

      {/* Summary Cards */}
      <section className="insights-section">
        <div className="summary-cards">
          <InsightCard
            title="Dominant Emotion"
            value={summary.dominant_emotion || 'unknown'}
            subtitle={`${summary.total_emotions_tracked} emotions tracked`}
            icon={<MdGpsFixed />}
          />
          <InsightCard
            title="Total Check-ins"
            value={summary.total_emotions_tracked}
            subtitle="Emotional entries"
            icon={<MdNotes />}
          />
          <InsightCard
            title="Habits Tracked"
            value={summary.total_habits_tracked}
            subtitle={topHabits.length > 0 ? topHabits[0][0] : 'Start tracking habits'}
            icon={<MdTrendingUp />}
          />
        </div>
      </section>

      {/* Top Emotions */}
      {topEmotions.length > 0 && (
        <section className="insights-section">
          <h2 className="section-title">Top Emotions</h2>
          <div className="emotion-list">
            {topEmotions.map(([emotion, count], idx) => (
              <div key={idx} className="emotion-item">
                <div className="emotion-rank">{idx + 1}</div>
                <span className="emotion-name">
                  {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                </span>
                <span className="emotion-count">{count} times</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Emotion Trend Chart */}
      {emotions.emotion_trend && emotions.emotion_trend.length > 0 && (
        <section className="insights-section">
          <h2 className="section-title">Emotion Trend (Last 7 Days)</h2>
          <ChartContainer
            type="line"
            data={emotions.emotion_trend}
            title="Your emotional journey over the week"
          />
        </section>
      )}

      {/* Time of Day Analysis */}
      {Object.keys(timeAnalysis).length > 0 && (
        <section className="insights-section">
          <h2 className="section-title">Time of Day Analysis</h2>
          <div className="time-analysis-grid">
            {['morning', 'afternoon', 'evening', 'night'].map(period => {
              const periodData = timeAnalysis[period] || {};
              const emotions_in_period = Object.entries(periodData)
                .sort(([, a], [, b]) => b.count - a.count)
                .slice(0, 1);
              
              return (
                <div key={period} className="time-card">
                  <div className="time-period">{period.charAt(0).toUpperCase() + period.slice(1)}</div>
                  {emotions_in_period.length > 0 ? (
                    <div>
                      <div className="time-emotion">
                        {emotions_in_period[0][0].charAt(0).toUpperCase() + emotions_in_period[0][0].slice(1)}
                      </div>
                      <div className="time-count">{emotions_in_period[0][1].count} entries</div>
                    </div>
                  ) : (
                    <div className="time-empty">No data</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Saddest, Happiest, Stressful Periods */}
      <section className="insights-section">
        <h2 className="section-title">Peak Times</h2>
        <div className="peak-times-grid">
          {time.saddest_period !== 'unknown' && (
            <StatBlock
              label="Saddest Period"
              value={time.saddest_period}
              unit=""
            />
          )}
          {time.happiest_period !== 'unknown' && (
            <StatBlock
              label="Happiest Period"
              value={time.happiest_period}
              unit=""
            />
          )}
          {time.most_stressful_period !== 'unknown' && (
            <StatBlock
              label="Most Stressful Period"
              value={time.most_stressful_period}
              unit=""
            />
          )}
        </div>
      </section>

      {/* Top Habits */}
      {topHabits.length > 0 && (
        <section className="insights-section">
          <h2 className="section-title">Habits Frequency</h2>
          <div className="habit-grid">
            {topHabits.map(([habit, count], idx) => (
              <StatBlock
                key={idx}
                label={habit.charAt(0).toUpperCase() + habit.slice(1)}
                value={count}
                unit="times"
              />
            ))}
          </div>
        </section>
      )}

      {/* Emotion-Habit Correlations */}
      {habits.correlations && habits.correlations.length > 0 && (
        <section className="insights-section">
          <h2 className="section-title">Habit-Emotion Links</h2>
          <div className="correlations-grid">
            {habits.correlations.slice(0, 5).map((correlation, idx) => (
              <div key={idx} className="correlation-card">
                <div className="correlation-habit">
                  {correlation.habit.charAt(0).toUpperCase() + correlation.habit.slice(1)}
                </div>
                <div className="correlation-emotions">
                  {correlation.emotions.slice(0, 2).map((e, eidx) => (
                    <div key={eidx} className="linked-emotion">
                      {e.emotion} ({e.co_occurrences}x)
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
