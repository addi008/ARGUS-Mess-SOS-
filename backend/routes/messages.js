/**
 * routes/messages.js
 * Mesh text messaging endpoints.
 */

const express = require('express');
const router = express.Router();
const { createMessage, getMessages } = require('../controllers/messageController');

router.post('/', createMessage);
router.get('/', getMessages);

module.exports = router;
