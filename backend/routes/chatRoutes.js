const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/chatMessage');

// GET /api/chat/:streamId — fetch chat history for a live stream
router.get('/:streamId', async (req, res) => {
  try {
    const messages = await ChatMessage.find({
      streamId: req.params.streamId,
      isDeleted: false,               // only non‑deleted messages
    })
      .populate('user', 'name avatar')
      .sort({ createdAt: 1 })         // oldest first
      .limit(100);                    // limit to last 100 messages

    res.json({ success: true, messages });
  } catch (err) {
    console.error('❌ Failed to fetch chat history:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;