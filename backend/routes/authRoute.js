const express = require('express');
const router = express.Router();
const { authController, logoutController } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/google
router.post('/google', authController);

// POST /api/auth/logout
router.post('/logout', authMiddleware, logoutController);


router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json({ success: true, user });
});


module.exports = router;