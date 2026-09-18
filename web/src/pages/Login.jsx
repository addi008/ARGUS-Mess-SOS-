// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleQuickLogin(email, password) {
    setForm({ email, password });
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('meshsos_token', res.data.token);
        localStorage.setItem('meshsos_user', JSON.stringify(res.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', form);
      if (res.data.success) {
        localStorage.setItem('meshsos_token', res.data.token);
        localStorage.setItem('meshsos_user', JSON.stringify(res.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication error. Verify credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e] px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 text-4xl mb-3 shadow-lg shadow-red-500/20">
            🆘
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">MeshSOS</h1>
          <p className="text-gray-400 mt-1 text-sm">Disaster Command Centre Portal</p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#111827] rounded-2xl p-8 shadow-2xl border border-gray-800"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Sign In to Command System</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              JWT Protected
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-sm flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <p className="flex-1 text-xs leading-relaxed">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0a0f1e] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition text-sm"
              placeholder="admin@meshsos.org"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0a0f1e] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition shadow-lg shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Authenticating...' : 'Enter Command Centre'}
          </button>

          {/* Quick Demo Logins for Examiner / Viva */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3 text-center">
              Quick One-Click Demo Logins
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@meshsos.org', 'password123')}
                className="px-2 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold transition text-center"
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('coordinator@meshsos.org', 'password123')}
                className="px-2 py-2 rounded-lg bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/60 text-blue-300 text-xs font-semibold transition text-center"
              >
                🧭 Coordinator
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('viewer@meshsos.org', 'password123')}
                className="px-2 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-semibold transition text-center"
              >
                👁️ Viewer
              </button>
            </div>
          </div>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          MeshSOS — A Saviour · Disaster Response System · B.Tech Project
        </p>
      </div>
    </div>
  );
}
