/**
 * src/mesh/meshTransport.js
 * ─────────────────────────────────────────────────────────────────────────────
 * PUBLIC INTERFACE for the MeshSOS mesh transport layer.
 *
 * This module exposes four functions that the rest of the app uses:
 *   - init(deviceId)          — set up the transport for this device
 *   - broadcast(packet)       — send a packet to all nearby mesh nodes
 *   - onMessage(callback)     — register a handler for incoming packets
 *   - getNearbyNodes()        — return the list of currently known peers
 *
 * TRANSPORT BACKENDS (pluggable):
 *   The MESH_TRANSPORT config flag selects which backend is loaded:
 *     'simulated' → simulatedTransport.js  (WiFi + Socket.IO relay — default)
 *     'real'      → realTransport.js        (Bridgefy BLE SDK — swap in later)
 *
 * ─── HOW TO SWAP IN REAL BLE ─────────────────────────────────────────────────
 * 1. Install the Bridgefy SDK (or any BLE mesh SDK) as a native module.
 * 2. Create src/mesh/realTransport.js implementing the same four functions.
 * 3. Set MESH_TRANSPORT = 'real' in src/config.js (or in app.json extras).
 * That is the ONLY change needed — all SOS, relay, and sync logic above this
 * layer is transport-agnostic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { MESH_TRANSPORT } from '../config';

// Dynamically select the transport backend based on config
let transport;

if (MESH_TRANSPORT === 'real') {
  // Phase 1+: real BLE transport — not implemented yet
  // Uncomment when realTransport.js is ready:
  // transport = require('./realTransport');
  console.warn('[meshTransport] Real transport not yet implemented — falling back to simulated.');
  transport = require('./simulatedTransport');
} else {
  // Default: simulated transport over local WiFi Socket.IO relay
  transport = require('./simulatedTransport');
}

/**
 * Initialize the transport for this device.
 * Must be called once, before broadcast() or onMessage().
 *
 * @param {string} deviceId  Unique identifier for this device (UUID).
 */
export function init(deviceId) {
  return transport.init(deviceId);
}

/**
 * Broadcast a packet to all nearby mesh nodes.
 * The transport layer handles relaying; callers don't need to know the topology.
 *
 * @param {object} packet  Must include: { id, type, senderId, ttl, hopCount, ... }
 */
export function broadcast(packet) {
  return transport.broadcast(packet);
}

/**
 * Register a callback to receive incoming packets from nearby nodes.
 * The callback is called once per unique packet (transport handles deduplication
 * at the socket level; the relay layer deduplicates by packet.id in Phase 2).
 *
 * @param {function} callback  Called with (packet) for each received packet.
 */
export function onMessage(callback) {
  return transport.onMessage(callback);
}

/**
 * Return an array of currently known nearby nodes.
 *
 * @returns {Promise<Array<{deviceId: string}>>}
 */
export function getNearbyNodes() {
  return transport.getNearbyNodes();
}

/**
 * Disconnect from the transport (e.g. on app background/close).
 */
export function disconnect() {
  if (transport.disconnect) return transport.disconnect();
}
