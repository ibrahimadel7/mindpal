import React from 'react';
import { MdShowChart, MdGpsFixed, MdBalance, MdNotes } from 'react-icons/md';
import { useInsights } from '../hooks/useInsights';
import InsightCard from './InsightCard';
import ChartContainer from './ChartContainer';
import StatBlock from './StatBlock';
import '../styles/InsightsView.css';

export default function InsightsView({ history = [] }) {
  const insights = useInsights(history);

  if (!history.length) {
    return (
      <div className="insights-empty">
        <div className="empty-illustration">
          <MdShowChart />
        </div>
        <h2>No insights yet</h2>
        <p>Start journaling to see your emotional patterns and analytics.</p>
      </div>
    );
  }

  return (
    <div className="insights-view">
      {/* Header */}
      <div className="insights-header">
        <h1>Your Emotional Insights</h1>
        <p>Understand your emotional patterns and wellbeing trends</p>
      </div>

      {/* Summary Cards Row */}
      <section className="insights-section">
        <div className="summary-cards">
          <InsightCard
            title="Dominant Emotion"
            value={insights.dominantEmotion.emotion}
            subtitle={`${insights.dominantEmotion.frequency} reflections`}
            icon={<MdGpsFixed />}
          />
          <InsightCard
            title="Emotional Stability"
            value={insights.stabilityScore.level}
            subtitle={`${insights.stabilityScore.percentage}% consistent`}
            icon={<MdBalance />}
          />
          <InsightCard
            title="Total Reflections"
            value={insights.totalMessages}
            subtitle="Tracked entries"
            icon={<MdNotes />}
          />
        </div>
      </section>

      {/* Emotion Frequency Chart */}
      <section className="insights-section">
        <h2 className="section-title">Emotion Frequency</h2>
        <ChartContainer
          type="bar"
          data={insights.emotionFrequency}
          title="How often each emotion appears"
        />
      </section>

      {/* Weekly Trend Chart */}
      <section className="insights-section">
        <h2 className="section-title">Weekly Trend</h2>
        <ChartContainer
          type="line"
          data={insights.weeklyTrend}
          title="Your emotional journey over weeks"
        />
      </section>

      {/* Habit Frequency */}
      {insights.habitFrequency.length > 0 && (
        <section className="insights-section">
          <h2 className="section-title">Habit Frequency</h2>
          <div className="habit-grid">
            {insights.habitFrequency.map((h, idx) => (
              <StatBlock
                key={idx}
                label={h.habit}
                value={h.count}
                unit="times"
              />
            ))}
          </div>
        </section>
      )}

      {/* Emotional Distribution */}
      {insights.emotionDistribution.length > 0 && (
        <section className="insights-section">
          <h2 className="section-title">Emotion Distribution</h2>
          <div className="distribution-chart">
            {insights.emotionDistribution.map((e, idx) => (
              <div key={idx} className="distribution-item">
                <div className="bar-container">
                  <div className="bar-label">{e.emotion}</div>
                  <div className="bar-wrapper">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${e.percentage}%`,
                        animation: `fillBar 0.6s ease-out ${idx * 0.1}s forwards`,
                      }}
                    />
                  </div>
                  <div className="bar-value">{e.count}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pattern Insights */}
      {insights.patternInsights.length > 0 && (
        <section className="insights-section">
          <h2 className="section-title">Emotional Patterns</h2>
          <div className="patterns-grid">
            {insights.patternInsights.map((p, idx) => (
              <InsightCard
                key={idx}
                title={p.label}
                value={p.value}
                icon="🔗"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
