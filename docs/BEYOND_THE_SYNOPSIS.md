# MeshSOS — "Beyond the Synopsis" Enhancements

> **Purpose of this document:** This section documents the security hardening, triage intelligence, and operational resilience features implemented in MeshSOS that go beyond the initial project synopsis. These provide direct alignment with the **B.Tech (Computer Science – Cyber Security)** specialization for viva examination and academic reporting.

---

## 1. End-to-End Cryptographic Packet Integrity (HMAC-SHA256)
- **Problem in Traditional Mesh Networks:** In ad-hoc peer meshes, malicious actors or compromised relay nodes can inject fake SOS distress alerts, modify survivor GPS coordinates, or tamper with message contents.
- **MeshSOS Defense:** Every outgoing distress packet is cryptographically signed at generation using HMAC-SHA256 over normalized payload fields (`packetId`, `senderId`, `gps`, `timestamp`, `emergencyType`).
- **Server Verification:** When packets arrive at the sync gateway or backend API, the signature is verified using constant-time evaluation (`crypto.timingSafeEqual`). Any tampered or unsigned packet is flagged and quarantined.

---

## 2. Anti-Spoofing & Anomaly Detection Pipeline
- **Adaptive Rate Limiting:** Prevents denial-of-service (DoS) packet flooding by limiting any single `senderId` to a sliding window of max 5 SOS packets/minute.
- **Physical Velocity "GPS Teleport" Detection:** Analyzes the spatial delta ($\Delta d$) and elapsed time ($\Delta t$) between sequential transmissions from the same device. If the calculated velocity exceeds physically possible thresholds ($> 180 \text{ km/h}$), the packet is flagged as a synthetic GPS spoofing attack.
- **"Needs Review" Quarantine Queue:** Flagged packets are isolated from the live tactical map and placed into an administrator-only security queue for manual verification or discard.

---

## 3. Append-Only Immutable Audit Trail (`AuditLog`)
- **Accountability Compliance:** Post-disaster inquiries require strict non-repudiation of command actions.
- **Implementation:** Every administrative event (dispatching a rescue team, marking an incident resolved, user role modification, flagged packet review, or batch synchronization) is recorded in an append-only MongoDB collection.
- **Immutability Enforcement:** Mongoose pre-save middleware hooks explicitly throw errors if any `update` or `delete` operation is attempted on audit logs.

---

## 4. Rule-Based NLP AI Disaster Triage Engine
- **Automated Urgency Scoring:** In mass-casualty events, command centres can be overwhelmed by hundreds of alerts. MeshSOS implements a keyword and contextual severity classifier that parses survivor notes.
- **Scoring Scale (1 to 10):**
  - Category weighting (Trapped/Fire = Base 8; Medical = Base 7; Flood = Base 6).
  - Urgent keyword detection (`trapped`, `bleeding`, `infant`, `oxygen`, `rubble`, `heart`) boosts severity by $+1.5$ to $+3.0$.
- **Prioritized UI Rendering:** High-scoring incidents are visually emphasized with pulsing critical badges and sorted to the top of the operator queue.

---

## 5. Haversine Nearest-Team Auto-Dispatch
- **Optimized Response Time:** When a dispatcher selects an incident, the system computes the great-circle Haversine distance between the incident's GPS coordinates and all active rescue units.
- **Intelligent Recommendation:** Suggests the closest available unit with calculated distances in kilometers, eliminating manual map coordinate lookups during emergencies.

---

## 6. One-Tap "I'm Safe" False-Urgency Reducer
- **Resource Conservation:** Reduces false alarms and panic-induced network load by allowing unaffected individuals in disaster zones to broadcast a verified "I'm Safe" check-in.
- **Visual Segregation:** Displayed on the command centre map as green markers and tracked in separate non-emergency counters, ensuring rescue teams focus exclusively on high-priority alerts.

---

## 7. Low Battery (<15%) Power-Saving Throttle
- **Device Longevity:** React Native mobile clients monitor device battery state via `expo-battery`.
- **Automatic Power Saving:** When battery drops below 15%, the app disables non-essential background relay hops and restricts the UI to emergency SOS broadcasting to keep the device powered as long as possible.
