# PHASE_NOTES.md — MeshSOS Development Log

---

## Phase 1 — Environment Setup & Mesh Foundation
**Date completed:** September 2026  
**Status:** ✅ Complete

### What was built

| Component | Details |
|---|---|
| `/backend` | Node.js + Express scaffold with health-check route (`GET /api/health`), MongoDB connection via Mongoose, Socket.IO server initialized |
| `/web` | React + Vite + Tailwind CSS project with Login page and Dashboard placeholder, React Router v6, JWT auth guard |
| `/mobile` | Expo (React Native) app with 4-tab navigation: Home, SOS, Map, Messages |
| `meshTransport` | Pluggable interface (`init / broadcast / onMessage / getNearbyNodes`) with two backends: `simulatedTransport.js` (active) and `realTransport.js` (placeholder for Bridgefy) |
| `meshRelay.js` | Standalone Socket.IO server (`port 5001`) that relays packets between mobile devices on the same WiFi LAN |

### Mesh simulation design

```
Device A                  Relay Server (5001)              Device B
  |                              |                              |
  |--- broadcast(packet) ------->|                              |
  |                              |--- incoming_packet(packet) ->|
  |                              |                              |
  |                              |        (Device B re-relays if ttl > 0)
  |                              |<--- broadcast_packet(relayed_packet) --|
  |<-- incoming_packet(relayed) -|                              |
```

**TTL / hop-count flow:**
- Each packet starts with `ttl: 3` and `hopCount: 0`
- Each relaying device decrements `ttl` and increments `hopCount`
- A packet stops propagating when `ttl === 0` or `hopCount >= MAX_HOP_COUNT (5)`
- Packet IDs are tracked in a `Set` on each device to prevent duplicate delivery

### How to demo with 2 devices on the same WiFi

1. Find your LAN IP: `ipconfig` (Windows) → look for **IPv4 Address**
2. In `mobile/src/config.js`, set `MESH_RELAY_URL` to `http://YOUR_LAN_IP:5001`
3. Start the relay server: `cd backend && npm run mesh-relay`
4. Run Expo: `cd mobile && npx expo start`
5. Open the app on **two devices / emulators** connected to the same WiFi
6. On Device A: go to **SOS** tab → tap **SEND SOS**
7. On Device B: go to **Messages** tab → the packet should appear within ~1 second

### How to run and test Phase 1

```bash
# 1. Install dependencies for all three apps
cd MeshSOS/backend  && npm install
cd ../web           && npm install
cd ../mobile        && npm install

# 2. Set up backend environment
cd ../backend
cp .env.example .env
# Edit .env — set MONGODB_URI to your MongoDB URI

# 3. Start the backend API server (port 5000)
npm run dev

# 4. (Separate terminal) Start the mesh relay server (port 5001)
npm run mesh-relay

# 5. (Separate terminal) Start the web app (port 5173)
cd ../web && npm run dev
# Open http://localhost:5173 → Login with any email/password (Phase 1 mock)

# 6. (Separate terminal) Start the mobile app
cd ../mobile && npx expo start
# Press 'a' for Android emulator, 'i' for iOS simulator, or scan QR with Expo Go

# 7. Test health check
curl http://localhost:5000/api/health
# Expected: { "status": "ok", "database": "connected" }
```

### TODOs carried to Phase 2

- [ ] Implement Mongoose schemas: User, SOSRecord, Message, ResourceTag, Incident
- [ ] JWT auth endpoints: POST /api/auth/register, POST /api/auth/login
- [ ] REST endpoints: POST /api/sos, GET /api/sos, POST /api/message, etc.
- [ ] Mobile SOS screen: GPS via expo-location + emergency type picker
- [ ] Mobile local storage: SQLite via expo-sqlite
- [ ] Mobile packet deduplication by packet ID before re-broadcast

---

*(Phase 2 notes will be appended here after Phase 2 is complete.)*
