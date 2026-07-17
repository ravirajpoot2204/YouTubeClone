const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const channelController = require('../controllers/channelController');
const mongoose = require('mongoose');
const Channel = require('../models/channel');

// POST /api/channels
router.post('/', authMiddleware, channelController.createChannel);

// GET /api/channels/my-channel
router.get('/my-channel', authMiddleware, channelController.getMyChannel);

// GET /api/channels/check-username/:username
router.get('/check-username/:username', channelController.checkUsernameAvailability);

// GET /api/channels/username/:username
router.get('/username/:username', channelController.getChannelByUsername);

// // GET /api/channels/:id
// router.get('/:id', channelController.getChannelById);

// Replace the current GET /:id handler with this
router.get('/:id', async (req, res) => {
   console.log('🔍 GET channel by id/username:', req.params.id);
  try {
    const { id } = req.params;
    let channel;

    // If the param looks like an ObjectId, find by ID
    if (mongoose.Types.ObjectId.isValid(id)) {
      channel = await Channel.findById(id).populate('owner', 'name avatar');
    } else {
      // Otherwise, treat as username
      channel = await Channel.findOne({ username: id }).populate('owner', 'name avatar');
    }

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    return res.json({ success: true, channel });
  } catch (err) {
    
    console.error('❌ Error getting channel:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});
// PUT /api/channels/:id
router.put('/:id', authMiddleware, channelController.updateChannel);

// POST /api/channels/:id/subscribe
router.post('/:id/subscribe', authMiddleware, channelController.subscribeChannel);

// POST /api/channels/:id/unsubscribe
router.post('/:id/unsubscribe', authMiddleware, channelController.unsubscribeChannel);

// GET /api/channels/subscriptions/list
router.get('/subscriptions/list', authMiddleware, channelController.getUserSubscriptions);

// DELETE /api/channels/:id
router.delete('/:id', authMiddleware, channelController.deleteChannel);
// PUT /api/channels/upi
// PUT /api/channels/upi - Save UPI ID
router.put('/upi', authMiddleware, async (req, res) => {
  try {
    const { upiId } = req.body;
    if (!upiId || !/^[\w.]+@[\w]+$/.test(upiId)) {
      return res.status(400).json({ success: false, message: 'Invalid UPI ID format' });
    }

    const channel = await Channel.findOneAndUpdate(
      { owner: req.user._id },
      { upiId, upiVerified: false },   // reset verification when UPI changes
      { new: true }
    );
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
    res.json({ success: true, channel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/channels/verify-upi - Submit UTR for verification
router.post('/verify-upi', authMiddleware, async (req, res) => {
  try {
    const { utr } = req.body;
    if (!utr || utr.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Please enter a valid UTR' });
    }

    const channel = await Channel.findOne({ owner: req.user._id });
    if (!channel || !channel.upiId) {
      return res.status(404).json({ success: false, message: 'Channel or UPI ID not found' });
    }

    // Save UTR for admin verification (you can store it temporarily)
    channel.upiVerificationUtr = utr;
    // You could also create a "verification request" similar to pending superchats
    await channel.save();

    res.json({ success: true, message: 'Verification request submitted. Admin will verify.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});module.exports = router;