/**
 * src/mesh/realTransport.js
 * ─────────────────────────────────────────────────────────────────────────────
 * REAL BLE TRANSPORT — Placeholder for Bridgefy SDK integration.
 *
 * This file is intentionally incomplete. It documents WHERE and HOW to
 * integrate a real Bluetooth Low Energy mesh SDK to replace the simulation.
 *
 * ─── INTEGRATION STEPS (Bridgefy example) ────────────────────────────────────
 * 1. Install the Bridgefy React Native SDK:
 *      npm install @bridgefy/sdk-react-native
 *      npx expo install @bridgefy/sdk-react-native
 *
 * 2. Add your Bridgefy API key to app.json extra.bridgefyApiKey and read it
 *    via expo-constants.
 *
 * 3. Implement each function below using Bridgefy.start(), Bridgefy.send(),
 *    Bridgefy.onMessageReceived callback, and Bridgefy.connectedPeers().
 *
 * 4. In src/config.js, set MESH_TRANSPORT = 'real' — that's the only code
 *    change needed in the rest of the app.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// TODO: import Bridgefy from '@bridgefy/sdk-react-native';

export function init(deviceId) {
  // TODO: Bridgefy.init({ apiKey: Constants.expoConfig.extra.bridgefyApiKey })
  // TODO: Bridgefy.start({ userId: deviceId })
  console.warn('[RealMesh] BLE transport not implemented. Use simulated for now.');
}

export function broadcast(packet) {
  // TODO: Bridgefy.send(JSON.stringify(packet), { mode: 'mesh' })
  console.warn('[RealMesh] broadcast() not implemented.');
}

export function onMessage(callback) {
  // TODO: Bridgefy.onMessageReceived((data) => callback(JSON.parse(data)))
  console.warn('[RealMesh] onMessage() not implemented.');
}

export function getNearbyNodes() {
  // TODO: return Bridgefy.connectedPeers()
  console.warn('[RealMesh] getNearbyNodes() not implemented.');
  return Promise.resolve([]);
}

export function disconnect() {
  // TODO: Bridgefy.stop()
}
