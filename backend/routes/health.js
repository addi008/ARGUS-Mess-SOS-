/**
 * routes/health.js
 * Health-check route — GET /api/health
 * Used to verify the backend is running and DB is connected.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// GET /api/health
router.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbLabels = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  res.json({
    status: 'ok',
    service: 'MeshSOS Backend',
    timestamp: new Date().toISOString(),
    database: dbLabels[dbStatus] || 'unknown',
  });
});

module.exports = router;
