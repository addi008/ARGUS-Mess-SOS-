/**
 * models/RescueTeam.js
 * Mongoose schema for first responder & rescue teams (used for nearest team dispatch).
 */

const mongoose = require('mongoose');

const RescueTeamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    teamType: {
      type: String,
      enum: ['medical', 'fire_rescue', 'flood_evac', 'general_sar', 'police'],
      default: 'general_sar',
    },
    contactPhone: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['available', 'dispatched', 'busy', 'offline'],
      default: 'available',
      index: true,
    },
    currentLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    membersCount: {
      type: Number,
      default: 4,
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RescueTeam', RescueTeamSchema);
