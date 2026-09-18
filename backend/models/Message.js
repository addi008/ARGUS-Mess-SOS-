/**
 * models/Message.js
 * Mongoose schema for short text messages relayed across the mesh network.
 */

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
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
    recipientId: {
      type: String,
      default: 'ALL', // 'ALL' for broadcast, or specific deviceId
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 500,
    },
    gps: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    hopCount: {
      type: Number,
      default: 0,
    },
    deviceTimestamp: {
      type: Date,
      required: true,
    },
    signature: {
      type: String,
      default: '',
    },
    synced: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', MessageSchema);
