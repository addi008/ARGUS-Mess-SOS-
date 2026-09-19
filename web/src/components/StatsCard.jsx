// src/components/StatsCard.jsx
// Reusable animated stat card with icon, value label, and trend indicator.

import React, { useEffect, useRef, useState } from 'react';

function useCountUp(target, duration = 800) {
  const [count, setCount] = useState(0);
  const startRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    if (typeof target !== 'number') {
      setCount(target);
      return;
    }
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return count;
}

export default function StatsCard({ icon, label, value, subLabel, color = '#3b82f6', trend }) {
  const isNumeric = typeof value === 'number';
  const displayed = isNumeric ? useCountUp(value) : value;

  const trendColor = trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#9ca3af';
  const trendArrow = trend > 0 ? '↑' : trend < 0 ? '↓' : '—';

  return (
    <div className="animate-fade-in-up" style={{
      background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
      border: '1px solid #1f2937',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 8px 32px ${color}22`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Subtle color accent top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: `linear-gradient(90deg, ${color}, transparent)`,
      }} />

      {/* Icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '26px', lineHeight: 1 }}>{icon}</span>
        {trend !== undefined && (
          <span style={{ fontSize: '12px', fontWeight: 700, color: trendColor }}>
            {trendArrow} {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Value */}
      <div style={{ fontSize: '32px', fontWeight: 900, color, lineHeight: 1 }}>
        {displayed}
      </div>

      {/* Label */}
      <div>
        <p style={{ fontSize: '12px', fontWeight: 700, color: '#d1d5db', margin: 0 }}>{label}</p>
        {subLabel && (
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }}>{subLabel}</p>
        )}
      </div>
    </div>
  );
}
