/**
 * controllers/syncController.js
 * Batch Synchronization Gateway for Mobile Coordinator devices regaining connectivity.
 * Deduplicates records across packets, applies cybersecurity validation & AI triage,
 * and emits live updates to the Command Centre dashboard.
 */

const SOSRecord = require('../models/SOSRecord');
const Message = require('../models/Message');
const ResourceTag = require('../models/ResourceTag');
const Incident = require('../models/Incident');
const AuditLog = require('../models/AuditLog');
const { calculateTriagePriority } = require('../utils/triage');
const {
  verifyPacketSignature,
  checkRateLimit,
  checkGpsAnomaly,
} = require('../utils/security');

// @desc    Batch sync offline records from mobile coordinator
// @route   POST /api/sync/batch
// @access  Public / Coordinator
exports.batchSync = async (req, res) => {
  try {
    const {
      coordinatorDeviceId,
      sosRecords = [],
      messages = [],
      resourceTags = [],
    } = req.body;

    const results = {
      sos: { inserted: 0, skipped: 0, flagged: 0 },
      messages: { inserted: 0, skipped: 0 },
      resourceTags: { inserted: 0, skipped: 0 },
    };

    const io = req.app.get('io');

    // 1. Process SOS records
    for (const record of sosRecords) {
      if (!record.packetId || !record.senderId || !record.gps) {
        results.sos.skipped++;
        continue;
      }

      // Deduplication
      const existing = await SOSRecord.findOne({ packetId: record.packetId });
      if (existing) {
        results.sos.skipped++;
        continue;
      }

      let flagged = false;
      let flagReason = '';

      // Anomaly check
      const gpsCheck = checkGpsAnomaly(record.senderId, record.gps, record.deviceTimestamp);
      if (gpsCheck.isAnomaly) {
        flagged = true;
        flagReason = `GPS_ANOMALY: ${gpsCheck.reason}`;
      }

      // HMAC Verification
      if (record.signature) {
        const valid = verifyPacketSignature(record, record.signature);
        if (!valid) {
          flagged = true;
          flagReason = 'SIGNATURE_MISMATCH: Tampered or spoofed packet';
        }
      }

      const triage = calculateTriagePriority(record.emergencyType, record.message);

      const createdSOS = await SOSRecord.create({
        packetId: record.packetId,
        senderId: record.senderId,
        gps: record.gps,
        emergencyType: record.emergencyType || 'other',
        message: record.message || '',
        deviceTimestamp: record.deviceTimestamp ? new Date(record.deviceTimestamp) : new Date(),
        hopCount: record.hopCount || 0,
        synced: true,
        priorityScore: triage.score,
        flagged,
        flagReason,
        signature: record.signature || '',
      });

      let incident = null;
      if (!flagged && record.emergencyType !== 'safe_checkin') {
        const count = await Incident.countDocuments();
        const incidentCode = `INC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        incident = await Incident.create({
          incidentCode,
          title: `${(record.emergencyType || 'Emergency').toUpperCase()}: ${record.message ? record.message.substring(0, 40) + '...' : 'Mesh Alert'}`,
          emergencyType: record.emergencyType || 'other',
          location: record.gps,
          status: 'new',
          priority: triage.priority,
          priorityScore: triage.score,
          sosRecords: [createdSOS._id],
          notes: [
            {
              author: `Coordinator ${coordinatorDeviceId || 'Gateway'}`,
              content: `Synced from field mesh. Hops: ${record.hopCount || 0}. Triage: ${triage.score}/10 (${triage.priority})`,
            },
          ],
        });

        createdSOS.incident = incident._id;
        await createdSOS.save();
      }

      if (flagged) {
        results.sos.flagged++;
        if (io) io.emit('flagged_packet', { sosRecord: createdSOS, reason: flagReason });
      } else {
        results.sos.inserted++;
        if (io) io.emit('new_sos', { sosRecord: createdSOS, incident, triage });
      }
    }

    // 2. Process Messages
    for (const msg of messages) {
      if (!msg.packetId || !msg.senderId || !msg.content) {
        results.messages.skipped++;
        continue;
      }
      const existing = await Message.findOne({ packetId: msg.packetId });
      if (existing) {
        results.messages.skipped++;
        continue;
      }

      const createdMsg = await Message.create({
        packetId: msg.packetId,
        senderId: msg.senderId,
        recipientId: msg.recipientId || 'ALL',
        content: msg.content,
        gps: msg.gps || null,
        hopCount: msg.hopCount || 0,
        deviceTimestamp: msg.deviceTimestamp ? new Date(msg.deviceTimestamp) : new Date(),
        synced: true,
        signature: msg.signature || '',
      });

      results.messages.inserted++;
      if (io) io.emit('new_message', createdMsg);
    }

    // 3. Process Resource Tags
    for (const tag of resourceTags) {
      if (!tag.packetId || !tag.senderId || !tag.tagType || !tag.gps) {
        results.resourceTags.skipped++;
        continue;
      }
      const existing = await ResourceTag.findOne({ packetId: tag.packetId });
      if (existing) {
        results.resourceTags.skipped++;
        continue;
      }

      const createdTag = await ResourceTag.create({
        packetId: tag.packetId,
        senderId: tag.senderId,
        tagType: tag.tagType,
        description: tag.description || '',
        gps: tag.gps,
        quantityOrStatus: tag.quantityOrStatus || 'Available',
        hopCount: tag.hopCount || 0,
        deviceTimestamp: tag.deviceTimestamp ? new Date(tag.deviceTimestamp) : new Date(),
        synced: true,
        signature: tag.signature || '',
      });

      results.resourceTags.inserted++;
      if (io) io.emit('new_resource_tag', createdTag);
    }

    // Record audit log of sync operation
    await AuditLog.create({
      actor: {
        name: `Coordinator Device ${coordinatorDeviceId || 'Gateway'}`,
        email: 'mesh-coordinator@field.meshsos',
        role: 'coordinator',
      },
      action: 'BATCH_SYNC',
      targetType: 'SyncGateway',
      targetId: coordinatorDeviceId || 'unknown',
      details: results,
      ipAddress: req.ip || '127.0.0.1',
    }).catch(err => console.error('AuditLog error:', err.message));

    return res.status(200).json({
      success: true,
      message: 'Batch sync complete',
      results,
    });
  } catch (err) {
    console.error('Batch sync error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Server error during batch sync',
    });
  }
};
