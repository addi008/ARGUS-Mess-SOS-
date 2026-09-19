// src/pages/Admin.jsx
// Admin panel: User management view, Audit log viewer, CSV export, Flagged packet queue.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../utils/api';

const TABS = ['Audit Log', 'Flagged Packets', 'Rescue Teams', 'Zones'];

function Badge({ label, color = '#374151' }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 700,
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      {label}
    </span>
  );
}

function SectionCard({ title, icon, action, children }) {
  return (
    <div style={{
      background: '#111827',
      border: '1px solid #1f2937',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#0f172a',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#d1d5db' }}>
          {icon} {title}
        </span>
        {action}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#fbbf24', low: '#22c55e' };
const STATUS_COLORS = { available: '#22c55e', deployed: '#f97316', standby: '#60a5fa', unavailable: '#6b7280' };

export default function Admin() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('meshsos_user') || '{}');
  const [tab, setTab] = useState('Audit Log');
  const [auditLogs, setAuditLogs] = useState([]);
  const [flaggedQueue, setFlaggedQueue] = useState([]);
  const [teams, setTeams] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Guard: admin only
  useEffect(() => {
    if (user.role !== 'admin') {
      navigate('/dashboard');
    }
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [auditRes, flagRes, teamRes, zoneRes] = await Promise.all([
        api.get('/api/admin/audit-logs'),
        api.get('/api/sos/flagged/queue'),
        api.get('/api/admin/teams'),
        api.get('/api/admin/zones'),
      ]);
      if (auditRes.data.success) setAuditLogs(auditRes.data.data);
      if (flagRes.data.success) setFlaggedQueue(flagRes.data.data);
      if (teamRes.data.success) setTeams(teamRes.data.data);
      if (zoneRes.data.success) setZones(zoneRes.data.data);
    } catch (err) {
      console.error('Admin fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }

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
            id="admin-back-btn"
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#1f2937', border: '1px solid #374151',
              borderRadius: 8, color: '#9ca3af', fontSize: 12,
              padding: '6px 12px', cursor: 'pointer', fontWeight: 600,
            }}
          >
            ← Dashboard
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🔐</span>
              <span style={{ fontSize: 18, fontWeight: 900 }}>Admin Control Panel</span>
              <Badge label="Admin Only" color="#ef4444" />
            </div>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
              System management, audit trail, and security review
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            id="admin-export-csv-btn"
            href={`${API_BASE_URL}/api/admin/export/csv`}
            download="meshsos_incidents.csv"
            style={{
              background: '#1d4ed8', border: 'none',
              borderRadius: 8, color: '#fff', fontSize: 12,
              padding: '7px 14px', textDecoration: 'none', fontWeight: 700,
            }}
          >
            📥 Export CSV
          </a>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{user.name || user.email}</span>
        </div>
      </header>

      {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        background: '#0f172a',
        borderBottom: '1px solid #1f2937',
        padding: '0 24px',
        display: 'flex',
        gap: 4,
      }}>
        {TABS.map((t) => (
          <button
            key={t}
            id={`admin-tab-${t.toLowerCase().replace(' ', '-')}`}
            onClick={() => setTab(t)}
            style={{
              padding: '12px 18px',
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              borderBottom: tab === t ? '2px solid #ef4444' : '2px solid transparent',
              background: 'transparent',
              color: tab === t ? '#ffffff' : '#6b7280',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div style={{ padding: 24 }}>

        {/* Audit Log */}
        {tab === 'Audit Log' && (
          <SectionCard title={`Immutable Audit Log (${auditLogs.length})`} icon="📜"
            action={
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                Tamper-evident — append-only trail
              </span>
            }>
            {loading ? (
              <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />
            ) : auditLogs.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 13 }}>No audit entries yet.</p>
            ) : (
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1f2937', color: '#6b7280', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Action</th>
                      <th style={{ padding: '8px 10px' }}>Entity</th>
                      <th style={{ padding: '8px 10px' }}>Performed By</th>
                      <th style={{ padding: '8px 10px' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log._id}
                        style={{ borderBottom: '1px solid #111827', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1f2937'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '8px 10px', color: '#f9fafb', fontWeight: 600 }}>
                          {log.action?.replace(/_/g, ' ').toUpperCase() || '—'}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#9ca3af' }}>
                          {log.entityType || '—'} {log.entityId ? `#${String(log.entityId).slice(-6)}` : ''}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#60a5fa' }}>
                          {log.performedBy?.name || log.performedBy?.email || 'System'}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#6b7280' }}>
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}

        {/* Flagged Packets */}
        {tab === 'Flagged Packets' && (
          <SectionCard title={`Cybersecurity Anomaly Queue (${flaggedQueue.length})`} icon="🛡️"
            action={<Badge label="Anti-Spoof Filter" color="#fbbf24" />}>
            {loading ? (
              <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />
            ) : flaggedQueue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 40 }}>🛡️</div>
                <p style={{ color: '#22c55e', fontWeight: 700, marginTop: 12 }}>All Clear</p>
                <p style={{ color: '#6b7280', fontSize: 13 }}>No anomalous packets detected</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
                {flaggedQueue.map((pkt) => (
                  <div key={pkt._id} style={{
                    background: '#1c1008',
                    border: '1px solid #f97316',
                    borderRadius: 10,
                    padding: 14,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                  }}>
                    <span style={{ fontSize: 22 }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <Badge label={pkt.emergencyType || 'unknown'} color="#f97316" />
                        <span style={{ fontSize: 10, color: '#6b7280' }}>
                          {pkt.createdAt ? new Date(pkt.createdAt).toLocaleString('en-IN') : ''}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#fcd34d', fontWeight: 600 }}>
                        {pkt.flagReason || 'Signature mismatch / replay attack detected'}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
                        Packet ID: {pkt.packetId || pkt._id}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* Rescue Teams */}
        {tab === 'Rescue Teams' && (
          <SectionCard title={`Rescue Teams (${teams.length})`} icon="🚒"
            action={<Badge label={`${teams.filter(t => t.status === 'available').length} available`} color="#22c55e" />}>
            {loading ? (
              <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {teams.map((team) => (
                  <div key={team._id} style={{
                    background: '#0f172a',
                    border: '1px solid #1f2937',
                    borderRadius: 12,
                    padding: 16,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#f9fafb' }}>{team.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {team.teamType?.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <Badge
                        label={team.status}
                        color={STATUS_COLORS[team.status] || '#6b7280'}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span>👥 {team.membersCount || 4} members</span>
                      {team.contactPhone && <span>📞 {team.contactPhone}</span>}
                      {team.zone && <span>📍 Zone: {team.zone?.name || '—'}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* Zones */}
        {tab === 'Zones' && (
          <SectionCard title={`Disaster Zones (${zones.length})`} icon="🗺️">
            {loading ? (
              <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {zones.map((zone) => (
                  <div key={zone._id} style={{
                    background: '#0f172a',
                    border: `1px solid ${zone.color || '#374151'}66`,
                    borderLeft: `4px solid ${zone.color || '#374151'}`,
                    borderRadius: 10,
                    padding: 14,
                  }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#f9fafb' }}>{zone.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>Code: {zone.code}</p>
                    {zone.description && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9ca3af' }}>{zone.description}</p>
                    )}
                  </div>
                ))}
                {zones.length === 0 && (
                  <p style={{ color: '#6b7280', fontSize: 13, gridColumn: '1/-1' }}>
                    No zones configured. Seed the database to create zones.
                  </p>
                )}
              </div>
            )}
          </SectionCard>
        )}
      </div>
    </div>
  );
}
