const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/vod/generate
router.post('/generate', authMiddleware, async (req, res) => {
  // Placeholder – we'll integrate the real queue later
  res.json({ success: true, message: 'VOD generation queued (dummy)' });
});

// GET /api/vod/status/:jobId
router.get('/status/:jobId', async (req, res) => {
  res.json({ success: true, state: 'completed', progress: 100 });
});

module.exports = router;