/**
 * src/mesh/simulatedTransport.js
 * ─────────────────────────────────────────────────────────────────────────────
 * SIMULATED mesh transport — implements the meshTransport interface using a
 * Socket.IO relay server (meshRelay.js in /backend) over local WiFi.
 *
 * How the simulation works:
 *   1. Each device connects to the relay server as a "node".
 *   2. broadcast(packet) → emits 'broadcast_packet' to the relay.
 *   3. Relay re-emits the packet to all OTHER connected sockets.
 *   4. Receiving devices call their onMessage callbacks.
 *   5. Multi-hop: each receiver checks packet.ttl. If ttl > 0, it decrements
 *      ttl and hopCount++ then re-broadcasts — simulating packets hopping
 *      through intermediate devices before reaching the coordinator.
 *
 * ─── WHERE REAL BLE WOULD REPLACE THIS ──────────────────────────────────────
 * Replace this entire file with src/mesh/realTransport.js that calls the
 * Bridgefy (or similar BLE SDK) API. The init/broadcast/onMessage/getNearbyNodes
 * function signatures stay exactly the same.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Config: set MESH_RELAY_URL in src/config.js to point to the relay server's
 * LAN IP and port (e.g. 'http://192.168.1.10:5001').
 */

import { io } from 'socket.io-client';
import { MESH_RELAY_URL, MAX_HOP_COUNT } from '../config';

// ── Module state ─────────────────────────────────────────────────────────────
let socket = null;
let myDeviceId = null;
let messageCallbacks = [];   // list of registered onMessage listeners
let nearbyNodes = [];        // list of known peer nodes
const seenPacketIds = new Set(); // deduplicate packets at transport level

// ── init ─────────────────────────────────────────────────────────────────────
/**
 * Connect to the mesh relay server and register this device.
 * @param {string} deviceId  UUID identifying this device on the mesh.
 */
export function init(deviceId) {
  myDeviceId = deviceId;

  console.log(`[SimMesh] Connecting to relay at ${MESH_RELAY_URL} as ${deviceId}`);

  socket = io(MESH_RELAY_URL, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  // ── Socket event handlers ─────────────────────────────────────────────────

  socket.on('connect', () => {
    console.log('[SimMesh] Connected to relay. Registering device...');
    socket.emit('register', { deviceId });
  });

  socket.on('registered', ({ peerCount }) => {
    console.log(`[SimMesh] Registered. Current peers on relay: ${peerCount}`);
  });

  socket.on('peer_joined', ({ deviceId: peerId }) => {
    console.log(`[SimMesh] Peer joined: ${peerId}`);
    if (!nearbyNodes.find(n => n.deviceId === peerId)) {
      nearbyNodes.push({ deviceId: peerId });
    }
  });

  socket.on('peer_left', ({ deviceId: peerId }) => {
    console.log(`[SimMesh] Peer left: ${peerId}`);
    nearbyNodes = nearbyNodes.filter(n => n.deviceId !== peerId);
  });

  // Incoming packet from relay
  socket.on('incoming_packet', (packet) => {
    // Ignore if we've already seen this packet (prevents infinite relay loops)
    if (seenPacketIds.has(packet.id)) return;
    seenPacketIds.add(packet.id);

    console.log(
      `[SimMesh] Received packet [${packet.id}] type=${packet.type}` +
      ` ttl=${packet.ttl} hop=${packet.hopCount} from=${packet.senderId}`
    );

    // ── Deliver to all registered message handlers ────────────────────────
    messageCallbacks.forEach(cb => cb(packet));

    // ── Multi-hop relay ───────────────────────────────────────────────────
    // If this packet still has TTL remaining, this device re-broadcasts it
    // as if it were a hop in a real BLE mesh (decrement ttl, increment hop).
    if (packet.ttl > 0 && packet.hopCount < MAX_HOP_COUNT) {
      const relayedPacket = {
        ...packet,
        ttl: packet.ttl - 1,
        hopCount: packet.hopCount + 1,
        relayedBy: myDeviceId, // track which device relayed this hop
      };
      console.log(`[SimMesh] Relaying packet [${packet.id}] hop=${relayedPacket.hopCount}`);
      socket.emit('broadcast_packet', relayedPacket);
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[SimMesh] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[SimMesh] Disconnected from relay:', reason);
  });
}

// ── broadcast ─────────────────────────────────────────────────────────────────
/**
 * Send a packet to all other nodes on the relay (simulating BLE broadcast).
 * The packet must include: { id, type, senderId, ttl, hopCount, timestamp, ... }
 */
export function broadcast(packet) {
  if (!socket || !socket.connected) {
    console.warn('[SimMesh] Cannot broadcast — not connected to relay.');
    return;
  }

  // Don't re-relay packets we originated (the relay server handles this,
  // but mark it locally too)
  seenPacketIds.add(packet.id);

  console.log(`[SimMesh] Broadcasting packet [${packet.id}] type=${packet.type}`);
  socket.emit('broadcast_packet', packet);
}

// ── onMessage ─────────────────────────────────────────────────────────────────
/**
 * Register a listener for packets received from other nodes.
 * @param {function} callback  Called with (packet) for each new packet.
 */
export function onMessage(callback) {
  messageCallbacks.push(callback);
}

// ── getNearbyNodes ─────────────────────────────────────────────────────────────
/**
 * Return the current list of known nearby nodes.
 * Also fetches a fresh list from the relay server.
 * @returns {Promise<Array<{deviceId: string}>>}
 */
export function getNearbyNodes() {
  return new Promise((resolve) => {
    if (!socket || !socket.connected) {
      resolve(nearbyNodes); // Return cached list if offline
      return;
    }
    socket.emit('get_nodes', (nodes) => {
      nearbyNodes = nodes;
      resolve(nodes);
    });
  });
}

// ── disconnect ─────────────────────────────────────────────────────────────────
export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
