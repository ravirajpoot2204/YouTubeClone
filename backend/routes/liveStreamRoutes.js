const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const liveStreamController = require('../controllers/liveStreamController');

// Start stream (generates key)
router.post('/start', authMiddleware, liveStreamController.startStream);

// Get single stream info
router.get('/:id', liveStreamController.getStreamById);

// End stream (owner only)
router.post('/:id/end', authMiddleware, liveStreamController.endStream);

// Nginx callbacks – must match the URLs in nginx.conf
router.post('/onPublish', liveStreamController.onPublish);
router.post('/onPublishDone', liveStreamController.onPublishDone);

// Optional: list active streams
// router.get('/', liveStreamController.getActiveStreams);

module.exports = router;