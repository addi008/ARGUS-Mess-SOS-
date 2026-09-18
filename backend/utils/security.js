/**
 * utils/security.js
 * Cybersecurity protection layer for MeshSOS:
 * 1. HMAC-SHA256 packet signature generation and verification.
 * 2. In-memory Rate Limiting (anti-flood/spam prevention per senderId).
 * 3. GPS "Teleport" Anomaly Detection (physical impossible velocity check).
 */

const crypto = require('crypto');

// Shared disaster mesh secret key (used for HMAC verification)
const MESH_SECRET_KEY = process.env.MESH_HMAC_SECRET || 'meshsos_disaster_protocol_hmac_secret_2026';

/**
 * Computes an HMAC-SHA256 digest of packet payload
 * @param {object} packetPayload
 * @returns {string} hex digest
 */
function generatePacketSignature(packetPayload) {
  const normalized = JSON.stringify({
    packetId: packetPayload.packetId,
    senderId: packetPayload.senderId,
    gps: packetPayload.gps ? { lat: Number(packetPayload.gps.lat.toFixed(5)), lng: Number(packetPayload.gps.lng.toFixed(5)) } : null,
    emergencyType: packetPayload.emergencyType,
    deviceTimestamp: packetPayload.deviceTimestamp,
  });

  return crypto
    .createHmac('sha256', MESH_SECRET_KEY)
    .update(normalized)
    .digest('hex');
}

/**
 * Verifies if the incoming packet signature matches
 * @param {object} packetPayload
 * @param {string} signature
 * @returns {boolean}
 */
function verifyPacketSignature(packetPayload, signature) {
  if (!signature) return false;
  try {
    const expected = generatePacketSignature(packetPayload);
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch (err) {
    return false;
  }
}

// In-memory sliding window for senderId rate limiting
// Map<senderId, Array<timestamp>>
const senderActivityMap = new Map();
const MAX_SOS_PER_MINUTE = 5;

/**
 * Rate limit check: max N packets per minute per senderId
 * @param {string} senderId
 * @returns {boolean} true if within limit, false if rate limited (flagged)
 */
function checkRateLimit(senderId) {
  const now = Date.now();
  const windowMs = 60 * 1000;

  let timestamps = senderActivityMap.get(senderId) || [];
  // Filter out older than 1 min
  timestamps = timestamps.filter(t => now - t < windowMs);

  if (timestamps.length >= MAX_SOS_PER_MINUTE) {
    senderActivityMap.set(senderId, timestamps);
    return false; // Rate limit exceeded
  }

  timestamps.push(now);
  senderActivityMap.set(senderId, timestamps);
  return true;
}

// In-memory last known GPS tracker: Map<senderId, { lat, lng, time }>
const lastKnownLocationMap = new Map();
// Maximum physically plausible speed in km/h (e.g. 150 km/h vehicle)
const MAX_PLAUSIBLE_SPEED_KMH = 180;

/**
 * Haversine formula distance between two coordinates in kilometers
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * GPS Teleport Check: verifies if coordinate shift is physically possible
 * @param {string} senderId
 * @param {{ lat: number, lng: number }} gps
 * @param {Date|number} timestamp
 * @returns {{ isAnomaly: boolean, reason?: string, speedKmh?: number }}
 */
function checkGpsAnomaly(senderId, gps, timestamp) {
  if (!gps || !gps.lat || !gps.lng) {
    return { isAnomaly: true, reason: 'Missing GPS coordinates' };
  }

  // Bounds check (Valid Earth coordinates)
  if (gps.lat < -90 || gps.lat > 90 || gps.lng < -180 || gps.lng > 180) {
    return { isAnomaly: true, reason: 'Invalid GPS coordinates outside Earth range' };
  }

  const recordTime = new Date(timestamp).getTime();
  const lastLocation = lastKnownLocationMap.get(senderId);

  if (lastLocation) {
    const elapsedHours = (recordTime - lastLocation.time) / (1000 * 60 * 60);
    if (elapsedHours > 0 && elapsedHours < 24) {
      const distanceKm = haversineDistanceKm(
        lastLocation.lat,
        lastLocation.lng,
        gps.lat,
        gps.lng
      );
      const speedKmh = distanceKm / elapsedHours;

      if (speedKmh > MAX_PLAUSIBLE_SPEED_KMH) {
        return {
          isAnomaly: true,
          reason: `Impossible speed: traveled ${distanceKm.toFixed(1)} km in ${(elapsedHours * 60).toFixed(1)} mins (${speedKmh.toFixed(0)} km/h)`,
          speedKmh,
        };
      }
    }
  }

  // Record new last-known location
  lastKnownLocationMap.set(senderId, {
    lat: gps.lat,
    lng: gps.lng,
    time: recordTime,
  });

  return { isAnomaly: false };
}

module.exports = {
  MESH_SECRET_KEY,
  generatePacketSignature,
  verifyPacketSignature,
  checkRateLimit,
  checkGpsAnomaly,
  haversineDistanceKm,
};
