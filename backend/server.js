/**
 * server.js  — MeshSOS Backend Entry Point
 *
 * Starts the Express API server and attaches Socket.IO.
 * Socket.IO events will be wired in Phase 3; for Phase 1 it just initialises.
 */

require('dotenv').config(); // Load .env variables FIRST

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ── Express App Setup ─────────────────────────────────────────────────────────
const app = express();

// Allow cross-origin requests from the React web app running on a different port
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Parse incoming JSON request bodies
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/health', require('./routes/health'));

// Phase 2 routes (added in next phase):
// app.use('/api/auth',      require('./routes/auth'));
// app.use('/api/sos',       require('./routes/sos'));
// app.use('/api/incidents', require('./routes/incidents'));
// app.use('/api/messages',  require('./routes/messages'));
// app.use('/api/resources', require('./routes/resources'));

// 404 catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── HTTP Server + Socket.IO ───────────────────────────────────────────────────
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

// Attach io instance to app so controllers can emit events (Phase 3+)
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌  Dashboard client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌  Dashboard client disconnected: ${socket.id}`);
  });
});

// ── Start Listening ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀  MeshSOS backend running on http://localhost:${PORT}`);
  console.log(`    Health check → http://localhost:${PORT}/api/health`);
});
