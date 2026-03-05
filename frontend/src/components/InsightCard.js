import React from 'react';
import '../styles/InsightCard.css';

export default function InsightCard({
  title,
  value,
  subtitle,
  icon = '✨',
}) {
  const isComponent = React.isValidElement(icon);

  return (
    <div className="insight-card">
      <div className="card-icon">
        {isComponent ? icon : <span>{icon}</span>}
      </div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <div className="card-value">{value}</div>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
