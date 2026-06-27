const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const optionalAuth = require('../middleware/optionalAuth');

// Serve HLS files (master.m3u8, variant playlists, .ts segments)
// Public route – no authentication required, but user info attached if token present
router.get('/:videoId/:file', optionalAuth, (req, res) => {
  const { videoId, file } = req.params;

  // For security, only allow .m3u8 and .ts files
  const ext = path.extname(file).toLowerCase();
  if (!['.m3u8', '.ts'].includes(ext)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const filePath = path.join(__dirname, '..', 'uploads', 'hls', videoId, file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Segment not found' });
  }

  // Set correct MIME type
  if (ext === '.m3u8') {
    res.type('application/vnd.apple.mpegurl');
  } else {
    res.type('video/mp2t');
  }

  res.sendFile(filePath);
});

module.exports = router;