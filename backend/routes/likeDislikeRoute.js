const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const likeDislikeController = require('../controllers/likeDislikeController');

// POST /api/videos/:id/like
router.post('/:id/like', authMiddleware, likeDislikeController.likeVideo);

// POST /api/videos/:id/dislike
router.post('/:id/dislike', authMiddleware, likeDislikeController.dislikeVideo);

module.exports = router;