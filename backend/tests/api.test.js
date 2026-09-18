/**
 * tests/api.test.js
 * Automated Unit and Logic Test Suite for MeshSOS Core Engines.
 */

const { calculateTriagePriority } = require('../utils/triage');
const {
  generatePacketSignature,
  verifyPacketSignature,
  checkGpsAnomaly,
  haversineDistanceKm,
} = require('../utils/security');

describe('🚨 MeshSOS AI Triage Engine', () => {
  test('assigns high severity to critical keywords (trapped/rubble)', () => {
    const result = calculateTriagePriority('trapped', '3 people trapped under concrete rubble');
    expect(result.score).toBeGreaterThanOrEqual(8.5);
    expect(result.priority).toBe('critical');
    expect(result.flags).toContain('type:trapped');
  });

  test('assigns lower severity to routine check-in messages', () => {
    const result = calculateTriagePriority('safe_checkin', 'I am safe and uninjured.');
    expect(result.score).toBe(1);
    expect(result.priority).toBe('low');
  });

  test('caps priority score between 1 and 10', () => {
    const critical = calculateTriagePriority('trapped', 'trapped dying bleeding heart child');
    expect(critical.score).toBeLessThanOrEqual(10);
    expect(critical.score).toBeGreaterThanOrEqual(1);
  });
});

describe('🛡️ Cybersecurity HMAC Signature & Anti-Spoofing Layer', () => {
  const samplePacket = {
    packetId: 'pkt_test_1001',
    senderId: 'device_node_alpha',
    gps: { lat: 28.6139, lng: 77.2090 },
    emergencyType: 'medical',
    deviceTimestamp: '2026-09-18T12:00:00.000Z',
  };

  test('generates and verifies valid HMAC-SHA256 signature', () => {
    const signature = generatePacketSignature(samplePacket);
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64); // 256-bit hex digest

    const isValid = verifyPacketSignature(samplePacket, signature);
    expect(isValid).toBe(true);
  });

  test('rejects tampered packet coordinates with signature mismatch', () => {
    const signature = generatePacketSignature(samplePacket);
    const tamperedPacket = {
      ...samplePacket,
      gps: { lat: 35.0000, lng: 80.0000 }, // Spoofed location
    };

    const isValid = verifyPacketSignature(tamperedPacket, signature);
    expect(isValid).toBe(false);
  });
});

describe('🌐 GPS Anomaly & Haversine Distance Engine', () => {
  test('calculates accurate Haversine distance between coordinates', () => {
    // Delhi to Mumbai (~1150 km)
    const distance = haversineDistanceKm(28.6139, 77.2090, 19.0760, 72.8777);
    expect(distance).toBeGreaterThan(1100);
    expect(distance).toBeLessThan(1200);
  });

  test('detects physically impossible teleport velocity anomalies', () => {
    const senderId = 'sender_teleport_test';
    const t0 = new Date('2026-09-18T10:00:00.000Z');
    const t1 = new Date('2026-09-18T10:05:00.000Z'); // 5 mins later

    // First location (Delhi)
    checkGpsAnomaly(senderId, { lat: 28.6139, lng: 77.2090 }, t0);

    // Second location (Mumbai ~1150km in 5 minutes = impossible 13,800 km/h)
    const check = checkGpsAnomaly(senderId, { lat: 19.0760, lng: 72.8777 }, t1);
    expect(check.isAnomaly).toBe(true);
    expect(check.reason).toContain('Impossible speed');
  });
});
