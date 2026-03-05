import React from 'react';
import '../styles/StatBlock.css';

export default function StatBlock({ label, value, unit = '' }) {
  return (
    <div className="stat-block">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {unit && <div className="stat-unit">{unit}</div>}
    </div>
  );
}
