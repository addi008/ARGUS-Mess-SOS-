/**
 * server.js  — MeshSOS Backend Entry Point
 *
 * Express API server with MongoDB Mongoose connection, JWT auth,
 * Socket.IO live event emission, and full ICS incident & mesh endpoints.
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const seedInitialData = require('./config/seed');

// ── Connect to MongoDB and Seed Data ───────────────────────────────────────────
connectDB().then(() => {
  seedInitialData();
});

// ── Express App Setup ─────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8081', '*'],
  credentials: true,
}));

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/health',    require('./routes/health'));
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/sos',       require('./routes/sos'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/messages',  require('./routes/messages'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/sync',      require('./routes/sync'));
app.use('/api/admin',     require('./routes/admin'));

// 404 catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── HTTP Server + Socket.IO ───────────────────────────────────────────────────
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

// Attach io instance to app so controllers can emit real-time events
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌  Dashboard/Node client connected: ${socket.id}`);

  // Allow clients to join specific room / zone channels if needed
  socket.on('join_zone', (zoneId) => {
    socket.join(`zone_${zoneId}`);
    console.log(`Socket ${socket.id} joined zone_${zoneId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌  Dashboard/Node client disconnected: ${socket.id}`);
  });
});

// ── Start Listening ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀  MeshSOS backend running on http://localhost:${PORT}`);
  console.log(`    Health check  → http://localhost:${PORT}/api/health`);
  console.log(`    Auth API      → http://localhost:${PORT}/api/auth`);
  console.log(`    SOS API       → http://localhost:${PORT}/api/sos`);
  console.log(`    Incidents API → http://localhost:${PORT}/api/incidents`);
  console.log(`    Sync Gateway  → http://localhost:${PORT}/api/sync/batch`);
});
