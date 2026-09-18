/**
 * routes/incidents.js
 * Incident Command System (ICS) endpoints.
 */

const express = require('express');
const router = express.Router();
const {
  getIncidents,
  getIncidentById,
  assignTeam,
  resolveIncident,
} = require('../controllers/incidentController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getIncidents);
router.get('/:id', getIncidentById);
router.patch('/:id/assign', protect, authorize('admin', 'coordinator'), assignTeam);
router.patch('/:id/resolve', protect, authorize('admin', 'coordinator'), resolveIncident);

module.exports = router;
