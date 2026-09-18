/**
 * routes/sos.js
 * SOS distress packet endpoints.
 */

const express = require('express');
const router = express.Router();
const {
  createSOS,
  getSOSRecords,
  getSOSById,
  getFlaggedQueue,
  reviewFlaggedRecord,
} = require('../controllers/sosController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', createSOS);
router.get('/', getSOSRecords);
router.get('/flagged/queue', protect, authorize('admin'), getFlaggedQueue);
router.patch('/:id/review', protect, authorize('admin'), reviewFlaggedRecord);
router.get('/:id', getSOSById);

module.exports = router;
