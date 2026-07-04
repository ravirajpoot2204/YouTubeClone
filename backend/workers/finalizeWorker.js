// backend/workers/finalizeWorker.js (replace old finalizeWorker)
require('dotenv').config();
const mongoose = require('mongoose');
const { Worker } = require('bullmq');
const connection = require('../config/redisConnection');
const fs = require('fs');
const path = require('path');
const Video = require('../models/video');

const ensureDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Finalize worker connected to MongoDB');
  }
};

const worker = new Worker('video-finalize', async (job) => {
  await ensureDB();
  const { videoId, outputDir, qualities } = job.data;
  console.log(`📝 Finalizing master playlist for video ${videoId}`);

  // Bandwidth map (same as before)
  const bandwidthMap = {
    '144p': 200000,
    '240p': 400000,
    '360p': 800000,
    '480p': 1500000,
    '720p': 3000000,
    '1080p': 5000000,
  };
  const resolutionMap = {
    '144p': '256x144',
    '240p': '426x240',
    '360p': '640x360',
    '480p': '854x480',
    '720p': '1280x720',
    '1080p': '1920x1080',
  };

  let master = '#EXTM3U\n#EXT-X-VERSION:3\n';

  for (const quality of qualities) {
    const playlistFile = path.join(outputDir, `${quality}.m3u8`);
    if (!fs.existsSync(playlistFile)) {
      console.warn(`⚠️ Variant playlist ${playlistFile} not found – skipping`);
      continue;
    }
    const bw = bandwidthMap[quality] || 1000000;
    const res = resolutionMap[quality] || quality;
    master += `#EXT-X-STREAM-INF:BANDWIDTH=${bw},RESOLUTION=${res}\n`;
    master += `${quality}.m3u8\n`;
  }

  const masterPath = path.join(outputDir, 'master.m3u8');
  fs.writeFileSync(masterPath, master, 'utf8');
  console.log(`✅ Master playlist written`);

  // Update video in DB
  await Video.findByIdAndUpdate(videoId, {
    hlsPath: `/uploads/hls/${videoId}/master.m3u8`,
    status: 'ready',
  });

  console.log(`🎉 Video ${videoId} finalized`);
}, { connection });

console.log('👷 Finalize worker started');