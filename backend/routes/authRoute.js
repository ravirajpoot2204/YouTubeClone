const express = require('express');
const router = express.Router();
const { authController, logoutController } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/google
router.post('/google', authController);

// POST /api/auth/logout
router.post('/logout', authMiddleware, logoutController);

module.exports = router;