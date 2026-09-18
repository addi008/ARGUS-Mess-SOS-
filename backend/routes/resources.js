/**
 * routes/resources.js
 * Resource Tagging endpoints.
 */

const express = require('express');
const router = express.Router();
const { createResourceTag, getResourceTags } = require('../controllers/resourceController');

router.post('/', createResourceTag);
router.get('/', getResourceTags);

module.exports = router;
