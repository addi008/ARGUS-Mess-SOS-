/**
 * config/seed.js
 * Seeds initial demo admin, coordinator, zones, and rescue teams if database is empty.
 */

const User = require('../models/User');
const Zone = require('../models/Zone');
const RescueTeam = require('../models/RescueTeam');
const SOSRecord = require('../models/SOSRecord');
const Incident = require('../models/Incident');

async function seedInitialData() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱  Seeding initial demo users...');

      await User.create([
        {
          name: 'Chief Disaster Commander',
          email: 'admin@meshsos.org',
          password: 'password123',
          role: 'admin',
        },
        {
          name: 'Sector Field Coordinator',
          email: 'coordinator@meshsos.org',
          password: 'password123',
          role: 'coordinator',
        },
        {
          name: 'Public Situation Viewer',
          email: 'viewer@meshsos.org',
          password: 'password123',
          role: 'viewer',
        },
      ]);
      console.log('✅  Demo users created: admin@meshsos.org, coordinator@meshsos.org (Password: password123)');
    }

    const teamCount = await RescueTeam.countDocuments();
    if (teamCount === 0) {
      console.log('🌱  Seeding initial rescue teams...');
      await RescueTeam.create([
        {
          name: 'Alpha Medical Rapid Unit',
          teamType: 'medical',
          contactPhone: '+1-555-0199',
          status: 'available',
          currentLocation: { lat: 28.6139, lng: 77.2090 }, // Central Delhi coordinates
          membersCount: 5,
        },
        {
          name: 'Bravo Urban Search & Rescue',
          teamType: 'general_sar',
          contactPhone: '+1-555-0245',
          status: 'available',
          currentLocation: { lat: 28.6289, lng: 77.2180 },
          membersCount: 8,
        },
        {
          name: 'Delta Flood Evacuation Boat',
          teamType: 'flood_evac',
          contactPhone: '+1-555-0377',
          status: 'available',
          currentLocation: { lat: 28.5990, lng: 77.2300 },
          membersCount: 4,
        },
      ]);
      console.log('✅  Demo rescue teams seeded');
    }

    const zoneCount = await Zone.countDocuments();
    if (zoneCount === 0) {
      console.log('🌱  Seeding initial disaster zones...');
      await Zone.create([
        {
          name: 'Sector 4 Flood Risk Zone',
          code: 'SEC-4',
          description: 'Low-lying riverbank zone prone to flash flooding',
          color: '#3b82f6',
          polygon: {
            type: 'Polygon',
            coordinates: [
              [
                [77.2000, 28.6000],
                [77.2400, 28.6000],
                [77.2400, 28.6300],
                [77.2000, 28.6300],
                [77.2000, 28.6000],
              ],
            ],
          },
        },
      ]);
      console.log('✅  Demo zone seeded');
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

module.exports = seedInitialData;
