/**
 * routes/admin.js
 * Admin panel, Analytics, Audit Log, Zones, and Rescue Teams endpoints.
 */

const express = require('express');
const router = express.Router();
const {
  getAnalytics,
  getAuditLogs,
  exportCSV,
  getZones,
  createZone,
  getRescueTeams,
  createRescueTeam,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.get('/analytics', protect, authorize('admin', 'coordinator'), getAnalytics);
router.get('/audit-logs', protect, authorize('admin'), getAuditLogs);
router.get('/export/csv', protect, authorize('admin'), exportCSV);

// Zones
router.get('/zones', getZones);
router.post('/zones', protect, authorize('admin'), createZone);

// Rescue Teams
router.get('/teams', getRescueTeams);
router.post('/teams', protect, authorize('admin'), createRescueTeam);

module.exports = router;
