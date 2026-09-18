# MeshSOS — System Architecture & Topology

## 1. High-Level Architecture Overview

```mermaid
graph TD
    subgraph "Offline Disaster Zone (Zero Internet / Cellular)"
        DeviceA["📱 Survivor Device A\n(Originator Node)"]
        DeviceB["📱 Intermediate Relay Node B\n(Hop 1)"]
        DeviceC["📱 Field Coordinator Device C\n(Hop 2 / Local Cache)"]
        
        DeviceA -- "P2P Mesh Broadcast\n(TTL=3, Hop=0, HMAC Signed)" --> DeviceB
        DeviceB -- "Multi-Hop Relay\n(TTL=2, Hop=1)" --> DeviceC
    end

    subgraph "Connectivity Restoration"
        DeviceC -. "Regains Internet / 4G / Satellite" .-> NetStatus["NetInfo / Network Status"]
    end

    subgraph "MeshSOS Cloud / Command Infrastructure"
        NetStatus -- "Batch Sync POST /api/sync/batch\n(Deduplication + Anomaly Check)" --> Gateway["Sync Gateway & Auth\n(Node.js / Express)"]
        
        Gateway --> SecurityLayer["🛡️ Security & Triage Engine\n• HMAC Verification\n• Rate Limiter\n• GPS Teleport Anomaly Check\n• AI NLP Triage Scoring"]
        
        SecurityLayer --> MongoDB[("🍃 MongoDB Database\n• SOSRecord\n• Incident (ICS)\n• AuditLog (Immutable)")]
        
        Gateway -- "Real-Time Push\n(new_sos, incident_update)" --> SocketServer["⚡ Socket.IO Server"]
    end

    subgraph "Disaster Command Centre"
        SocketServer --> Dashboard["💻 Command Centre Dashboard\n(React + Leaflet.js + Chart.js)"]
        Dashboard -- "PATCH /api/incidents/:id/assign\n(Haversine Nearest Team)" --> Dispatcher["🚑 Field Rescue Unit Dispatch"]
    end
```

---

## 2. Multi-Hop Packet Lifecycle & Deduplication Flow

```mermaid
sequenceDiagram
    autonumber
    actor Survivor as Survivor (Device A)
    participant Relay as Relay Node (Device B)
    participant Coordinator as Coordinator (Device C)
    participant Backend as Express API & MongoDB
    participant CommandCentre as Command Centre Dashboard

    Survivor->>Survivor: Tap SOS (Select Category + GPS + Note)
    Survivor->>Survivor: Compute HMAC-SHA256 Signature
    Survivor->>Survivor: Save to Local SQLite (synced: false)
    Survivor->>Relay: Broadcast Packet (id: sos_101, hop: 0, ttl: 3)
    
    Relay->>Relay: Check seenPacketIds (Deduplicate)
    Relay->>Relay: Save to Local SQLite
    Relay->>Coordinator: Re-broadcast (id: sos_101, hop: 1, ttl: 2)

    Coordinator->>Coordinator: Save to Local SQLite (synced: false)
    Note over Coordinator: Device C moves into WiFi / Cellular area
    Coordinator->>Backend: POST /api/sync/batch (Batch Payload)
    
    Backend->>Backend: Deduplication check by packetId
    Backend->>Backend: Check Rate Limiting & GPS Velocity
    Backend->>Backend: Verify HMAC Signature
    Backend->>Backend: NLP Triage Severity Calculation
    Backend->>Backend: Create Incident & Append AuditLog
    
    Backend-->>Coordinator: 200 OK (Mark synced: true)
    Backend->>CommandCentre: Socket.IO Emit ('new_sos')
    CommandCentre->>CommandCentre: Render Pulsing Marker on Leaflet Map
```

---

## 3. Database Schema Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ INCIDENT : "assigned to"
    USER ||--o{ AUDIT_LOG : "actor"
    ZONE ||--o{ INCIDENT : "jurisdiction"
    ZONE ||--o{ RESCUE_TEAM : "coverage"
    RESCUE_TEAM ||--o{ INCIDENT : "dispatched to"
    INCIDENT ||--|{ SOS_RECORD : "contains"
    
    USER {
        ObjectId _id
        string name
        string email
        string password
        string role "admin | coordinator | viewer"
        boolean isActive
    }

    SOS_RECORD {
        string packetId PK "Unique for deduplication"
        string senderId
        number lat
        number lng
        string emergencyType "medical | trapped | fire | flood | safe_checkin"
        string message
        number hopCount
        number priorityScore "1-10 AI Triage"
        boolean flagged "Cyber anomaly flag"
        string signature "HMAC-SHA256"
        boolean synced
    }

    INCIDENT {
        string incidentCode PK "INC-2026-0001"
        string title
        string emergencyType
        string status "new | assigned | resolved"
        string priority "critical | high | medium | low"
        ObjectId assignedTeam FK
        ObjectId zone FK
    }

    RESCUE_TEAM {
        string name
        string teamType "medical | general_sar | flood_evac"
        string status "available | dispatched | busy"
        number lat
        number lng
        string contactPhone
    }

    AUDIT_LOG {
        ObjectId _id
        object actor "name, email, role"
        string action "ASSIGN_TEAM | RESOLVE_INCIDENT | BATCH_SYNC"
        string targetType
        object details
        Date createdAt
    }
```
