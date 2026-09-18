# 🚨 MeshSOS — A Saviour (ARGUS)

<div align="center">

![MeshSOS](https://img.shields.io/badge/MeshSOS-Disaster%20Response%20Platform-red?style=for-the-badge&logo=wifi&logoColor=white)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Expo](https://img.shields.io/badge/Expo-React%20Native-000020?style=flat-square&logo=expo)](https://expo.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

> **Peer-to-peer mesh disaster response platform** — SOS signals without internet,
> with a real-time command-centre web dashboard.
> **B.Tech Computer Science (Cyber Security) · Final Year Project**

</div>

---

## 📖 Table of Contents

- [What is MeshSOS?](#-what-is-meshsos)
- [Key Features](#-key-features)
- [Tech Stack](#️-tech-stack)
- [Architecture](#️-architecture)
- [Monorepo Structure](#-monorepo-structure)
- [Setup Instructions](#-setup-instructions)
- [Running the Apps](#️-running-the-apps)
- [API Reference](#-api-reference)
- [Phase Progress](#-phase-progress)
- [Mesh Simulation — Viva Notes](#-mesh-simulation--viva-notes)
- [Security Features](#-security-features-cyber-security-angle)

---

## 🌐 What is MeshSOS?

**MeshSOS** (codename: **ARGUS**) is a dual-platform disaster-response system designed for **zero-connectivity environments** — floods, earthquakes, or any scenario where internet and cellular networks are down.

### How it works

```
[Survivor Phone A] ──BLE/WiFi Mesh──► [Relay Phone B] ──mesh──► [Coordinator Phone C]
                                                                         │
                                                            (regains internet)
                                                                         ▼
                                                         [Backend API + MongoDB]
                                                                         ▼
                                                        [Web Dashboard — Live Map]
```

1. **Mobile App** — Survivors tap SOS, attach GPS, pick emergency type (medical / trapped / fire / flood / other), and optionally add a text note. The SOS packet hops device-to-device until it reaches a coordinator.
2. **Mesh Layer** — A simulated Socket.IO relay over WiFi (pluggable: swap to real BLE/Bridgefy SDK with one config change) carries packets with TTL-based multi-hop propagation.
3. **Coordinator Sync** — When a coordinator device regains internet, it batch-uploads all locally cached SOS records (deduplication handled server-side).
4. **Web Dashboard** — Command-centre staff see live SOS pins on a Leaflet.js map, manage incidents, assign rescue teams, and view analytics — all real-time via Socket.IO.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📡 **Mesh SOS** | P2P packet relay with TTL hop-count, no internet required |
| 🗺️ **Live Map Dashboard** | Leaflet.js map with color-coded SOS markers, live Socket.IO updates |
| 🔐 **JWT Auth + RBAC** | Three roles: `admin` / `coordinator` / `viewer` |
| 🔏 **Packet Integrity** | HMAC signing on every mesh packet; tampered packets rejected and logged |
| 🚫 **Spam Filtering** | Rate-limit per `senderId`, GPS "teleport" anomaly detection, Review queue |
| 📋 **Audit Log** | Append-only log of every admin action for post-disaster accountability |
| 🔋 **Low Battery Mode** | SOS-only UI + reduced mesh relaying when battery < 15% |
| ✅ **"I'm Safe" Broadcast** | Distinct green marker, reduces false-urgency load on coordinators |
| 🤖 **AI Triage Priority** | Keyword-based NLP scoring of SOS notes; high-priority markers emphasized |
| 📍 **Nearest-Team Suggest** | Haversine distance to suggest the closest available rescue team |
| 📶 **PWA Offline Dashboard** | Service worker caches last map state for brief connectivity loss |
| 📊 **Analytics + CSV Export** | Chart.js charts — incidents over time, by type, by zone; exportable |

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Backend** | Node.js + Express + MongoDB + Socket.IO | MERN stack (existing skill set) |
| **Web Dashboard** | React (Vite) + Tailwind CSS + Leaflet.js + Chart.js | No API key / billing friction |
| **Mobile App** | React Native (Expo) | Runs on physical Android via Expo Go, no native build tooling |
| **Mesh Transport** | Simulated Socket.IO relay → real BLE (Bridgefy) | Pluggable: one-file swap to real BLE SDK |
| **Auth** | JWT + bcrypt + RBAC | Industry-standard approach |
| **Offline Storage** | SQLite (expo-sqlite) | Device-local source of truth before sync |
| **Security** | HMAC packet signing, rate limiting, audit log | Cyber Security specialization angle |

> **Design decision note (for viva):** The original synopsis specified PostgreSQL and Mapbox GL JS. This implementation uses **MongoDB** (schema-flexible, faster iteration) and **Leaflet.js** (free, no API key). The architecture and data flow are identical — this is a deliberate, documented substitution.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE APP (Expo)                         │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │SOS Screen│  │Coordinator  │  │ Offline Map  │  │Messages │ │
│  │ + GPS    │  │  Sync       │  │  + Tags      │  │ Screen  │ │
│  └────┬─────┘  └──────┬──────┘  └──────────────┘  └─────────┘ │
│       │                │                                         │
│  ┌────▼────────────────▼────────────────────────────────────┐  │
│  │              meshTransport  (PUBLIC INTERFACE)             │  │
│  │   init() │ broadcast() │ onMessage() │ getNearbyNodes()   │  │
│  └────┬──────────────────────────────────────────┬───────────┘  │
│       │  (config flag: simulated | real)          │              │
│  ┌────▼───────────────┐              ┌────────────▼──────────┐  │
│  │ simulatedTransport  │              │  realTransport (BLE)  │  │
│  │  Socket.IO relay   │              │  Bridgefy placeholder │  │
│  └────────────────────┘              └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
              │ (batch sync when internet returns)
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express + MongoDB)                    │
│  Auth │ SOS API │ Sync Endpoint │ Socket.IO │ AI Triage │ Audit  │
└──────────────────────────┬──────────────────────────────────────┘
                            │
          ┌─────────────────▼──────────────────┐
          │       WEB DASHBOARD (React/Vite)    │
          │ Live Map │ Incidents │ Admin│Analytics│
          └────────────────────────────────────┘
```

---

## 📁 Monorepo Structure

```
MeshSOS/
├── backend/
│   ├── config/db.js           # Mongoose connection
│   ├── routes/                # Auth, SOS, incidents, sync, admin
│   ├── models/                # User, SOSRecord, Message, ResourceTag, Incident, AuditLog
│   ├── controllers/           # Business logic
│   ├── middleware/            # JWT auth, RBAC, rate limiting
│   ├── server.js              # Main API server (port 5000)
│   ├── meshRelay.js           # Mesh simulation relay (port 5001)
│   └── .env.example
│
├── web/
│   └── src/
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx  # Live Leaflet map + Socket.IO
│       │   ├── Incidents.jsx  # Sortable incident table
│       │   ├── Admin.jsx      # User mgmt + analytics
│       │   └── ZoneMap.jsx    # Draw/manage zones
│       └── components/
│
├── mobile/
│   └── src/
│       ├── mesh/
│       │   ├── meshTransport.js       ← PUBLIC INTERFACE (never changes)
│       │   ├── simulatedTransport.js  ← Current WiFi relay backend
│       │   └── realTransport.js       ← BLE/Bridgefy placeholder
│       ├── screens/
│       │   ├── HomeScreen.js
│       │   ├── SOSScreen.js
│       │   ├── MapScreen.js
│       │   └── MessagesScreen.js
│       ├── navigation/
│       └── config.js          ← Set MESH_RELAY_URL + BACKEND_URL here
│
├── docs/
│   ├── PHASE_NOTES.md
│   ├── architecture.md
│   └── API_REFERENCE.md
│
├── package.json
└── README.md
```

---

## ⚡ Setup Instructions

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 18 LTS | [nodejs.org](https://nodejs.org/) |
| npm | ≥ 9 | Comes with Node |
| MongoDB | Local or Atlas | [Free tier at mongodb.com/atlas](https://mongodb.com/atlas) |
| Expo Go | Latest | Install on Android/iOS for mobile testing |

### 1. Clone the repository

```bash
git clone https://github.com/addi008/ARGUS-Mess-SOS-.git MeshSOS
cd MeshSOS
```

### 2. Install dependencies

```bash
cd backend  && npm install && cd ..
cd web      && npm install && cd ..
cd mobile   && npm install && cd ..
```

### 3. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/meshsos
# OR Atlas: mongodb+srv://<user>:<password>@cluster.mongodb.net/meshsos
JWT_SECRET=your_long_random_secret_here_min_32_chars
PORT=5000
MESH_RELAY_PORT=5001
```

### 4. Configure mobile app

Edit `mobile/src/config.js`:
```js
// Find your IP: ipconfig (Windows) / ifconfig (Mac/Linux)
export const MESH_RELAY_URL = 'http://192.168.X.X:5001'; // ← your LAN IP
export const BACKEND_URL    = 'http://192.168.X.X:5000';
export const MESH_TRANSPORT = 'simulated'; // 'simulated' | 'real'
```

> ⚠️ **All devices must be on the same WiFi network** for the mesh simulation to work.

---

## ▶️ Running the Apps

Open **4 separate terminals**:

```bash
# Terminal 1 — Backend API (port 5000)
cd backend && npm run dev

# Terminal 2 — Mesh relay server (port 5001)
cd backend && npm run mesh-relay

# Terminal 3 — Web dashboard (port 5173)
cd web && npm run dev

# Terminal 4 — Mobile app
cd mobile && npx expo start
# Press 'a' for Android emulator, or scan QR code with Expo Go
```

### Verify

```bash
curl http://localhost:5000/api/health
# Expected: {"status":"ok","database":"connected"}
```

---

## 📡 API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Register a new user |
| `POST` | `/api/auth/login` | None | Login, returns JWT |

### SOS

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/sos` | JWT | Submit an SOS record |
| `GET` | `/api/sos` | JWT | Get all SOS records |

### Incidents

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/incidents` | JWT | List all incidents |
| `PATCH` | `/api/incidents/:id` | Coordinator | Assign team / mark resolved |

### Sync

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/sync` | JWT | Batch-upload offline records (deduped by packet ID) |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/users` | Admin | List all users |
| `PATCH` | `/api/admin/users/:id` | Admin | Deactivate/update a user |
| `GET` | `/api/admin/audit-log` | Admin | View audit trail |

> Full request/response shapes: [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)

---

## 📊 Phase Progress

| Phase | Description | Status |
|---|---|---|
| **1** | Environment Setup + Mesh Foundation (Simulation Layer) | ✅ Complete |
| **2** | SOS Packets + GPS + Offline Storage + Core API | ✅ Complete |
| **3** | Web Dashboard: Live Map + Incident Management | ✅ Complete |
| **4** | Sync Gateway + Offline Map + Resource Tagging | ✅ Complete |
| **5** | Admin Panel + Analytics + Security Hardening | ✅ Complete |
| **6** | AI Triage + Nearest-Team Suggest + PWA | ✅ Complete |
| **7** | Integration Testing + Full Docs + Report Support | ✅ Complete |

---

## 📡 Mesh Simulation — Viva Notes

The `meshTransport` module exposes a **pluggable interface**:

```js
meshTransport.init(deviceId)
meshTransport.broadcast(packet)    // send to all nearby nodes
meshTransport.onMessage(callback)  // receive relayed packets
meshTransport.getNearbyNodes()
```

**Currently active:** `simulatedTransport.js` — a Socket.IO relay over LAN WiFi.
Packets carry a `ttl` (hop-count) field that decrements at each relay (max 5 hops).

**To swap to real BLE (e.g. Bridgefy):**
1. Set `MESH_TRANSPORT = 'real'` in `mobile/src/config.js`
2. Implement `realTransport.js` using the Bridgefy SDK

> **Viva key point:** Real BLE mesh networking would need 4–6 physical devices (as specified in the synopsis Phase 6). The simulation over local WiFi is what's realistic to build and demo solo — and the pluggable interface means the swap is a **contained, one-file change**.

---

## 🔐 Security Features (Cyber Security Angle)

These features tie directly to the **B.Tech Cyber Security** specialization:

### 1. End-to-End Packet Integrity (Phase 5)
Every SOS/message packet is signed with an **HMAC** before entering the mesh. The coordinator/server verifies the signature before accepting any packet.
- **Defends against:** Spoofed or spam SOS packets flooding the mesh
- Rejected packets are logged with reason code

### 2. Anomaly / Spam Filtering (Phase 5)
- **Rate limiting:** Max N SOS records per `senderId` per minute
- **GPS "teleport" check:** Flags physically impossible location jumps
- **Review queue:** Suspicious records route to "Needs Review", not the live map

### 3. RBAC Audit Log (Phase 5)
Every admin action (assign team, resolve incident, deactivate user) is written to an **append-only `AuditLog` collection** — useful for post-disaster accountability.

### 4. JWT + bcrypt Authentication
Passwords hashed with bcrypt; JWT for stateless API auth; role-based middleware for `admin` / `coordinator` / `viewer` routes.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**MeshSOS · Academic Demo · Not for production use**

Made with ❤️ for B.Tech Computer Science (Cyber Security) Final Year Project

</div>
