const { Queue } = require('bullmq');
const connection = require('../config/redisConnection');

(async () => {
  const finalizeQueue = new Queue('video-finalize', { connection });
  await finalizeQueue.add('create-playlists', {
    videoId: '6a3fc680432599d937d2c5a6',   // ← your current video ID
    outputDir: 'uploads/hls/6a3fc680432599d937d2c5a6',
    resolutions: [144, 240, 360, 480, 720, 1080],
  });
  console.log('✅ Finalize job enqueued manually');
  process.exit(0);
})();