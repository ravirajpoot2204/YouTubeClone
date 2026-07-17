const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Channel = require('../models/channel');

// Temporary admin check (replace with real admin guard later)
const adminOnly = (req, res, next) => {
  // For now, allow anyone logged in. You can check req.user.isAdmin later.
  next();
};

// PUT /api/admin/verify-channel-upi/:channelId
router.put('/verify-channel-upi/:channelId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });

    channel.upiVerified = true;
    channel.upiVerificationUtr = null;   // clear UTR after approval
    await channel.save();

    res.json({ success: true, message: 'UPI ID verified' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;