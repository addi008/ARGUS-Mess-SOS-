/**
 * src/config.js — App-wide configuration constants
 *
 * Update MESH_RELAY_URL and BACKEND_URL to match the LAN IP of the machine
 * running the backend servers before running the app on a physical device.
 *
 * For emulators on the same machine:
 *   Android emulator → use 10.0.2.2 instead of localhost
 *   iOS simulator    → use localhost
 */

// ─── Transport selection ─────────────────────────────────────────────────────
// 'simulated' → Socket.IO relay over WiFi (default, works for demo/viva)
// 'real'      → Bridgefy BLE SDK (swap in after real hardware testing)
export const MESH_TRANSPORT = 'simulated';

// ─── Server URLs ─────────────────────────────────────────────────────────────
// Replace with your machine's actual LAN IP when testing on physical devices.
// Example: 'http://192.168.1.15:5001'
export const MESH_RELAY_URL = 'http://10.0.2.2:5001'; // Android emulator default
export const BACKEND_URL    = 'http://10.0.2.2:5000'; // Android emulator default

// ─── Mesh parameters ─────────────────────────────────────────────────────────
export const DEFAULT_TTL    = 3;   // Number of hops a packet can travel
export const MAX_HOP_COUNT  = 5;   // Hard cap to prevent infinite relay loops
export const PACKET_VERSION = '1'; // Protocol version field on every packet
