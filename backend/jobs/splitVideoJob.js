// backend/jobs/splitVideoJob.js
const { Queue } = require('bullmq');
const connection = require('../config/redisConnection');
const { getVideoDuration } = require('../utils/ffprobe');
const Video = require('../models/video');
const path = require('path');

const qualityQueue = new Queue('transcode-quality', { connection });
const DEFAULT_RESOLUTIONS = [720, 480, 360, 240, 144];   // biggest first

// ... inside splitVideoJob, the loop will now enqueue 1080p first, then 720p, etc.

async function splitVideoJob(videoId, filePath) {
  console.log(`🎬 Splitting video ${videoId} into quality jobs...`);

  // Read video duration (just for logging, not needed for the per‑quality approach)
  let duration = 0;
  try {
    duration = await getVideoDuration(filePath);
    console.log(`⏱️ Video duration: ${duration}s`);
  } catch (err) {
    console.error('❌ ffprobe error:', err.message);
    await Video.findByIdAndUpdate(videoId, { status: 'failed' });
    return;
  }

  if (duration <= 0) {
    console.error('❌ Invalid duration');
    await Video.findByIdAndUpdate(videoId, { status: 'failed' });
    return;
  }

  // Prepare output directory
  const outputDir = path.resolve(__dirname, '..', 'uploads', 'hls', videoId);

  // Update video document with total qualities and initial status
  await Video.findByIdAndUpdate(videoId, {
    totalQualities: DEFAULT_RESOLUTIONS.length,
    completedQualities: 0,
    status: 'processing',
  });

  // Enqueue one job per quality
  for (const quality of DEFAULT_RESOLUTIONS) {
    await qualityQueue.add(`quality-${quality}p`, {
      videoId,
      quality,                    // e.g., 1080
      inputPath: filePath,
      outputDir,
    });
  }

  console.log(`✅ ${DEFAULT_RESOLUTIONS.length} quality jobs enqueued for video ${videoId}`);
}

module.exports = { splitVideoJob };