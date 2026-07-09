// index.js (updated - minimal changes)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
//const { createWorker } = require('./webRTC/mediasoupServer');
//const socketHandlers = require('./webRTC/socketHandlers');
//const { ExpressAdapter } = require('@bull-board/express');
//const { createBullBoard } = require('@bull-board/api');
//const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
//const uploadQueue = require('./queues/uploadQueue'); // ✅ Path to your BullMQ queue
const hlsRoutes = require('./routes/hlsRoutes');
const AuthMiddleware = require('./middleware/authMiddleware');
require('dotenv').config();

// 🧠 Core Setup
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { downloadAvatar } = require('./utils/downloadAvatar');
const User = require('./models/user');

// 🛣️ Routes
const videoRoute = require('./routes/videoRoute');
const authRoute = require('./routes/authRoute');
const likeDislikeRoute = require('./routes/likeDislikeRoute');
const commentRoutes = require('./routes/commentRoute');
const userRoute = require('./routes/users');
const channelRoutes = require('./routes/channelRoute');
const postRoutes = require('./routes/postRoute');
const liveStreamRoutes = require('./routes/liveStreamRoutes'); // Ensure correct file name
const vodRoutes = require('./routes/vodRoutes'); // VOD routes (temp generation API)
 const vodQueue = require('./queues/vodQueue');
// 🔌 Connect to MongoDB
const dbConnection = connectDB();
if (!dbConnection) {
  console.error('❌ Failed to connect to MongoDB. Exiting...');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ✅ Ensure uploads folders exist (added hls + tempVOD)
const ensureUploadFoldersExist = () => {
  const folders = [
    'uploads/videos',
    'uploads/thumbnails',
    'uploads/avatars',
    'uploads/hls',       // where HLS per-video lives
    'uploads/tempVOD'    // temporary on-demand outputs
  ];
  folders.forEach(folder => {
    const dir = path.join(__dirname, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};
ensureUploadFoldersExist();

// 🧱 Middlewares
console.log('🧱 Registering global middlewares...');
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(helmet());
app.use(compression());
app.use(express.json());

// 📁 Serve uploads with CORS headers (added tempVOD)
console.log('📁 Serving uploads with CORS...');
const serveUploadsWithCORS = (folderName) => {
  app.use(`/uploads/${folderName}`, express.static(path.join(__dirname, 'uploads', folderName), {
    setHeaders: (res, filePath) => {
      // ✅ Correct MIME types for HLS
      if (filePath.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      } else if (filePath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
      }
      // Your existing CORS headers
      res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  }));
};
// include tempVOD and hls here
['thumbnails', 'videos', 'avatars', 'hls', 'tempVOD'].forEach(serveUploadsWithCORS);

// 🧠 Smart Avatar Recovery Middleware
app.get('/uploads/avatars/:filename', async (req, res, next) => {
  const filename = req.params.filename;
  const avatarPath = path.join(__dirname, 'uploads', 'avatars', filename);

  if (fs.existsSync(avatarPath)) {
    return res.sendFile(avatarPath);
  }

  try {
    const user = await User.findOne({ avatar: `/uploads/avatars/${filename}` });
    if (user?.googleId && user.avatar?.startsWith('http')) {
      await downloadAvatar(user.avatar, avatarPath);
      return res.sendFile(avatarPath);
    }

    const fallback = path.join(__dirname, 'uploads', 'default-avatar.jpg');
    if (fs.existsSync(fallback)) {
      return res.sendFile(fallback);
    }
    throw new Error('Default avatar not found');
  } catch (err) {
    console.error('❌ Avatar recovery failed:', err.message);
    return res.status(404).send('Avatar not found');
  }
});

// 🔗 API Routes
console.log('🛣️ Setting up routes...');
app.use('/api/users', userRoute);
app.use('/api/auth', authRoute);
app.use('/api/comments', commentRoutes);
app.use('/api/videos', likeDislikeRoute);
app.use('/api/videos', videoRoute); // Note: This might cause route overlap; consider consolidating
app.use('/api/hls', hlsRoutes);
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/channels', channelRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/live', liveStreamRoutes);
app.use('/api/vod', vodRoutes); // mount VOD endpoints
app.use('/api/live-hls', express.static('/tmp/streams/hls'));
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ❌ 404 Handler
app.use((req, res, next) => {
  const err = new Error(`Not Found - ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

// 🧯 Error Handler
app.use(errorHandler);

// ✅ Set up HTTP + WebSocket server
const setupSocketServer = require('./socket/socketServer'); // adjust path if needed
const server = http.createServer(app);
const io = setupSocketServer(server);

// 🚀 Start Server + MediaSoup + Socket.IO
const startServer = async () => {
  try {
   /* const bullBoardAdapter = new ExpressAdapter();
    bullBoardAdapter.setBasePath('/admin/queues');



createBullBoard({
  queues: [
    new BullMQAdapter(uploadQueue),
    new BullMQAdapter(vodQueue)
  ],
  serverAdapter: bullBoardAdapter,
});


    app.use('/admin/queues', AuthMiddleware, bullBoardAdapter.getRouter());
*/
    console.log('🚀 Starting server and services...');
    await server.listen(PORT);
    console.log(`🚀 Server running at http://localhost:${PORT}`);

    //console.log('🟡 Starting MediaSoup Worker...');
   // await createWorker();
    //console.log('✅ MediaSoup Worker started');

   // console.log('🟡 Initializing Socket.IO signaling...');
   // socketHandlers(io);
    //console.log('✅ Socket.IO signaling initialized');
  } catch (err) {
    console.error('❌ Failed to initialize server or services:', err.message);
    if (server.listening) {
      server.close(() => process.exit(1));
    } else {
      process.exit(1);
    }
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
