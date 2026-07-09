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
// GET /api/chat/:streamId
router.get('/:streamId', async (req, res) => {
  try {
    const messages = await ChatMessage.find({
      streamId: req.params.streamId,
      isDeleted: false
    })
    .populate('user', 'name avatar')
    .sort({ createdAt: 1 })
    .limit(100);
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
module.exports = router;