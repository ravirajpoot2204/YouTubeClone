const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multerConfig');
const postController = require('../controllers/postController');

// POST /api/posts
router.post('/', authMiddleware, upload.single('image'), postController.createPost);

// (Other routes commented until you add the controller methods)
// router.get('/channel/:channelId', postController.getChannelPosts);
// router.post('/:postId/like', authMiddleware, postController.likePost);
// router.delete('/:postId', authMiddleware, postController.deletePost);

module.exports = router;