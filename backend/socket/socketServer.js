const { Server } = require('socket.io');
const chatHandlers = require('./chatHandlers');

const setupSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);

    // Join stream room
    socket.on('join-stream', (streamId) => {
      socket.join(`stream:${streamId}`);
      console.log(`👤 ${socket.id} joined stream:${streamId}`);
      
      // Notify others
      socket.to(`stream:${streamId}`).emit('user-joined', {
        userId: socket.id,
        timestamp: new Date(),
      });
    });

    // Leave stream room
    socket.on('leave-stream', (streamId) => {
      socket.leave(`stream:${streamId}`);
      console.log(`👤 ${socket.id} left stream:${streamId}`);
    });

    // Initialize chat handlers
    chatHandlers(io, socket);

    // Disconnect
    socket.on('disconnect', () => {
      console.log('🔌 User disconnected:', socket.id);
    });
  });

  return io;
};

module.exports = setupSocketServer;