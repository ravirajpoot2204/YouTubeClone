// backend/workers/qualityWorker.js
require('dotenv').config();
const mongoose = require('mongoose');
const { Worker, Queue } = require('bullmq');
const connection = require('../config/redisConnection');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Video = require('../models/video');

const ensureDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Quality worker connected to MongoDB');
  }
};

const worker = new Worker('transcode-quality', async (job) => {
  await ensureDB();
  const { videoId, quality, inputPath, outputDir } = job.data;
  const start = Date.now();

  console.log(`🎥 [Quality ${quality}p] Starting transcode for video ${videoId}`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Output paths
  const variantPlaylist = path.join(outputDir, `${quality}p.m3u8`);
  const segmentPattern = path.join(outputDir, `seg_${quality}p_%03d.ts`);

  // FFmpeg command – single pass, perfect HLS
  const args = [
    '-y',                           // overwrite output
    '-i', inputPath,
    '-vf', `scale=-2:${quality}`,   // scale keeping aspect ratio
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-g', '48',                     // keyframe every 2 sec (at 24fps) or adjust to 60 for 30fps
    '-keyint_min', '48',
    '-sc_threshold', '0',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-f', 'hls',
    '-hls_time', '4',
    '-hls_list_size', '0',
    '-hls_segment_filename', segmentPattern,
    variantPlaylist
  ];

  // Run FFmpeg
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error(`❌ [Quality ${quality}p] FFmpeg error:\n${stderr}`);
        return reject(new Error(`FFmpeg exit ${code} for quality ${quality}p`));
      }

      // Verify the variant playlist was created
      if (!fs.existsSync(variantPlaylist)) {
        return reject(new Error(`Playlist missing: ${variantPlaylist}`));
      }
      resolve();
    });

    ffmpeg.on('error', reject);
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`✅ [Quality ${quality}p] Transcoded in ${elapsed}s`);

  // Update progress and possibly trigger finalize
  try {
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      { $inc: { completedQualities: 1 } },
      { new: true }
    );

    const done = updatedVideo.completedQualities;
    const total = updatedVideo.totalQualities;
    const percent = ((done / total) * 100).toFixed(1);
    console.log(`📊 [Quality ${quality}p] Progress: ${done}/${total} (${percent}%)`);

    // If all qualities are done, enqueue finalize job
    if (done === total) {
      console.log(`🎯 All qualities done for video ${videoId}. Enqueuing finalize...`);
      const finalizeQueue = new Queue('video-finalize', { connection });
      await finalizeQueue.add('create-master', {
        videoId,
        outputDir,
        qualities: [144, 240, 360, 480, 720, 1080].map(q => `${q}p`), // string form
      });
    }
  } catch (err) {
    console.error(`❌ [Quality ${quality}p] DB update failed:`, err.message);
    throw err;
  }

  return { success: true };
}, {
  connection,
  concurrency: 2,        // safe for 4‑core machine; adjust based on your CPU
  attempts: 2,           // retry once on failure
  backoff: { type: 'exponential', delay: 5000 },
});

console.log('👷 Quality worker started');