// src/components/ZoneBarChart.jsx
// Horizontal bar chart showing incidents per zone.

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

export default function ZoneBarChart({ byZone = [] }) {
  if (byZone.length === 0) {
    return <div className="skeleton" style={{ height: '220px', borderRadius: '12px' }} />;
  }

  const sorted = [...byZone].sort((a, b) => b.count - a.count).slice(0, 8);
  const labels = sorted.map((z) => z.zone);
  const values = sorted.map((z) => z.count);

  // Gradient colours — highest bar is most red
  const maxVal = Math.max(...values);
  const backgroundColors = values.map((v) => {
    const ratio = v / maxVal;
    if (ratio > 0.75) return 'rgba(239,68,68,0.8)';
    if (ratio > 0.45) return 'rgba(249,115,22,0.8)';
    return 'rgba(59,130,246,0.75)';
  });

  const data = {
    labels,
    datasets: [{
      label: 'Incidents',
      data: values,
      backgroundColor: backgroundColors,
      borderColor: backgroundColors.map((c) => c.replace(',0.8)', ',1)').replace(',0.75)', ',1)')),
      borderWidth: 1.5,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const options = {
    indexAxis: 'y',
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
        callbacks: {
          label: (ctx) => ` ${ctx.raw} incident${ctx.raw !== 1 ? 's' : ''}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#1f2937' },
        ticks: { color: '#6b7280', font: { size: 11 }, stepSize: 1 },
        beginAtZero: true,
      },
      y: {
        grid: { display: false },
        ticks: { color: '#d1d5db', font: { size: 11 } },
      },
    },
    animation: { duration: 800, easing: 'easeOutQuart' },
  };

  return (
    <div style={{ height: '220px', position: 'relative' }}>
      <Bar data={data} options={options} />
    </div>
  );
}
