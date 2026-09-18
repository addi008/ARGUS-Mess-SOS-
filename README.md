# MeshSOS — A Saviour

> **Disaster response platform** — peer-to-peer mesh messaging when there is no internet,  
> with a real-time command-centre web dashboard.  
> **College final-year project** · B.Tech Computer Science (Cyber Security)

---

## What is MeshSOS?

MeshSOS lets survivors send SOS signals and short messages to nearby phones over a
peer-to-peer mesh (simulated Bluetooth / WiFi) when there is **no internet or cellular
connectivity**. Messages hop device-to-device until they reach a "coordinator" device
that can sync to the cloud. A web dashboard gives disaster command-centre staff a
live map view, incident management tools, and analytics.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | Node.js + Express + MongoDB + Socket.IO | MERN stack (existing skill set) |
| Web | React (Vite) + Tailwind + Leaflet.js + Chart.js | No API key / billing friction |
| Mobile | React Native (Expo) | Runs on physical Android via Expo Go without native build tooling |
| Mesh | Simulated Socket.IO relay → real BLE (Bridgefy) | Realistic for solo student demo; one-file swap to real BLE |
| Auth | JWT + bcrypt + RBAC | Industry standard |

> **Design decision note (for viva):** The original synopsis specified PostgreSQL and
> Mapbox GL JS. This implementation uses MongoDB (schema-flexible, faster to iterate)
> and Leaflet.js (free, no API key needed). The architecture and data flow are otherwise
> identical to the synopsis.

---

## Monorepo Structure

```
MeshSOS/
├── backend/              # Express API, MongoDB models, Socket.IO, mesh relay
│   ├── config/db.js
│   ├── routes/
│   ├── models/           # (Phase 2+)
│   ├── controllers/      # (Phase 2+)
│   ├── middleware/       # (Phase 2+)
│   ├── server.js         # Main API server (port 5000)
│   └── meshRelay.js      # Mesh simulation relay (port 5001)
├── web/                  # React dashboard
│   └── src/
│       ├── pages/Login.jsx
│       ├── pages/Dashboard.jsx
│       └── ...           # (Phase 3+: Map, IncidentTable, Admin)
├── mobile/               # Expo React Native app
│   └── src/
│       ├── mesh/
│       │   ├── meshTransport.js      ← PUBLIC INTERFACE (never changes)
│       │   ├── simulatedTransport.js ← Current backend
│       │   └── realTransport.js      ← BLE placeholder (swap in later)
│       ├── screens/
│       ├── navigation/
│       └── config.js
└── docs/
    └── PHASE_NOTES.md
```

---

## Setup Instructions

### Prerequisites

- Node.js ≥ 18 (LTS)
- npm ≥ 9
- MongoDB running locally **OR** a MongoDB Atlas free-tier connection string
- Expo Go app installed on your Android/iOS device (for mobile testing)

### 1. Clone and install

```bash
git clone <your-repo-url> MeshSOS
cd MeshSOS

# Install all dependencies
cd backend && npm install
cd ../web   && npm install
cd ../mobile && npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```
MONGODB_URI=mongodb://localhost:27017/meshsos   # or your Atlas URI
JWT_SECRET=your_long_random_secret_here
PORT=5000
MESH_RELAY_PORT=5001
```

Update `mobile/src/config.js` with your machine's LAN IP:
```js
export const MESH_RELAY_URL = 'http://192.168.X.X:5001'; // ← your LAN IP
export const BACKEND_URL    = 'http://192.168.X.X:5000';
```

### 3. Run all services

Open **3 separate terminals**:

```bash
# Terminal 1 — Backend API (port 5000)
cd backend && npm run dev

# Terminal 2 — Mesh relay server (port 5001)
cd backend && npm run mesh-relay

# Terminal 3 — Web dashboard (port 5173)
cd web && npm run dev
```

Open a **4th terminal** for the mobile app:
```bash
cd mobile && npx expo start
# Press 'a' for Android emulator, or scan QR code with Expo Go
```

### 4. Verify everything is running

```bash
# Health check
curl http://localhost:5000/api/health
# Expected: {"status":"ok","database":"connected"}

# Web dashboard
open http://localhost:5173
# Login with any email/password (Phase 1 uses mock auth)
```

---

## Phase Progress

| Phase | Description | Status |
|---|---|---|
| 1 | Environment + Mesh Foundation | ✅ Complete |
| 2 | SOS Packets + GPS + Offline Storage + Core API | 🔜 Next |
| 3 | Web Dashboard: Live Map + Incident Management | ⏳ Planned |
| 4 | Sync Gateway + Offline Map + Resource Tagging | ⏳ Planned |
| 5 | Admin Panel + Analytics + Security Hardening | ⏳ Planned |
| 6 | AI Triage + Nearest Team + PWA | ⏳ Planned |
| 7 | Integration Testing + Docs + Report | ⏳ Planned |

---

## Mesh Simulation — Key Point for Viva

The `meshTransport` module has a **pluggable interface**:

```
meshTransport.init(deviceId)
meshTransport.broadcast(packet)
meshTransport.onMessage(callback)
meshTransport.getNearbyNodes()
```

Currently it uses `simulatedTransport.js` — a Socket.IO relay over local WiFi that
lets 2-3 devices on the same LAN discover each other and relay packets with TTL-based
multi-hop simulation.

Swapping to real BLE (e.g. Bridgefy SDK) means **only `simulatedTransport.js` changes**
and one config flag (`MESH_TRANSPORT = 'real'` in `mobile/src/config.js`) — nothing else
in the app changes.

---

*MeshSOS · Academic Demo · Not for production use*
