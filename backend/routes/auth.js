/**
 * routes/auth.js
 * User authentication & management routes.
 */

const express = require('express');
const router = express.Router();
const { register, login, getMe, listUsers, updateUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('admin'), listUsers);
router.patch('/users/:id', protect, authorize('admin'), updateUser);

module.exports = router;
