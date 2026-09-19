// src/components/IncidentTimelineChart.jsx
// Line chart showing incidents per day for the last 7 days.

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
);

export default function IncidentTimelineChart({ incidentsByDay = [] }) {
  const labels = incidentsByDay.map((d) => d.label);
  const counts = incidentsByDay.map((d) => d.count);

  const data = {
    labels,
    datasets: [
      {
        label: 'Incidents',
        data: counts,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
        fill: true,
        borderWidth: 2.5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        borderColor: '#374151',
        borderWidth: 1,
        titleColor: '#f9fafb',
        bodyColor: '#9ca3af',
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${ctx.raw} incident${ctx.raw !== 1 ? 's' : ''}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#1f2937' },
        ticks: { color: '#6b7280', font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#1f2937' },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          stepSize: 1,
        },
      },
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
  };

  return (
    <div style={{ height: '220px', position: 'relative' }}>
      {incidentsByDay.length === 0 ? (
        <div className="skeleton" style={{ height: '100%' }} />
      ) : (
        <Line data={data} options={options} />
      )}
    </div>
  );
}
