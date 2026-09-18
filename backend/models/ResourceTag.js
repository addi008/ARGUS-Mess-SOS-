/**
 * models/ResourceTag.js
 * Mongoose schema for field resource pins (water, medical aid, route hazard, shelter, food).
 */

const mongoose = require('mongoose');

const ResourceTagSchema = new mongoose.Schema(
  {
    packetId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    tagType: {
      type: String,
      enum: ['water', 'medical', 'shelter', 'food', 'hazard_road', 'hazard_fire', 'hazard_flood', 'safe_zone', 'other'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: 300,
      default: '',
    },
    gps: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    quantityOrStatus: {
      type: String,
      default: 'Available',
    },
    hopCount: {
      type: Number,
      default: 0,
    },
    deviceTimestamp: {
      type: Date,
      required: true,
    },
    synced: {
      type: Boolean,
      default: false,
    },
    signature: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ResourceTag', ResourceTagSchema);
