import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  Cell,
} from 'recharts';
import '../styles/ChartContainer.css';

export default function ChartContainer({ type = 'bar', data = [], title = '' }) {
  const EMOTION_COLORS = {
    joy: '#f4d03f',
    sadness: '#85c1e2',
    anger: '#e57373',
    fear: '#ce93d8',
    disgust: '#81c784',
    surprise: '#f48fb1',
    neutral: '#b0bec5',
  };

  const getEmotionColor = (emotion) => {
    if (!emotion) return '#b0bec5';
    const lower = emotion.toLowerCase();
    return EMOTION_COLORS[lower] || '#b0bec5';
  };

  const chartData = useMemo(() => {
    if (type === 'bar' && data[0]?.count !== undefined) {
      return data;
    }
    return data;
  }, [data, type]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          {payload.map((entry, idx) => (
            <p key={idx} style={{ color: entry.color || entry.payload.fill }}>
              {entry.name || entry.dataKey}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          {type === 'bar' ? (
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a68676" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#a68676" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(217, 207, 200, 0.3)"
                vertical={false}
              />
              <XAxis
                dataKey="emotion"
                stroke="var(--text-muted)"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="var(--text-muted)"
                style={{ fontSize: '12px' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={chartData}>
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a68676" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#a68676" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(217, 207, 200, 0.3)"
                vertical={false}
              />
              <XAxis
                dataKey="week"
                stroke="var(--text-muted)"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="var(--text-muted)"
                style={{ fontSize: '12px' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {Object.keys(EMOTION_COLORS).map(emotion => {
                const dataKey = emotion;
                const hasData = chartData.some(d => d[dataKey] !== undefined);
                if (!hasData) return null;
                return (
                  <Line
                    key={emotion}
                    type="monotone"
                    dataKey={dataKey}
                    stroke={EMOTION_COLORS[emotion]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={true}
                  />
                );
              })}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
