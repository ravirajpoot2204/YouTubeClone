const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const channelController = require('../controllers/channelController');

// POST /api/channels
router.post('/', authMiddleware, channelController.createChannel);

// GET /api/channels/my-channel
router.get('/my-channel', authMiddleware, channelController.getMyChannel);

// GET /api/channels/check-username/:username
router.get('/check-username/:username', channelController.checkUsernameAvailability);

// GET /api/channels/username/:username
router.get('/username/:username', channelController.getChannelByUsername);

// GET /api/channels/:id
router.get('/:id', channelController.getChannelById);

// PUT /api/channels/:id
router.put('/:id', authMiddleware, channelController.updateChannel);

// POST /api/channels/:id/subscribe
router.post('/:id/subscribe', authMiddleware, channelController.subscribeChannel);

// POST /api/channels/:id/unsubscribe
router.post('/:id/unsubscribe', authMiddleware, channelController.unsubscribeChannel);

// GET /api/channels/subscriptions/list
router.get('/subscriptions/list', authMiddleware, channelController.getUserSubscriptions);

// DELETE /api/channels/:id
router.delete('/:id', authMiddleware, channelController.deleteChannel);

module.exports = router;