# MeshSOS — REST API & WebSocket Reference

Base URL: `http://localhost:5000`

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates command centre operator and returns JWT Bearer token.
- **Body:**
  ```json
  {
    "email": "admin@meshsos.org",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "66e9a...",
      "name": "Chief Disaster Commander",
      "email": "admin@meshsos.org",
      "role": "admin"
    }
  }
  ```

### `GET /api/auth/me`
Returns profile of currently authenticated user.
- **Headers:** `Authorization: Bearer <TOKEN>`

---

## 2. SOS Distress Endpoints

### `POST /api/sos`
Receives an SOS distress signal from direct submission or mesh gateway.
- **Body:**
  ```json
  {
    "packetId": "sos_1726650000_abc12",
    "senderId": "node_survivor_99",
    "gps": { "lat": 28.6139, "lng": 77.2090 },
    "emergencyType": "trapped",
    "message": "2 people trapped on 2nd floor, concrete collapsed",
    "deviceTimestamp": "2026-09-18T12:00:00.000Z",
    "hopCount": 2,
    "signature": "3f8a9c..."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { "packetId": "sos_1726650000_abc12", "flagged": false, ... },
    "incident": { "incidentCode": "INC-2026-0001", "priority": "critical", ... },
    "triage": { "score": 9.5, "priority": "critical", "flags": ["type:trapped", "keyword:trapped"] }
  }
  ```

### `GET /api/sos`
Returns list of SOS alerts with optional filters (`status`, `emergencyType`, `flagged`).

### `GET /api/sos/flagged/queue` *(Admin only)*
Returns anomalous or spoofed packets requiring supervisor review.

### `PATCH /api/sos/:id/review` *(Admin only)*
Approves or discards a flagged security record.
- **Body:** `{ "action": "approve" | "discard", "overrideNotes": "Verified by operator" }`

---

## 3. Incident Command Endpoints

### `GET /api/incidents`
Returns list of all aggregate incidents with assigned teams and status.
- **Query Params:** `status=new|assigned|resolved`, `priority=critical|high|medium|low`

### `GET /api/incidents/:id`
Returns incident details with **AI nearest rescue team recommendations** computed via Haversine formula.

### `PATCH /api/incidents/:id/assign` *(Coordinator/Admin)*
Assigns a rescue unit to an incident.
- **Body:**
  ```json
  {
    "teamId": "66e9b...",
    "note": "Dispatch via North arterial road"
  }
  ```

### `PATCH /api/incidents/:id/resolve` *(Coordinator/Admin)*
Marks an incident as resolved and frees up assigned rescue teams.
- **Body:**
  ```json
  {
    "resolutionSummary": "Survivors safely rescued and transferred to Alpha Medical Unit."
  }
  ```

---

## 4. Mobile Sync Gateway

### `POST /api/sync/batch`
Batch uploads offline queued records from field coordinator devices upon connectivity restoration.
- **Body:**
  ```json
  {
    "coordinatorDeviceId": "coord_device_01",
    "sosRecords": [ { "packetId": "...", "gps": { "lat": 28.61, "lng": 77.20 }, ... } ],
    "messages": [ { "packetId": "...", "content": "Water supplies low", ... } ],
    "resourceTags": [ { "packetId": "...", "tagType": "water", "gps": { "lat": 28.62, "lng": 77.21 }, ... } ]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Batch sync complete",
    "results": {
      "sos": { "inserted": 3, "skipped": 1, "flagged": 0 },
      "messages": { "inserted": 2, "skipped": 0 },
      "resourceTags": { "inserted": 1, "skipped": 0 }
    }
  }
  ```

---

## 5. Admin & Analytics Endpoints

### `GET /api/admin/analytics`
Returns aggregate statistics for dashboard metrics and Chart.js breakdowns.

### `GET /api/admin/audit-logs` *(Admin only)*
Returns append-only audit trail logs for compliance.

### `GET /api/admin/export/csv` *(Admin only)*
Streams CSV export of all disaster incident records.

---

## 6. Real-Time WebSocket Events (Socket.IO)

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `new_sos` | Server ➔ Client | `{ sosRecord, incident, triage }` | Emitted when a new distress alert enters system |
| `incident_update` | Server ➔ Client | `{ type, incident, team }` | Emitted on team assignment or resolution |
| `flagged_packet` | Server ➔ Client | `{ sosRecord, reason }` | Emitted when anti-spoofing engine flags an anomaly |
| `new_resource_tag` | Server ➔ Client | `ResourceTag` | Emitted when a new field pin is broadcasted |
| `new_message` | Server ➔ Client | `Message` | Emitted for real-time mesh messaging |
