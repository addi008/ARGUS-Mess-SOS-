/**
 * models/Zone.js
 * Mongoose schema for geographic response zones (drawn with leaflet-draw).
 */

const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Zone name is required'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#ef4444', // Red / amber / blue
    },
    polygon: {
      type: {
        type: String,
        enum: ['Polygon'],
        default: 'Polygon',
      },
      // Array of coordinate pairs [[lng, lat], [lng, lat], ...]
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    assignedTeams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RescueTeam',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Zone', ZoneSchema);
