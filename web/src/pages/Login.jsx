// src/pages/Login.jsx
// Phase 1: Basic login page shell — wired to backend JWT auth in Phase 3.
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Phase 1: directly navigate — real API call wired in Phase 3
      // TODO (Phase 3): replace with axios.post('/api/auth/login', form)
      //   then store token: localStorage.setItem('meshsos_token', data.token)
      await new Promise(r => setTimeout(r, 600)) // simulate network delay
      // For dev convenience, accept any non-empty credentials in Phase 1
      if (form.email && form.password) {
        // Store a placeholder token so PrivateRoute lets us through
        localStorage.setItem('meshsos_token', 'dev_placeholder_token')
        localStorage.setItem('meshsos_user', JSON.stringify({ email: form.email, role: 'admin' }))
        navigate('/dashboard')
      } else {
        setError('Please enter email and password.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check backend connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🆘</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">MeshSOS</h1>
          <p className="text-gray-400 mt-1 text-sm">Command Centre Login</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-brand-800 rounded-2xl p-8 shadow-2xl border border-brand-700"
        >
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-brand-700 border border-brand-600
                         text-white placeholder-gray-500 focus:outline-none focus:ring-2
                         focus:ring-brand-accent transition"
              placeholder="coordinator@meshsos.org"
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-brand-700 border border-brand-600
                         text-white placeholder-gray-500 focus:outline-none focus:ring-2
                         focus:ring-brand-accent transition"
              placeholder="••••••••"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-brand-accent hover:bg-red-600 text-white
                       font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          MeshSOS — Disaster Response Platform · Academic Demo
        </p>
      </div>
    </div>
  )
}
