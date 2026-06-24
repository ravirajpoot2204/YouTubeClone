const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const commentController = require('../controllers/commentController');

// GET /api/comments/video/:videoId
router.get('/video/:videoId', commentController.getCommentsByVideoId);

// POST /api/comments/video/:videoId
router.post('/video/:videoId', authMiddleware, commentController.postComment);

// PUT /api/comments/:commentId
router.put('/:commentId', authMiddleware, commentController.updateComment);

// DELETE /api/comments/:commentId
router.delete('/:commentId', authMiddleware, commentController.deleteComment);

// (Optional) Like comment – not implemented yet, so commented out
// router.post('/:commentId/like', authMiddleware, commentController.likeComment);

module.exports = router;