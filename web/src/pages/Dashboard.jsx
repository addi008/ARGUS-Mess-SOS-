// src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api, { API_BASE_URL } from '../utils/api';
import { createCustomMarker } from '../utils/leafletIcons';

// Helper component to center map on new active coordinates
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, map.getZoom(), { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('meshsos_user') || '{}');
  const token = localStorage.getItem('meshsos_token');

  const [activeTab, setActiveTab] = useState('operations'); // 'operations' | 'anomalies' | 'audit' | 'analytics'
  const [incidents, setIncidents] = useState([]);
  const [sosRecords, setSosRecords] = useState([]);
  const [resourceTags, setResourceTags] = useState([]);
  const [rescueTeams, setRescueTeams] = useState([]);
  const [zones, setZones] = useState([]);
  const [flaggedQueue, setFlaggedQueue] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Active Selections
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [suggestedTeams, setSuggestedTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [assignNote, setAssignNote] = useState('');

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('');

  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default Delhi coordinates
  const [isConnected, setIsConnected] = useState(false);
  const [liveToast, setLiveToast] = useState(null);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    fetchAllData();

    // ── Setup Socket.IO Live Connection ───────────────────────────────────────
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time SOS alert received
    socket.on('new_sos', (payload) => {
      const { sosRecord, incident, triage } = payload;
      setSosRecords((prev) => [sosRecord, ...prev]);

      if (incident) {
        setIncidents((prev) => [incident, ...prev]);
        setMapCenter([incident.location.lat, incident.location.lng]);
      }

      showToast(`🚨 NEW SOS ALERT: ${sosRecord.emergencyType.toUpperCase()} (Triage: ${triage?.score || '5'}/10)`);
      fetchAnalytics();
    });

    // Real-time Incident update (assigned/resolved)
    socket.on('incident_update', (payload) => {
      const { incident } = payload;
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === incident._id ? incident : inc))
      );
      showToast(`⚡ Incident ${incident.incidentCode} status updated to ${incident.status.toUpperCase()}`);
      fetchAnalytics();
    });

    // Real-time Anomaly / Flagged packet
    socket.on('flagged_packet', (payload) => {
      setFlaggedQueue((prev) => [payload.sosRecord, ...prev]);
      showToast(`🛡️ CYBERSECURITY ALERT: Anomalous packet flagged (${payload.reason})`);
    });

    // Real-time Resource tag
    socket.on('new_resource_tag', (tag) => {
      setResourceTags((prev) => [tag, ...prev]);
      showToast(`📍 Field Resource Tagged: ${tag.tagType.toUpperCase()}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  function showToast(message) {
    setLiveToast(message);
    setTimeout(() => {
      setLiveToast(null);
    }, 5000);
  }

  async function fetchAllData() {
    try {
      const [incRes, sosRes, resRes, teamRes, zoneRes] = await Promise.all([
        api.get('/api/incidents'),
        api.get('/api/sos'),
        api.get('/api/resources'),
        api.get('/api/admin/teams'),
        api.get('/api/admin/zones'),
      ]);

      if (incRes.data.success) setIncidents(incRes.data.data);
      if (sosRes.data.success) setSosRecords(sosRes.data.data);
      if (resRes.data.success) setResourceTags(resRes.data.data);
      if (teamRes.data.success) setRescueTeams(teamRes.data.data);
      if (zoneRes.data.success) setZones(zoneRes.data.data);

      if (user.role === 'admin') {
        const [flagRes, auditRes] = await Promise.all([
          api.get('/api/sos/flagged/queue'),
          api.get('/api/admin/audit-logs'),
        ]);
        if (flagRes.data.success) setFlaggedQueue(flagRes.data.data);
        if (auditRes.data.success) setAuditLogs(auditRes.data.data);
      }

      fetchAnalytics();
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }

  async function fetchAnalytics() {
    try {
      const res = await api.get('/api/admin/analytics');
      if (res.data.success) setAnalytics(res.data.data);
    } catch (err) {
      // Viewer role may not have admin analytics permissions
    }
  }

  async function handleOpenAssign(incident) {
    setSelectedIncident(incident);
    try {
      const res = await api.get(`/api/incidents/${incident._id}`);
      if (res.data.success) {
        setSuggestedTeams(res.data.suggestedTeams || []);
        if (res.data.suggestedTeams && res.data.suggestedTeams.length > 0) {
          setSelectedTeamId(res.data.suggestedTeams[0]._id);
        }
      }
    } catch (err) {
      console.error('Team suggestion error:', err);
    }
    setAssignModalOpen(true);
  }

  async function handleAssignSubmit() {
    if (!selectedIncident || !selectedTeamId) return;
    try {
      await api.patch(`/api/incidents/${selectedIncident._id}/assign`, {
        teamId: selectedTeamId,
        note: assignNote,
      });
      setAssignModalOpen(false);
      setAssignNote('');
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign team');
    }
  }

  async function handleOpenResolve(incident) {
    setSelectedIncident(incident);
    setResolveModalOpen(true);
  }

  async function handleResolveSubmit() {
    if (!selectedIncident) return;
    try {
      await api.patch(`/api/incidents/${selectedIncident._id}/resolve`, {
        resolutionSummary,
      });
      setResolveModalOpen(false);
      setResolutionSummary('');
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve incident');
    }
  }

  async function handleReviewFlagged(recordId, action) {
    try {
      await api.patch(`/api/sos/${recordId}/review`, {
        action,
        overrideNotes: `Admin review action: ${action}`,
      });
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Review failed');
    }
  }

  function handleLogout() {
    localStorage.removeItem('meshsos_token');
    localStorage.removeItem('meshsos_user');
    navigate('/login');
  }

  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && inc.emergencyType !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCode = inc.incidentCode?.toLowerCase().includes(q);
      const matchTitle = inc.title?.toLowerCase().includes(q);
      const matchType = inc.emergencyType?.toLowerCase().includes(q);
      if (!matchCode && !matchTitle && !matchType) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-gray-100 flex flex-col font-sans">
      {/* ── Top Command Bar ────────────────────────────────────────────── */}
      <header className="bg-[#111827] border-b border-gray-800 px-6 py-3.5 flex items-center justify-between shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🆘</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-lg tracking-tight">MeshSOS</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                  Command Centre
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">Peer-to-Peer Disaster Response Grid</p>
            </div>
          </div>
        </div>

        {/* Live Network Status Indicator */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
              {isConnected ? 'SOCKET.IO LIVE' : 'RECONNECTING'}
            </span>
          </div>

          <div className="flex items-center gap-3 border-l border-gray-800 pl-6 text-xs">
            <div className="text-right">
              <p className="text-white font-bold">{user.name || user.email}</p>
              <p className="text-gray-400 capitalize">{user.role || 'operator'} role</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold border border-gray-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Live Alert Toast Banner ────────────────────────────────────── */}
      {liveToast && (
        <div className="bg-red-600 text-white px-6 py-2.5 font-bold text-xs flex items-center justify-between shadow-2xl animate-bounce">
          <span>{liveToast}</span>
          <button onClick={() => setLiveToast(null)} className="text-white font-black text-sm">
            ✕
          </button>
        </div>
      )}

      {/* ── Navigation Tabs & Statistics ───────────────────────────────── */}
      <div className="bg-[#0f172a] border-b border-gray-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('operations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'operations'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800'
            }`}
          >
            🗺️ Live Operations & Incidents ({incidents.length})
          </button>

          {user.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('anomalies')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'anomalies'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800'
                }`}
              >
                🛡️ Anomaly & Anti-Spoof Queue ({flaggedQueue.length})
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'audit'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800'
                }`}
              >
                📜 Immutable Audit Log ({auditLogs.length})
              </button>
            </>
          )}
        </div>

        {/* Post-Disaster CSV Export Button */}
        {user.role === 'admin' && (
          <a
            href={`${API_BASE_URL}/api/admin/export/csv`}
            download="meshsos_incidents_export.csv"
            className="px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-xs font-bold text-gray-300 flex items-center gap-2 transition"
          >
            📥 Export CSV Data
          </a>
        )}
      </div>

      {/* ── Metric Summary Tiles ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 px-6 py-4 bg-[#0a0f1e]">
        <MetricCard
          label="Total Incidents"
          value={analytics?.summary?.totalIncidents || incidents.length}
          color="text-white"
          badge="Disaster Grid"
        />
        <MetricCard
          label="Active Red Alerts"
          value={incidents.filter((i) => i.status === 'new').length}
          color="text-red-400"
          badge="Requires Team"
        />
        <MetricCard
          label="Assigned Teams"
          value={incidents.filter((i) => i.status === 'assigned').length}
          color="text-amber-400"
          badge="En Route"
        />
        <MetricCard
          label="Resolved Today"
          value={incidents.filter((i) => i.status === 'resolved').length}
          color="text-emerald-400"
          badge="Safe"
        />
        <MetricCard
          label="Available Units"
          value={rescueTeams.filter((t) => t.status === 'available').length}
          color="text-blue-400"
          badge="Ready"
        />
        <MetricCard
          label="Avg Triage Score"
          value={`${analytics?.summary?.avgTriageScore || '7.2'}/10`}
          color="text-purple-400"
          badge="AI NLP Engine"
        />
      </div>

      {/* ── Main Operations View ───────────────────────────────────────── */}
      {activeTab === 'operations' && (
        <main className="flex-1 flex flex-col lg:flex-row gap-4 px-6 pb-6 overflow-hidden">
          {/* Left Column: Interactive Leaflet.js Map */}
          <div className="flex-1 bg-[#111827] rounded-2xl border border-gray-800 overflow-hidden flex flex-col shadow-2xl min-h-[420px]">
            <div className="px-4 py-3 bg-[#111827] border-b border-gray-800 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300 flex items-center gap-2">
                📍 Geographic Tactical Map (Leaflet.js + OpenStreetMap)
              </span>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Critical SOS
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Safe Check-In
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Rescue Team
                </span>
              </div>
            </div>

            <div className="flex-1 relative">
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%', minHeight: '400px' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapRecenter center={mapCenter} />

                {/* Render Defined Zones as Polygon Overlays */}
                {zones.map((zone) => {
                  if (zone.polygon && zone.polygon.coordinates) {
                    const positions = zone.polygon.coordinates[0].map(([lng, lat]) => [lat, lng]);
                    return (
                      <Polygon
                        key={zone._id}
                        positions={positions}
                        pathOptions={{
                          color: zone.color || '#3b82f6',
                          fillOpacity: 0.15,
                          weight: 2,
                        }}
                      />
                    );
                  }
                  return null;
                })}

                {/* Render Distress SOS Incident Markers */}
                {incidents.map((incident) => {
                  if (!incident.location || !incident.location.lat) return null;
                  const isResolved = incident.status === 'resolved';

                  return (
                    <Marker
                      key={incident._id}
                      position={[incident.location.lat, incident.location.lng]}
                      icon={createCustomMarker(incident.emergencyType, incident.priority)}
                    >
                      <Popup>
                        <div className="text-gray-900 p-1 min-w-[200px]">
                          <div className="flex items-center justify-between border-b pb-1 mb-1.5">
                            <span className="font-bold text-xs text-red-600">
                              {incident.incidentCode}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                              {incident.priority?.toUpperCase()}
                            </span>
                          </div>
                          <p className="font-bold text-sm text-gray-800">{incident.title}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Type: <strong className="capitalize">{incident.emergencyType}</strong>
                          </p>
                          <p className="text-xs text-gray-600">
                            AI Triage Score: <strong>{incident.priorityScore}/10</strong>
                          </p>
                          <p className="text-xs text-gray-600">
                            Status: <strong className="capitalize">{incident.status}</strong>
                          </p>

                          {!isResolved && (
                            <div className="mt-2.5 pt-2 border-t flex gap-1.5">
                              <button
                                onClick={() => handleOpenAssign(incident)}
                                className="flex-1 py-1 bg-blue-600 text-white font-bold text-[10px] rounded hover:bg-blue-700"
                              >
                                Assign Unit
                              </button>
                              <button
                                onClick={() => handleOpenResolve(incident)}
                                className="flex-1 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded hover:bg-emerald-700"
                              >
                                Resolve
                              </button>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Render Rescue Teams on Map */}
                {rescueTeams.map((team) => {
                  if (!team.currentLocation) return null;
                  return (
                    <Marker
                      key={team._id}
                      position={[team.currentLocation.lat, team.currentLocation.lng]}
                      icon={createCustomMarker('team')}
                    >
                      <Popup>
                        <div className="text-gray-900 p-1">
                          <p className="font-bold text-xs text-purple-700">{team.name}</p>
                          <p className="text-xs text-gray-600">Type: {team.teamType}</p>
                          <p className="text-xs text-gray-600">Status: {team.status}</p>
                          <p className="text-xs text-gray-600">Phone: {team.contactPhone}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Render Resource Pins (Water, Medical, Hazard) */}
                {resourceTags.map((res) => {
                  if (!res.gps) return null;
                  return (
                    <Marker
                      key={res._id}
                      position={[res.gps.lat, res.gps.lng]}
                      icon={createCustomMarker(res.tagType)}
                    >
                      <Popup>
                        <div className="text-gray-900 p-1">
                          <p className="font-bold text-xs text-cyan-700">📍 {res.tagType?.toUpperCase()}</p>
                          <p className="text-xs text-gray-700">{res.description}</p>
                          <p className="text-[10px] text-gray-500 mt-1">Status: {res.quantityOrStatus}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          {/* Right Column: Sortable / Filterable Incident Command Table */}
          <div className="w-full lg:w-[480px] bg-[#111827] rounded-2xl border border-gray-800 flex flex-col shadow-2xl">
            {/* Table Header & Search Filter */}
            <div className="p-4 border-b border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🚨</span> Incident Management Queue
                </h2>
                <span className="text-xs font-bold text-gray-400">
                  {filteredIncidents.length} shown
                </span>
              </div>

              {/* Search Box */}
              <input
                type="text"
                placeholder="Search incident code, type, keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0a0f1e] border border-gray-700 text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
              />

              {/* Status Filter Buttons */}
              <div className="flex gap-1.5">
                {['ALL', 'new', 'assigned', 'resolved'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                      statusFilter === st
                        ? 'bg-red-600 text-white'
                        : 'bg-[#0a0f1e] text-gray-400 hover:text-white border border-gray-800'
                    }`}
                  >
                    {st === 'ALL' ? 'All Status' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Incident Cards List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[580px]">
              {filteredIncidents.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-xs">
                  <p className="text-3xl mb-2">📡</p>
                  No incidents match the active filters.
                </div>
              ) : (
                filteredIncidents.map((incident) => {
                  const isNew = incident.status === 'new';
                  const isAssigned = incident.status === 'assigned';
                  const isResolved = incident.status === 'resolved';

                  return (
                    <div
                      key={incident._id}
                      onClick={() => {
                        if (incident.location?.lat) {
                          setMapCenter([incident.location.lat, incident.location.lng]);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition cursor-pointer ${
                        incident.priority === 'critical'
                          ? 'bg-red-950/20 border-red-800/80 hover:border-red-500'
                          : 'bg-[#0f172a] border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-white">
                            {incident.incidentCode}
                          </span>
                          <PriorityBadge priority={incident.priority} score={incident.priorityScore} />
                        </div>
                        <StatusBadge status={incident.status} />
                      </div>

                      <p className="text-xs font-semibold text-gray-200 line-clamp-2 mb-2">
                        {incident.title}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-800/80 pt-2">
                        <span>
                          📍 {incident.location?.lat?.toFixed(4)}, {incident.location?.lng?.toFixed(4)}
                        </span>
                        <span>{new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Team Assignment or Resolution Actions */}
                      <div className="mt-2.5 pt-2 border-t border-gray-800/50 flex gap-2">
                        {!isResolved && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAssign(incident);
                              }}
                              className="flex-1 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[11px] font-bold transition"
                            >
                              {isAssigned ? 'Reassign Unit' : '🚑 Assign Nearest Team'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenResolve(incident);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[11px] font-bold transition"
                            >
                              ✓ Resolve
                            </button>
                          </>
                        )}
                        {isResolved && (
                          <span className="text-[11px] text-emerald-400 font-semibold">
                            ✓ Resolved: {incident.resolutionSummary || 'Complete'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      )}

      {/* ── Cybersecurity Anomaly Queue Tab (Phase 5) ──────────────────── */}
      {activeTab === 'anomalies' && (
        <main className="flex-1 px-6 pb-6 overflow-y-auto">
          <div className="bg-[#111827] rounded-2xl border border-gray-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🛡️</span> Cybersecurity Anomaly & Anti-Spoof Queue
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Packets flagged for rate-limiting, impossible GPS teleport velocity, or HMAC signature tampering.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">
                {flaggedQueue.length} Flagged
              </span>
            </div>

            {flaggedQueue.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-sm">
                <span className="text-4xl block mb-2">✅</span>
                No security anomalies or spoofed packets detected in the mesh stream.
              </div>
            ) : (
              <div className="space-y-3">
                {flaggedQueue.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 rounded-xl bg-[#0a0f1e] border border-amber-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400 text-xs font-mono">
                          {item.packetId}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 text-[10px] font-bold border border-red-800">
                          {item.flagReason || 'SECURITY_FLAGGED'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300">{item.message || 'No description'}</p>
                      <p className="text-[11px] text-gray-500">
                        Sender: {item.senderId} · GPS: {item.gps?.lat?.toFixed(4)}, {item.gps?.lng?.toFixed(4)} · Time: {new Date(item.deviceTimestamp).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewFlagged(item._id, 'approve')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                      >
                        Approve Alert
                      </button>
                      <button
                        onClick={() => handleReviewFlagged(item._id, 'discard')}
                        className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-bold transition"
                      >
                        Discard Spam
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* ── Immutable Audit Log Tab (Phase 5) ─────────────────────────── */}
      {activeTab === 'audit' && (
        <main className="flex-1 px-6 pb-6 overflow-y-auto">
          <div className="bg-[#111827] rounded-2xl border border-gray-800 p-6 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📜</span> Append-Only Disaster Operations Audit Trail
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Cryptographic and administrative accountability log tracking all team dispatches, incident resolutions, and sync actions.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-800/30 text-gray-300">
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-white">
                        {log.actor?.name} <span className="text-gray-500 font-normal">({log.actor?.role})</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{log.targetType}</td>
                      <td className="py-3 px-4 text-gray-400 max-w-xs truncate font-sans">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* ── Assign Rescue Team Modal (With Haversine Nearest Team Suggestion) ── */}
      {assignModalOpen && selectedIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] rounded-2xl border border-gray-700 max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Assign Rescue Unit to {selectedIncident.incidentCode}
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              AI Nearest Team Recommendation calculated via Haversine Distance
            </p>

            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Select Response Unit
            </label>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {suggestedTeams.map((team) => (
                <div
                  key={team._id}
                  onClick={() => setSelectedTeamId(team._id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between text-xs ${
                    selectedTeamId === team._id
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-[#0a0f1e] border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div>
                    <p className="font-bold text-gray-200">{team.name}</p>
                    <p className="text-[11px] text-gray-500 capitalize">{team.teamType} · {team.status}</p>
                  </div>
                  <span className="font-bold text-blue-400">
                    {team.distanceKm != null ? `${team.distanceKm} km away` : 'Active'}
                  </span>
                </div>
              ))}
            </div>

            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Dispatcher Dispatch Note
            </label>
            <textarea
              rows={2}
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
              placeholder="e.g. Approach from Sector 4 North road to avoid flooded bridge..."
              className="w-full px-3 py-2 rounded-xl bg-[#0a0f1e] border border-gray-700 text-white text-xs mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setAssignModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSubmit}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve Incident Modal ────────────────────────────────────── */}
      {resolveModalOpen && selectedIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] rounded-2xl border border-gray-700 max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Mark {selectedIncident.incidentCode} as RESOLVED
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Frees up assigned rescue teams and marks the situation as safe.
            </p>

            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Resolution Summary
            </label>
            <textarea
              rows={3}
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="e.g. Survivors evacuated safely to Sector 4 relief camp by Alpha Medical Unit."
              className="w-full px-3 py-2 rounded-xl bg-[#0a0f1e] border border-gray-700 text-white text-xs mb-4 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setResolveModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveSubmit}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Supporting UI Components ──────────────────────────────────────────────────
function MetricCard({ label, value, color, badge }) {
  return (
    <div className="bg-[#111827] rounded-xl p-3.5 border border-gray-800">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-gray-400 font-semibold">{label}</span>
        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
          {badge}
        </span>
      </div>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function PriorityBadge({ priority, score }) {
  let color = 'bg-gray-800 text-gray-400 border-gray-700';
  if (priority === 'critical') color = 'bg-red-950 text-red-400 border-red-800';
  else if (priority === 'high') color = 'bg-orange-950 text-orange-400 border-orange-800';
  else if (priority === 'medium') color = 'bg-blue-950 text-blue-400 border-blue-800';
  else if (priority === 'low') color = 'bg-emerald-950 text-emerald-400 border-emerald-800';

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${color}`}>
      {priority} ({score || 5}/10)
    </span>
  );
}

function StatusBadge({ status }) {
  let color = 'bg-red-950/60 text-red-400 border-red-800/80';
  if (status === 'assigned') color = 'bg-amber-950/60 text-amber-400 border-amber-800/80';
  else if (status === 'resolved') color = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80';

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${color}`}>
      {status}
    </span>
  );
}
