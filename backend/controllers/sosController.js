/**
 * controllers/sosController.js
 * Controller for receiving, processing, querying, and verifying SOS distress packets.
 */

const SOSRecord = require('../models/SOSRecord');
const Incident = require('../models/Incident');
const AuditLog = require('../models/AuditLog');
const { calculateTriagePriority } = require('../utils/triage');
const {
  verifyPacketSignature,
  checkRateLimit,
  checkGpsAnomaly,
} = require('../utils/security');

// @desc    Submit an SOS distress record (from mobile mesh sync or direct API)
// @route   POST /api/sos
// @access  Public (Mesh Gateway)
exports.createSOS = async (req, res) => {
  try {
    const {
      packetId,
      senderId,
      gps,
      emergencyType,
      message,
      deviceTimestamp,
      hopCount,
      signature,
      synced = true,
    } = req.body;

    if (!packetId || !senderId || !gps || gps.lat == null || gps.lng == null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required SOS packet fields (packetId, senderId, gps)',
      });
    }

    // 1. Deduplication check: if packetId already exists in DB, return existing
    const existing = await SOSRecord.findOne({ packetId });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Packet already recorded (deduplicated)',
        data: existing,
      });
    }

    // 2. Cybersecurity checks:
    let flagged = false;
    let flagReason = '';

    // Check 2a: Rate Limiting per senderId
    const isUnderRateLimit = checkRateLimit(senderId);
    if (!isUnderRateLimit) {
      flagged = true;
      flagReason = 'RATE_LIMIT_EXCEEDED: Excessive SOS packet burst from sender';
    }

    // Check 2b: GPS Teleport anomaly check
    if (!flagged) {
      const gpsCheck = checkGpsAnomaly(senderId, gps, deviceTimestamp || Date.now());
      if (gpsCheck.isAnomaly) {
        flagged = true;
        flagReason = `GPS_ANOMALY: ${gpsCheck.reason}`;
      }
    }

    // Check 2c: HMAC signature verification (if signature provided)
    if (signature) {
      const isValidSig = verifyPacketSignature(
        {
          packetId,
          senderId,
          gps,
          emergencyType: emergencyType || 'other',
          deviceTimestamp,
        },
        signature
      );
      if (!isValidSig) {
        flagged = true;
        flagReason = 'SIGNATURE_FAILED: Cryptographic HMAC signature mismatch or spoofed packet';
      }
    }

    // 3. AI Triage Priority Scoring
    const triage = calculateTriagePriority(emergencyType, message);

    // 4. Save SOS Record
    const sosRecord = await SOSRecord.create({
      packetId,
      senderId,
      gps,
      emergencyType: emergencyType || 'other',
      message: message || '',
      deviceTimestamp: deviceTimestamp ? new Date(deviceTimestamp) : new Date(),
      hopCount: hopCount || 0,
      synced,
      priorityScore: triage.score,
      flagged,
      flagReason,
      signature: signature || '',
    });

    // 5. If NOT flagged and not safe_checkin, automatically create or link an Incident
    let incident = null;
    if (!flagged && emergencyType !== 'safe_checkin') {
      const count = await Incident.countDocuments();
      const incidentCode = `INC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      incident = await Incident.create({
        incidentCode,
        title: `${(emergencyType || 'Emergency').toUpperCase()}: ${message ? message.substring(0, 40) + '...' : 'Survivor Distress Signal'}`,
        emergencyType: emergencyType || 'other',
        location: {
          lat: gps.lat,
          lng: gps.lng,
        },
        status: 'new',
        priority: triage.priority,
        priorityScore: triage.score,
        sosRecords: [sosRecord._id],
        notes: [
          {
            author: 'MeshSOS Gateway',
            content: `Signal received via ${hopCount || 0} mesh hops. AI Triage Score: ${triage.score}/10 (${triage.priority.toUpperCase()}). Flags: ${triage.flags.join(', ')}`,
          },
        ],
      });

      sosRecord.incident = incident._id;
      await sosRecord.save();
    }

    // 6. Socket.IO Live Broadcast to connected Command Centre Web Dashboards
    const io = req.app.get('io');
    if (io) {
      if (flagged) {
        io.emit('flagged_packet', {
          sosRecord,
          reason: flagReason,
        });
      } else {
        io.emit('new_sos', {
          sosRecord,
          incident,
          triage,
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: sosRecord,
      incident,
      triage,
    });
  } catch (err) {
    console.error('Create SOS error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Server error creating SOS record',
    });
  }
};

// @desc    Get all SOS records with filtering & sorting
// @route   GET /api/sos
// @access  Private / Public
exports.getSOSRecords = async (req, res) => {
  try {
    const { status, emergencyType, flagged, limit = 100 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (emergencyType) query.emergencyType = emergencyType;
    if (flagged !== undefined) query.flagged = flagged === 'true';

    const records = await SOSRecord.find(query)
      .populate('incident')
      .sort({ deviceTimestamp: -1 })
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get single SOS record
// @route   GET /api/sos/:id
// @access  Private
exports.getSOSById = async (req, res) => {
  try {
    const record = await SOSRecord.findById(req.params.id).populate('incident');
    if (!record) {
      return res.status(404).json({ success: false, error: 'SOS record not found' });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get flagged / anomalous records ("Needs Review" queue)
// @route   GET /api/sos/flagged/queue
// @access  Private/Admin
exports.getFlaggedQueue = async (req, res) => {
  try {
    const flaggedRecords = await SOSRecord.find({ flagged: true })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: flaggedRecords.length,
      data: flaggedRecords,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Review & approve / discard a flagged record
// @route   PATCH /api/sos/:id/review
// @access  Private/Admin
exports.reviewFlaggedRecord = async (req, res) => {
  try {
    const { action, overrideNotes } = req.body; // 'approve' or 'discard'
    const record = await SOSRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    if (action === 'approve') {
      record.flagged = false;
      record.flagReason = `Manually approved by ${req.user.name}: ${overrideNotes || 'No notes'}`;
      await record.save();

      // Create incident now
      const count = await Incident.countDocuments();
      const incidentCode = `INC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      const triage = calculateTriagePriority(record.emergencyType, record.message);

      const incident = await Incident.create({
        incidentCode,
        title: `APPROVED ALERT: ${record.emergencyType.toUpperCase()}`,
        emergencyType: record.emergencyType,
        location: record.gps,
        priority: triage.priority,
        priorityScore: triage.score,
        sosRecords: [record._id],
        notes: [
          {
            author: req.user.name,
            content: `Flagged record manually reviewed and approved. Notes: ${overrideNotes || ''}`,
          },
        ],
      });

      record.incident = incident._id;
      await record.save();

      // Emit to dashboard
      const io = req.app.get('io');
      if (io) {
        io.emit('new_sos', { sosRecord: record, incident, triage });
      }
    } else {
      record.flagReason = `Discarded by ${req.user.name}: ${overrideNotes || 'Marked as false positive/spam'}`;
      await record.save();
    }

    // Audit log
    await AuditLog.create({
      actor: {
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      action: action === 'approve' ? 'APPROVE_FLAGGED_SOS' : 'DISCARD_FLAGGED_SOS',
      targetType: 'SOSRecord',
      targetId: record._id.toString(),
      details: { packetId: record.packetId, action, overrideNotes },
      ipAddress: req.ip || '127.0.0.1',
    }).catch(err => console.error('AuditLog error:', err.message));

    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
