const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multerConfig');
const videoController = require('../controllers/videoController');
const optionalAuth = require('../middleware/optionalAuth');
// POST /api/videos/upload
router.post('/upload', authMiddleware, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), videoController.handleUpload);

// GET /api/videos
router.get('/', videoController.getAllVideos);
router.get('/:id/suggested', videoController.getSuggestedVideosByTags);
// GET /api/videos/my-uploads (must be before /:id)
router.get('/my-uploads', authMiddleware, videoController.getMyUploadedVideos);

// GET /api/videos/:id

// ...
router.get('/:id', optionalAuth, videoController.getVideoById);

// PUT /api/videos/:id
router.put('/:id', authMiddleware, upload.single('thumbnail'), videoController.updateVideo);

// DELETE /api/videos/:id
router.delete('/:id', authMiddleware, videoController.deleteVideo);

// Additional routes your controller exports
//router.get('/suggested/:videoId', videoController.getSuggestedVideosByTags);
router.get('/channel/:username', videoController.getVideosByChannelUsername);
router.get('/:id/status', videoController.getVideoStatus);

module.exports = router;