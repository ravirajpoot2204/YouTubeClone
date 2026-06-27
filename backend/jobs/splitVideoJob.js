// backend/jobs/splitVideoJob.js
const { Queue } = require('bullmq');
const connection = require('../config/redisConnection');
const { getVideoDuration } = require('../utils/ffprobe');
const Video = require('../models/video');

const chunkQueue = new Queue('transcode-chunk', { connection });
const SEGMENT_DURATION = 10; // seconds
const DEFAULT_RESOLUTIONS = [144, 240, 360, 480, 720, 1080];

async function splitVideoJob(videoId, filePath) {
  console.log(`🎬 Splitting video ${videoId}, path: ${filePath}`);

  // Attempt to read duration
  let duration = 0;
  try {
    duration = await getVideoDuration(filePath);
    console.log(`⏱️ Video duration: ${duration}s`);
  } catch (err) {
    console.error('❌ ffprobe error:', err.message);
    await Video.findByIdAndUpdate(videoId, { status: 'failed' });
    return; // stop – can't split without duration
  }

  if (duration <= 0) {
    console.error('❌ Invalid duration');
    await Video.findByIdAndUpdate(videoId, { status: 'failed' });
    return;
  }

  const numChunks = Math.ceil(duration / SEGMENT_DURATION);
  console.log(`✂️ Splitting into ${numChunks} chunks`);

  // ✅ Store the total number of chunks right away
  await Video.findByIdAndUpdate(videoId, {
    totalChunks: numChunks,
    completedChunks: 0,
    status: 'processing',
  });

  // Add chunk jobs
  for (let i = 0; i < numChunks; i++) {
    const start = i * SEGMENT_DURATION;
    const dur = Math.min(SEGMENT_DURATION, duration - start);

    await chunkQueue.add('process-chunk', {
      videoId,
      chunkIndex: i,
      startTime: start,
      duration: dur,
      resolutions: DEFAULT_RESOLUTIONS,
      inputPath: filePath,
      outputDir: `uploads/hls/${videoId}`,
    });
  }

  console.log(`✅ ${numChunks} chunk jobs added to queue`);
}

module.exports = { splitVideoJob };