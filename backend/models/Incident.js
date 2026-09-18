/**
 * models/Incident.js
 * Mongoose schema for aggregate incidents managed on the Command Centre dashboard.
 */

const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema(
  {
    incidentCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    emergencyType: {
      type: String,
      enum: ['medical', 'trapped', 'fire', 'flood', 'other', 'safe_checkin', 'test'],
      default: 'other',
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['new', 'assigned', 'in_progress', 'resolved'],
      default: 'new',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    priorityScore: {
      type: Number,
      default: 5,
      min: 0,
      max: 10,
    },
    assignedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RescueTeam',
      default: null,
    },
    assignedToUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      default: null,
    },
    sosRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SOSRecord',
      },
    ],
    notes: [
      {
        author: String,
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionSummary: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Incident', IncidentSchema);
