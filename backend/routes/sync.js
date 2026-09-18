/**
 * routes/sync.js
 * Mobile Coordinator Batch Synchronization Gateway.
 */

const express = require('express');
const router = express.Router();
const { batchSync } = require('../controllers/syncController');

router.post('/batch', batchSync);

module.exports = router;
