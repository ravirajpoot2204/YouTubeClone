require('dotenv').config();
const mongoose = require('mongoose');
const { Worker } = require('bullmq');
const connection = require('../config/redisConnection');
const { createPlaylists } = require('../jobs/createPlaylistsJob');

const ensureDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Finalize worker connected to MongoDB');
  }
};

const worker = new Worker('video-finalize', async (job) => {
  await ensureDB();   // ← critical
  const { videoId, outputDir, resolutions } = job.data;
  await createPlaylists(videoId, outputDir, resolutions);
}, { connection });

console.log('Finalize worker started');