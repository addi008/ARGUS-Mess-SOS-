/**
 * controllers/resourceController.js
 * Controller for field Resource Tags (water, medical, shelter, blocked roads).
 */

const ResourceTag = require('../models/ResourceTag');

// @desc    Create a resource tag
// @route   POST /api/resources
// @access  Public / Gateway
exports.createResourceTag = async (req, res) => {
  try {
    const {
      packetId,
      senderId,
      tagType,
      description,
      gps,
      quantityOrStatus,
      hopCount,
      deviceTimestamp,
      signature,
    } = req.body;

    if (!packetId || !senderId || !tagType || !gps || gps.lat == null || gps.lng == null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required resource tag fields (packetId, senderId, tagType, gps)',
      });
    }

    // Deduplication check
    const existing = await ResourceTag.findOne({ packetId });
    if (existing) {
      return res.status(200).json({ success: true, message: 'Resource tag already recorded', data: existing });
    }

    const resourceTag = await ResourceTag.create({
      packetId,
      senderId,
      tagType,
      description: description || '',
      gps,
      quantityOrStatus: quantityOrStatus || 'Available',
      hopCount: hopCount || 0,
      deviceTimestamp: deviceTimestamp ? new Date(deviceTimestamp) : new Date(),
      signature: signature || '',
      synced: true,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new_resource_tag', resourceTag);
    }

    return res.status(201).json({ success: true, data: resourceTag });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get all resource tags with filtering
// @route   GET /api/resources
// @access  Private / Public
exports.getResourceTags = async (req, res) => {
  try {
    const { tagType, limit = 100 } = req.query;
    const query = {};

    if (tagType) query.tagType = tagType;

    const tags = await ResourceTag.find(query)
      .sort({ deviceTimestamp: -1 })
      .limit(parseInt(limit, 10));

    return res.status(200).json({ success: true, count: tags.length, data: tags });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
