require('dotenv').config();                // load .env
const mongoose = require('mongoose');
const { Worker, Queue } = require('bullmq');
const connection = require('../config/redisConnection');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const Video = require('../models/video');

const ensureDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Chunk worker connected to MongoDB');
  }
};

const worker = new Worker('transcode-chunk', async (job) => {
  await ensureDB();   // ← critical

  const { videoId, chunkIndex, startTime, duration, resolutions, inputPath, outputDir } = job.data;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (const res of resolutions) {
    const outputFile = path.join(outputDir, `seg_${String(chunkIndex).padStart(5, '0')}_${res}p.ts`);
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath).seek(startTime).duration(duration)
        .outputOptions([`-vf scale=-2:${res}`, '-c:v libx264', '-preset fast', '-crf 23', '-c:a aac', '-b:a 128k', '-f mpegts', '-force_key_frames expr:gte(t,n_forced*4)'])
        .output(outputFile).on('end', resolve).on('error', reject).run();
    });
  }

  try {
    const updatedVideo = await Video.findByIdAndUpdate(videoId, { $inc: { completedChunks: 1 } }, { new: true });
    console.log(`📊 Chunk ${chunkIndex}/${updatedVideo.totalChunks - 1} done. Progress: ${updatedVideo.completedChunks}/${updatedVideo.totalChunks}`);

    if (updatedVideo.completedChunks === updatedVideo.totalChunks) {
      console.log(`🎯 All chunks done! Enqueuing finalize for video ${videoId}`);
      const finalizeQueue = new Queue('video-finalize', { connection });
      await finalizeQueue.add('create-playlists', { videoId, outputDir, resolutions });
      console.log(`🚀 Finalize job enqueued for video ${videoId}`);
    }
  } catch (err) {
    console.error('❌ DB update failed:', err.message);
    throw err;
  }
}, { connection, concurrency: 4 });

console.log('Chunk worker started');