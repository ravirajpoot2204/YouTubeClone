const jwt = require('jsonwebtoken');
const ChatMessage = require('../models/chatMessage');
const LiveStream = require('../models/liveStream');

exports.handleSendMessage = async (socket, data, io) => {
  try {
    const { streamId, content, token, superChatAmount } = data;

    // Verify JWT
    if (!token) return socket.emit('error', { message: 'Authentication required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded._id;

    // Validate stream exists and is live
    const stream = await LiveStream.findById(streamId);
    if (!stream || !stream.isLive) {
      return socket.emit('error', { message: 'Stream is not live' });
    }

    // Create message
    const messageData = {
      streamId,
      user: userId,
      message: content,
      type: 'regular',
    };

    // If it's a superchat, add extra fields
    if (superChatAmount && superChatAmount > 0) {
      messageData.type = 'superchat';
      messageData.superChatAmount = superChatAmount;
      messageData.superChatColor = '#FF0000'; // or choose based on amount
      messageData.superChatDuration = 30; // seconds
    }

    let msg = await ChatMessage.create(messageData);
    msg = await msg.populate('user', 'name avatar');

    // Emit to the stream's room
    io.to(streamId).emit('new-message', msg);

    // If superchat, also emit a special event
    if (msg.type === 'superchat') {
      io.to(streamId).emit('superchat', msg);
    }
  } catch (err) {
    console.error('Chat socket error:', err);
    socket.emit('error', { message: 'Failed to send message' });
  }
};