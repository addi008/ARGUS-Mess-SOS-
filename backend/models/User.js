/**
 * models/User.js
 * Mongoose schema for platform users (command-centre staff).
 *
 * Roles:
 *   admin       — full access: user management, audit log, admin panel
 *   coordinator — can sync from mobile, view dashboard, assign teams
 *   viewer      — read-only access to the dashboard
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: ['admin', 'coordinator', 'viewer'],
      default: 'viewer',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedZones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Zone',
      }
    ],
    lastLogin: Date,
  },
  { timestamps: true }
);

// ── Pre-save hook: hash the password before saving ────────────────────────────
UserSchema.pre('save', async function (next) {
  // Only hash if the password field was modified
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare plain password against stored hash ───────────────
UserSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
