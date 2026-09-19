// src/pages/Analytics.jsx
// Dedicated analytics page with live Chart.js charts + stats cards.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../utils/api';
import StatsCard from '../components/StatsCard';
import IncidentTimelineChart from '../components/IncidentTimelineChart';
import IncidentTypeDonut from '../components/IncidentTypeDonut';
import ZoneBarChart from '../components/ZoneBarChart';

function ChartPanel({ title, subtitle, children }) {
  return (
    <div style={{
      background: '#111827',
      border: '1px solid #1f2937',
      borderRadius: '16px',
      padding: '20px',
    }}>
      <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 700, color: '#d1d5db' }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ margin: '0 0 16px', fontSize: '11px', color: '#6b7280' }}>{subtitle}</p>
      )}
      {!subtitle && <div style={{ marginBottom: '16px' }} />}
      {children}
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('meshsos_user') || '{}');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000); // refresh every 30 s
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const res = await api.get('/api/admin/analytics');
      if (res.data.success) {
        setAnalytics(res.data.data);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error('Analytics fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  const s = analytics?.summary || {};
  const ts = analytics?.timeSeries || {};
  const bd = analytics?.breakdowns || {};

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f1e',
      color: '#f9fafb',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <header style={{
        background: '#111827',
        borderBottom: '1px solid #1f2937',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            id="analytics-back-btn"
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: 8,
              color: '#9ca3af',
              fontSize: 12,
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ← Dashboard
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>📊</span>
              <span style={{ fontSize: 18, fontWeight: 900 }}>Analytics Centre</span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.1em',
                background: 'rgba(59,130,246,0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 6, padding: '2px 8px',
              }}>LIVE</span>
            </div>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
              MeshSOS Disaster Response Intelligence Dashboard
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: '#6b7280' }}>
              Refreshed {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            id="analytics-refresh-btn"
            onClick={fetchData}
            style={{
              background: '#1d4ed8',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 12,
              padding: '6px 14px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ↻ Refresh
          </button>
          <a
            href={`${API_BASE_URL}/api/admin/export/csv`}
            download="meshsos_export.csv"
            style={{
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: 8,
              color: '#d1d5db',
              fontSize: 12,
              padding: '6px 14px',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            📥 Export CSV
          </a>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6b7280',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {user.name || user.email}
          </button>
        </div>
      </header>

      {/* ── Stats Cards ──────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
          ))}
        </div>
      ) : (
        <div style={{
          padding: '24px 24px 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}>
          <StatsCard icon="🚨" label="Total Incidents" value={s.totalIncidents || 0} subLabel="All time" color="#ef4444" trend={5} />
          <StatsCard icon="✅" label="Resolved" value={s.resolvedIncidents || 0} subLabel={`${s.resolutionRate || 0}% resolution rate`} color="#22c55e" trend={12} />
          <StatsCard icon="⏳" label="Active Alerts" value={s.newIncidents || 0} subLabel="Requires assignment" color="#f97316" />
          <StatsCard icon="🤖" label="Avg Triage Score" value={`${s.avgTriageScore || 0}/10`} subLabel="NLP AI scoring" color="#a78bfa" />
          <StatsCard icon="🚒" label="Teams Available" value={s.availableTeams || 0} subLabel={`of ${s.totalTeams || 0} total`} color="#3b82f6" />
          <StatsCard icon="🛡️" label="Flagged Packets" value={s.flaggedCount || 0} subLabel="Anti-spoof queue" color="#fbbf24" />
          <StatsCard icon="📡" label="Total SOS Received" value={s.totalSOS || 0} subLabel="All broadcasts" color="#60a5fa" />
          <StatsCard icon="☑️" label="Safe Check-ins" value={s.safeCheckins || 0} subLabel="Community OK signals" color="#34d399" />
        </div>
      )}

      {/* ── Charts Row ───────────────────────────────────────────────────── */}
      <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

        <ChartPanel
          title="📈 Incidents Over Time"
          subtitle="Last 7 days — daily incident count from Disaster Grid"
        >
          <IncidentTimelineChart incidentsByDay={ts.incidentsByDay || []} />
        </ChartPanel>

        <ChartPanel
          title="🍩 Incident Breakdown by Type"
          subtitle="Distribution of emergency categories"
        >
          <IncidentTypeDonut byType={bd.byType || {}} />
        </ChartPanel>

        <ChartPanel
          title="🗺️ Incident Hotspots by Zone"
          subtitle="Top zones by incident volume (colour = severity)"
        >
          <ZoneBarChart byZone={bd.byZone || []} />
        </ChartPanel>

      </div>

      {/* ── Priority Breakdown ───────────────────────────────────────────── */}
      {bd.byPriority && Object.keys(bd.byPriority).length > 0 && (
        <div style={{ padding: '0 24px 32px' }}>
          <div style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: 16,
            padding: 20,
          }}>
            <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#d1d5db' }}>
              🎯 Incident Priority Distribution
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {Object.entries(bd.byPriority).map(([priority, count]) => {
                const colors = { critical: '#ef4444', high: '#f97316', medium: '#fbbf24', low: '#22c55e' };
                const c = colors[priority] || '#6b7280';
                return (
                  <div key={priority} style={{
                    background: `${c}15`,
                    border: `1px solid ${c}44`,
                    borderRadius: 10,
                    padding: '10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{priority}</p>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: c }}>{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
