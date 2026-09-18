// src/pages/Dashboard.jsx
// Phase 1: Dashboard shell — map, incident table, and nav will be filled in Phase 3.
import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('meshsos_user') || '{}')

  function handleLogout() {
    localStorage.removeItem('meshsos_token')
    localStorage.removeItem('meshsos_user')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-brand-900 flex flex-col">
      {/* ── Top Nav Bar ──────────────────────────────────────────────── */}
      <header className="bg-brand-800 border-b border-brand-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🆘</span>
          <span className="text-white font-bold text-lg tracking-tight">MeshSOS</span>
          <span className="text-gray-500 text-sm ml-2">Command Centre</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-medium">LIVE</span>
          </div>
          <span className="text-gray-400 text-sm">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition px-3 py-1 rounded-lg
                       border border-brand-700 hover:border-brand-600"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center text-center p-8">
        {/* Phase placeholder */}
        <div className="max-w-xl">
          <div className="text-6xl mb-6">🗺️</div>
          <h1 className="text-2xl font-bold text-white mb-3">Dashboard Coming in Phase 3</h1>
          <p className="text-gray-400 leading-relaxed mb-6">
            The live Leaflet.js map, real-time SOS incident table, and Socket.IO
            integration will be built in <strong className="text-white">Phase 3</strong>.
            Phase 1 establishes the scaffold and routing.
          </p>

          {/* Quick status cards — Phase 1 placeholders */}
          <div className="grid grid-cols-3 gap-4 text-left">
            {[
              { label: 'Active SOS', value: '—', color: 'text-red-400' },
              { label: 'Assigned Teams', value: '—', color: 'text-amber-400' },
              { label: 'Resolved Today', value: '—', color: 'text-green-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-brand-800 rounded-xl p-4 border border-brand-700">
                <p className="text-gray-500 text-xs mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-xl bg-blue-900/30 border border-blue-800 text-blue-300 text-sm text-left">
            <p className="font-semibold mb-1">✅ Phase 1 Complete</p>
            <p>Backend health-check, web shell, mobile scaffold, and mesh simulation layer are all running. Proceed to Phase 2.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
