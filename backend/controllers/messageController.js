/**
 * controllers/messageController.js
 * Controller for peer-to-peer and broadcast mesh text messages.
 */

const Message = require('../models/Message');

// @desc    Store a relayed or direct mesh text message
// @route   POST /api/messages
// @access  Public / Gateway
exports.createMessage = async (req, res) => {
  try {
    const { packetId, senderId, recipientId, content, gps, hopCount, deviceTimestamp, signature } = req.body;

    if (!packetId || !senderId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required message packet fields (packetId, senderId, content)',
      });
    }

    // Deduplication check
    const existing = await Message.findOne({ packetId });
    if (existing) {
      return res.status(200).json({ success: true, message: 'Message already recorded', data: existing });
    }

    const message = await Message.create({
      packetId,
      senderId,
      recipientId: recipientId || 'ALL',
      content,
      gps: gps || null,
      hopCount: hopCount || 0,
      deviceTimestamp: deviceTimestamp ? new Date(deviceTimestamp) : new Date(),
      signature: signature || '',
      synced: true,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new_message', message);
    }

    return res.status(201).json({ success: true, data: message });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get all mesh text messages
// @route   GET /api/messages
// @access  Private / Public
exports.getMessages = async (req, res) => {
  try {
    const { senderId, recipientId, limit = 100 } = req.query;
    const query = {};

    if (senderId) query.senderId = senderId;
    if (recipientId) query.recipientId = recipientId;

    const messages = await Message.find(query)
      .sort({ deviceTimestamp: -1 })
      .limit(parseInt(limit, 10));

    return res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
