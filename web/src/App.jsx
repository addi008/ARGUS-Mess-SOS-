// src/App.jsx — Root component with client-side routing
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Analytics from './pages/Analytics.jsx'
import Admin from './pages/Admin.jsx'

/**
 * Simple auth guard — checks for JWT token in localStorage.
 * A user who hasn't logged in is redirected to /login.
 */
function PrivateRoute({ children }) {
  const token = localStorage.getItem('meshsos_token')
  return token ? children : <Navigate to="/login" replace />
}

/**
 * Admin-only route guard — additionally checks user role.
 */
function AdminRoute({ children }) {
  const token = localStorage.getItem('meshsos_token')
  const user = JSON.parse(localStorage.getItem('meshsos_user') || '{}')
  if (!token) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes (require JWT in localStorage) */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <Analytics />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
