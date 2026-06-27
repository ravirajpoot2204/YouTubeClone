const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const liveStreamController = require('../controllers/liveStreamController');

// POST /api/live/start
router.post('/start', authMiddleware, liveStreamController.startStream);

// GET /api/live/:id
router.get('/:id', liveStreamController.getStreamById);

// POST /api/live/:id/end
router.post('/:id/end', authMiddleware, liveStreamController.endStream);

router.post('/on-publish', liveStreamController.onPublish);
router.post('/on-publish-done', liveStreamController.onPublishDone);

// GET /api/live (active streams) — disabled for now because getActiveStreams is missing
// router.get('/', liveStreamController.getActiveStreams);

module.exports = router;