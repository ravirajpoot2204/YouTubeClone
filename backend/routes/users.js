const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
// PUT /api/users/pin – Set or change the security PIN
router.put('/pin', authMiddleware, async (req, res) => {
  try {
     console.log('📌 PUT /api/users/pin hit, body:', req.body); 
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    await User.findByIdAndUpdate(req.user._id, { securityPin: hashedPin });
    res.json({ success: true, message: 'Security PIN updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/verify-pin – Verify PIN for sensitive actions (optional, we can also verify in the delete endpoint directly)
router.post('/verify-pin', authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user._id);
    if (!user.securityPin) {
      return res.status(400).json({ success: false, message: 'No security PIN set' });
    }
    const match = await bcrypt.compare(pin, user.securityPin);
    res.json({ success: true, valid: match });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// GET /api/users/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('subscribedChannels', 'name username avatar');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// backend/routes/userRoutes.js
router.get('/:userId/profile', async (req, res) => {
  const user = await User.findById(req.params.userId).select('name avatar');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ name: user.name, avatar: user.avatar });
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-googleId')
      .populate('subscribedChannels', 'name username avatar');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/me
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, avatar },
      { new: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;