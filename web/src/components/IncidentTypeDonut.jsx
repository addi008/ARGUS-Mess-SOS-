// src/components/IncidentTypeDonut.jsx
// Doughnut chart showing incidents broken down by emergency type.

import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const TYPE_COLORS = {
  medical:     '#ef4444',
  trapped:     '#f97316',
  fire:        '#dc2626',
  flood:       '#3b82f6',
  other:       '#8b5cf6',
  safe_checkin:'#22c55e',
};

const TYPE_LABELS = {
  medical:     '🩺 Medical',
  trapped:     '🧱 Trapped',
  fire:        '🔥 Fire',
  flood:       '🌊 Flood',
  other:       '⚠️ Other',
  safe_checkin:'✅ Safe Check-in',
};

export default function IncidentTypeDonut({ byType = {} }) {
  const entries = Object.entries(byType).filter(([, v]) => v > 0);

  if (entries.length === 0) {
    return <div className="skeleton" style={{ height: '220px', borderRadius: '12px' }} />;
  }

  const labels = entries.map(([k]) => TYPE_LABELS[k] || k);
  const values = entries.map(([, v]) => v);
  const colors = entries.map(([k]) => TYPE_COLORS[k] || '#6b7280');

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors.map((c) => `${c}cc`),
      borderColor: colors,
      borderWidth: 2,
      hoverBorderWidth: 3,
      hoverOffset: 6,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#9ca3af',
          font: { size: 11 },
          padding: 10,
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: '#111827',
        borderColor: '#374151',
        borderWidth: 1,
        titleColor: '#f9fafb',
        bodyColor: '#9ca3af',
        callbacks: {
          label: (ctx) => ` ${ctx.raw} incident${ctx.raw !== 1 ? 's' : ''}`,
        },
      },
    },
    animation: { duration: 900, easing: 'easeOutQuart' },
  };

  return (
    <div style={{ height: '220px', position: 'relative' }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}
