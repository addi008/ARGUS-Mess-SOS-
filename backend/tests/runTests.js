/**
 * tests/runTests.js
 * Standalone Zero-Dependency Test Runner for MeshSOS.
 */

const assert = require('assert');
const { calculateTriagePriority } = require('../utils/triage');
const {
  generatePacketSignature,
  verifyPacketSignature,
  checkGpsAnomaly,
  haversineDistanceKm,
} = require('../utils/security');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('🧪 RUNNING MESHSOS AUTOMATED VERIFICATION SUITE');
console.log('======================================================\n');

console.log('📋 1. AI NLP Triage Priority Engine');
it('assigns critical severity (score >= 8.5) to trapped survivor alerts', () => {
  const res = calculateTriagePriority('trapped', '3 people trapped under concrete rubble');
  assert(res.score >= 8.5, `Expected score >= 8.5, got ${res.score}`);
  assert.strictEqual(res.priority, 'critical');
  assert(res.flags.includes('type:trapped'));
});

it('assigns low severity to routine check-in messages', () => {
  const res = calculateTriagePriority('safe_checkin', 'I am safe and uninjured.');
  assert.strictEqual(res.score, 1);
  assert.strictEqual(res.priority, 'low');
});

it('caps priority score between 1 and 10', () => {
  const res = calculateTriagePriority('trapped', 'trapped dying bleeding heart child');
  assert(res.score <= 10 && res.score >= 1);
});

console.log('\n📋 2. Cybersecurity HMAC-SHA256 & Packet Integrity');
const samplePacket = {
  packetId: 'pkt_test_1001',
  senderId: 'device_node_alpha',
  gps: { lat: 28.6139, lng: 77.2090 },
  emergencyType: 'medical',
  deviceTimestamp: '2026-09-18T12:00:00.000Z',
};

it('generates valid 64-character SHA-256 HMAC signature', () => {
  const sig = generatePacketSignature(samplePacket);
  assert(sig && sig.length === 64);
  assert(verifyPacketSignature(samplePacket, sig) === true);
});

it('rejects tampered / modified GPS coordinates as signature mismatch', () => {
  const sig = generatePacketSignature(samplePacket);
  const tampered = { ...samplePacket, gps: { lat: 35.0, lng: 80.0 } };
  assert.strictEqual(verifyPacketSignature(tampered, sig), false);
});

console.log('\n📋 3. GPS Anomaly & Nearest Rescue Unit Engine');
it('computes accurate Haversine straight-line distance', () => {
  const dist = haversineDistanceKm(28.6139, 77.2090, 19.0760, 72.8777);
  assert(dist > 1100 && dist < 1200, `Expected ~1150km, got ${dist}`);
});

it('flags physically impossible GPS teleport velocities (> 180 km/h)', () => {
  const senderId = 'sender_teleport_demo';
  const t0 = new Date('2026-09-18T10:00:00.000Z');
  const t1 = new Date('2026-09-18T10:05:00.000Z');

  checkGpsAnomaly(senderId, { lat: 28.6139, lng: 77.2090 }, t0);
  const check = checkGpsAnomaly(senderId, { lat: 19.0760, lng: 72.8777 }, t1);
  assert.strictEqual(check.isAnomaly, true);
  assert(check.reason.includes('Impossible speed'));
});

console.log('\n======================================================');
console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
