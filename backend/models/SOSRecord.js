/**
 * models/SOSRecord.js
 * Mongoose schema for SOS alerts received from the mesh network.
 *
 * Each SOS record represents one distress signal broadcast by a survivor.
 * Fields are designed to match the packet format used in mobile/src/mesh/.
 */

const mongoose = require('mongoose');

const SOSRecordSchema = new mongoose.Schema(
  {
    // Unique packet ID generated on the mobile device (used for deduplication)
    packetId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Device ID of the survivor who originally sent the SOS
    senderId: {
      type: String,
      required: true,
      index: true,
    },

    // GPS coordinates at time of SOS
    gps: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    // Type of emergency
    emergencyType: {
      type: String,
      enum: ['medical', 'trapped', 'fire', 'flood', 'other', 'test'],
      default: 'other',
    },

    // Optional short text note from the survivor
    message: {
      type: String,
      maxlength: 500,
      default: '',
    },

    // Status of this incident on the command-centre side
    status: {
      type: String,
      enum: ['new', 'assigned', 'resolved'],
      default: 'new',
      index: true,
    },

    // Timestamp of the original SOS (from the device clock)
    deviceTimestamp: {
      type: Date,
      required: true,
    },

    // How many mesh hops the packet took to reach a coordinator
    hopCount: {
      type: Number,
      default: 0,
    },

    // Whether this record has been synced from a coordinator device to the backend
    synced: {
      type: Boolean,
      default: false,
    },

    // Phase 5 — AI triage priority score (0-10, higher = more urgent)
    priorityScore: {
      type: Number,
      default: 5,
      min: 0,
      max: 10,
    },

    // Phase 5 — spam/anomaly detection flag
    flagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: '',
    },

    // Phase 5 — HMAC signature for packet integrity
    signature: {
      type: String,
      default: '',
    },

    // Which incident this SOS is associated with (Phase 3+)
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SOSRecord', SOSRecordSchema);
