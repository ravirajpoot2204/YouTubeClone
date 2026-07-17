const ChatMessage = require('../models/chatMessage');
const LiveStream = require('../models/liveStream');
const User = require('../models/user');
const paymentController = require('../controllers/paymentController');

// Store active slow modes per stream
const slowModes = new Map();

const chatHandlers = (io, socket) => {

  // ==================== JOIN STREAM CHAT ====================
  
  socket.on('join-stream-chat', async ({ streamId, userId }) => {
    try {
      // Join the stream's chat room
      socket.join(`stream:${streamId}`);
      
      // Update viewer count
      await LiveStream.findByIdAndUpdate(streamId, {
        $inc: { viewers: 1 }
      });
      
      // Send recent messages to the new user
      const recentMessages = await ChatMessage.find({
        streamId,
        isDeleted: false,
      })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50);

      // Send to only this socket
      socket.emit('recent-messages', recentMessages.reverse());

      // Notify others
      const user = await User.findById(userId).select('name');
      socket.to(`stream:${streamId}`).emit('user-joined-chat', {
        userId,
        userName: user?.name || 'Anonymous',
        timestamp: new Date(),
      });

      // Update viewer count to all
      const stream = await LiveStream.findById(streamId);
      io.to(`stream:${streamId}`).emit('viewer-count', stream.viewers);

    } catch (error) {
      console.error('❌ Join stream error:', error);
    }
  });

  // ==================== LEAVE STREAM CHAT ====================
  
  socket.on('leave-stream-chat', async ({ streamId }) => {
    try {
      socket.leave(`stream:${streamId}`);
      
      await LiveStream.findByIdAndUpdate(streamId, {
        $inc: { viewers: -1 }
      });

      const stream = await LiveStream.findById(streamId);
      io.to(`stream:${streamId}`).emit('viewer-count', stream.viewers);

    } catch (error) {
      console.error('❌ Leave stream error:', error);
    }
  });

  // ==================== SEND REGULAR MESSAGE ====================
  
  socket.on('send-message', async (data) => {
    try {
      const { streamId, message, userId } = data;

      // Check slow mode
      if (slowModes.has(streamId)) {
        const lastMessageTime = socket.lastMessageTime || 0;
        const slowModeSeconds = slowModes.get(streamId);
        const now = Date.now();
        
        if (now - lastMessageTime < slowModeSeconds * 1000) {
          socket.emit('chat-error', {
            message: `Slow mode is on. Wait ${slowModeSeconds} seconds between messages.`
          });
          return;
        }
        socket.lastMessageTime = now;
      }

      // Save to database
      const chatMessage = await ChatMessage.create({
        streamId,
        user: userId,
        message,
        type: 'regular',
      });

      // Populate user info
      const populatedMessage = await ChatMessage.findById(chatMessage._id)
        .populate('user', 'name avatar');

      // Broadcast to everyone in the stream
      io.to(`stream:${streamId}`).emit('new-message', populatedMessage);

    } catch (error) {
      console.error('❌ Send message error:', error);
      socket.emit('chat-error', { message: 'Failed to send message' });
    }
  });

  socket.on('send-superchat', async (data) => {
  try {
    const { streamId, message, userId, amount, color } = data;

    // Calculate earnings
    const { platformFee, creatorEarning } = paymentController.calculateEarnings(amount);
    // ^^^ You'll need to import the controller or move the function to a shared utility.

    const superChat = await ChatMessage.create({
      streamId,
      user: userId,
      message,
      type: 'superchat',
      superChatAmount: amount,
platformFee,
  creatorEarning,
  creatorUpi: upiId,   // snapshot at time of payment
  paymentStatus: 'approved', // or 'pending' for manual UPI
      superChatColor: color || '#FF0000',
      superChatDuration: amount > 10 ? 300 : 60,
    });

    const populatedSuperChat = await ChatMessage.findById(superChat._id)
      .populate('user', 'name avatar');

    io.to(`stream:${streamId}`).emit('new-superchat', populatedSuperChat);
    // ... rest of handler
     // Auto unpin after duration
      setTimeout(async () => {
        await ChatMessage.findByIdAndUpdate(superChat._id, {
          isPinned: false,
        });
        io.to(`stream:${streamId}`).emit('superchat-expired', {
          messageId: superChat._id,
        });
      }, superChat.superChatDuration * 1000);
  } catch (error) {
      console.error('❌ SuperChat error:', error);
      socket.emit('chat-error', { message: 'Failed to send super chat' });
    }
});

  // ==================== SEND SUPER CHAT ====================
  
  /*socket.on('send-superchat', async (data) => {
    try {
      const { streamId, message, userId, amount, color } = data;

      const superChat = await ChatMessage.create({
        streamId,
        user: userId,
        message,
        type: 'superchat',
        superChatAmount: amount,
        superChatColor: color || '#FF0000',
        superChatDuration: amount > 10 ? 300 : 60, // $10+ = 5min, else 1min
      });

      const populatedSuperChat = await ChatMessage.findById(superChat._id)
        .populate('user', 'name avatar');

      // Broadcast superchat to everyone
      io.to(`stream:${streamId}`).emit('new-superchat', populatedSuperChat);

      // Auto unpin after duration
      setTimeout(async () => {
        await ChatMessage.findByIdAndUpdate(superChat._id, {
          isPinned: false,
        });
        io.to(`stream:${streamId}`).emit('superchat-expired', {
          messageId: superChat._id,
        });
      }, superChat.superChatDuration * 1000);

    } catch (error) {
      console.error('❌ SuperChat error:', error);
      socket.emit('chat-error', { message: 'Failed to send super chat' });
    }
  });*/

  // ==================== DELETE MESSAGE (Moderator) ====================
  
  socket.on('delete-message', async (data) => {
    try {
      const { messageId, streamId, moderatorId } = data;

      const message = await ChatMessage.findById(messageId);
      if (!message) return;

      await message.softDelete(moderatorId);

      io.to(`stream:${streamId}`).emit('message-deleted', {
        messageId,
        deletedBy: moderatorId,
      });

    } catch (error) {
      console.error('❌ Delete message error:', error);
    }
  });

  // ==================== PIN MESSAGE ====================
  
  socket.on('pin-message', async (data) => {
    try {
      const { messageId, streamId, userId } = data;

      const message = await ChatMessage.findById(messageId);
      await message.togglePin(userId);

      const pinnedMessage = await ChatMessage.findById(messageId)
        .populate('user', 'name avatar');

      io.to(`stream:${streamId}`).emit('message-pinned', pinnedMessage);

    } catch (error) {
      console.error('❌ Pin message error:', error);
    }
  });

  // ==================== TYPING INDICATOR ====================
  
  socket.on('typing', (data) => {
    const { streamId, userName } = data;
    socket.to(`stream:${streamId}`).emit('user-typing', { userName });
  });

  socket.on('stop-typing', (data) => {
    const { streamId } = data;
    socket.to(`stream:${streamId}`).emit('user-stopped-typing');
  });

  // ==================== CLEAR CHAT (Streamer/Mod) ====================
  
  socket.on('clear-chat', async (data) => {
    const { streamId } = data;
    
    // Soft delete all messages in stream
    await ChatMessage.updateMany(
      { streamId },
      { isDeleted: true }
    );

    io.to(`stream:${streamId}`).emit('chat-cleared');
  });

  // ==================== SLOW MODE ====================
  
  socket.on('slow-mode', (data) => {
    const { streamId, seconds } = data;
    slowModes.set(streamId, seconds);
    io.to(`stream:${streamId}`).emit('slow-mode-enabled', { seconds });
  });

  socket.on('slow-mode-off', (data) => {
    const { streamId } = data;
    slowModes.delete(streamId);
    io.to(`stream:${streamId}`).emit('slow-mode-disabled');
  });

  // ==================== BAN USER FROM CHAT ====================
  
  socket.on('ban-user', async (data) => {
    const { streamId, userId } = data;
    io.to(`stream:${streamId}`).emit('user-banned', { userId });
    
    // Optionally save banned users in database
    // You can add a BannedUser model later
  });

  // ==================== DISCONNECT ====================
  
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected from chat:', socket.id);
  });
};

module.exports = chatHandlers;