/**
 * meshRelay.js  — Simulated Mesh Transport Relay Server
 *
 * This is a lightweight Socket.IO server that acts as the "WiFi LAN" for the
 * mesh simulation. Each mobile app instance connects to this server when on
 * the same WiFi network. When one device broadcasts a packet, this server
 * forwards it to all other connected devices (simulating BLE mesh discovery).
 *
 * Multi-hop simulation: each device that receives a packet re-broadcasts it
 * via its own meshTransport module IF the packet's ttl > 0 — see mobile/src/mesh/.
 *
 * ─── WHERE REAL BLE WOULD GO ─────────────────────────────────────────────────
 * In a production deployment you would replace this entire file and the
 * Socket.IO sections in mobile/src/mesh/simulatedTransport.js with a real
 * BLE SDK (e.g. Bridgefy SDK) that handles device discovery and packet relay
 * over Bluetooth Low Energy. The meshTransport interface (init / broadcast /
 * onMessage / getNearbyNodes) stays exactly the same — only the transport
 * module underneath changes.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Run with: node meshRelay.js
 * (or via npm run mesh-relay from /backend)
 */

require('dotenv').config();

const { Server } = require('socket.io');
const http = require('http');

const RELAY_PORT = process.env.MESH_RELAY_PORT || 5001;

// Minimal HTTP server — Socket.IO rides on top of it
const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: { origin: '*' }, // All devices on the LAN are trusted in simulation mode
});

// Track connected nodes: socketId → { deviceId, joinedAt }
const nodes = {};

io.on('connection', (socket) => {
  // ── Node Registration ───────────────────────────────────────────────────────
  socket.on('register', ({ deviceId }) => {
    nodes[socket.id] = { deviceId, socketId: socket.id, joinedAt: new Date() };
    console.log(`📡  Node registered: ${deviceId} (socket ${socket.id})`);
    console.log(`    Active nodes: ${Object.keys(nodes).length}`);

    // Tell the new node about its own deviceId (ack) and current peer count
    socket.emit('registered', {
      deviceId,
      peerCount: Object.keys(nodes).length - 1,
    });

    // Notify all existing nodes that a new peer joined
    socket.broadcast.emit('peer_joined', { deviceId });
  });

  // ── Packet Relay ────────────────────────────────────────────────────────────
  // When a node broadcasts a packet, relay it to ALL other connected nodes.
  // Each receiving node's meshTransport will decide whether to re-broadcast
  // (multi-hop) by checking the packet's ttl field.
  socket.on('broadcast_packet', (packet) => {
    const sender = nodes[socket.id];
    console.log(
      `📦  Relaying packet [${packet.id}] from ${sender?.deviceId}` +
      ` | type: ${packet.type} | ttl: ${packet.ttl} | hop: ${packet.hopCount}`
    );

    // Relay to every OTHER connected socket (not the sender)
    socket.broadcast.emit('incoming_packet', packet);
  });

  // ── Nearby Nodes Query ──────────────────────────────────────────────────────
  socket.on('get_nodes', (callback) => {
    const allNodes = Object.values(nodes).filter(
      (n) => n.socketId !== socket.id
    );
    if (typeof callback === 'function') {
      callback(allNodes);
    }
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const node = nodes[socket.id];
    if (node) {
      console.log(`📡  Node disconnected: ${node.deviceId}`);
      socket.broadcast.emit('peer_left', { deviceId: node.deviceId });
      delete nodes[socket.id];
    }
  });
});

httpServer.listen(RELAY_PORT, () => {
  console.log(`📡  MeshSOS Mesh Relay Server running on port ${RELAY_PORT}`);
  console.log(`    Devices on the same WiFi should connect to ws://YOUR_IP:${RELAY_PORT}`);
  console.log(`    (Replace YOUR_IP with this machine's LAN IP address)`);
});
