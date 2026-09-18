/**
 * models/AuditLog.js
 * Append-only immutable log for all administrative and operational actions.
 * Essential for post-disaster accountability reporting and cybersecurity audit trails.
 */

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, required: true },
    },
    action: {
      type: String,
      required: true, // e.g. 'ASSIGN_TEAM', 'RESOLVE_INCIDENT', 'CREATE_USER', 'ANOMALY_REVIEW', 'SYNC_BATCH'
      index: true,
    },
    targetType: {
      type: String,
      required: true, // e.g. 'Incident', 'User', 'Zone', 'SOSRecord'
    },
    targetId: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
  },
  { timestamps: true }
);

// Prevent updating or deleting audit logs to maintain append-only integrity
AuditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs are append-only and cannot be updated.');
});
AuditLogSchema.pre('deleteOne', function () {
  throw new Error('Audit logs are append-only and cannot be deleted.');
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
