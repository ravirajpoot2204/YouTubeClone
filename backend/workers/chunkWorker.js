require('dotenv').config();
const mongoose = require('mongoose');
const { Worker, Queue } = require('bullmq');
const connection = require('../config/redisConnection');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Video = require('../models/video');

const ensureDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Chunk worker connected to MongoDB');
  }
};

const worker = new Worker('transcode-chunk', async (job) => {
  await ensureDB();
  const { videoId, chunkIndex, startTime, duration, resolutions, inputPath, outputDir } = job.data;
  const start = Date.now();   // track elapsed time

  console.log(`🔄 [Chunk ${chunkIndex}] Starting at ${startTime}s, duration ${duration}s`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Process each resolution for this chunk
  for (const res of resolutions) {
    const outputFile = path.join(outputDir, `seg_${String(chunkIndex).padStart(5, '0')}_${res}p.ts`);
    console.log(`  📹 [Chunk ${chunkIndex}] Generating ${res}p...`);

    // Robust FFmpeg arguments (see explanation below)
    const args = [
      '-y',   
      '-ss', String(startTime),
      '-i', inputPath,
      '-t', String(duration),
      '-copyts',
      '-start_at_zero',
      '-vf', `scale=-2:${res}`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-g', '300',                        // fixed GOP: 10 s at 30 fps
      '-keyint_min', '300',
      '-sc_threshold', '0',
      '-force_key_frames', 'expr:eq(n,0)', // keyframe at first frame only
      '-c:a', 'aac',
      '-b:a', '128k',
      '-af', 'aresample=async=1:min_hard_comp=0.100000:first_pts=0',
      '-f', 'mpegts',
      '-muxdelay', '0',
      '-muxpreload', '0',
      outputFile
    ];

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });
      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`FFmpeg exit ${code}: ${stderr}`));
        }
        // Verify output file exists and is non‑zero
        if (!fs.existsSync(outputFile) || fs.statSync(outputFile).size === 0) {
          return reject(new Error(`Output file missing or empty: ${outputFile}`));
        }
        resolve();
      });
      ffmpeg.on('error', reject);
    });

    console.log(`  ✅ [Chunk ${chunkIndex}] ${res}p done.`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // Update progress and possibly enqueue finalize
  try {
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      { $inc: { completedChunks: 1 } },
      { new: true }
    );

    const done = updatedVideo.completedChunks;
    const total = updatedVideo.totalChunks;
    const percent = ((done / total) * 100).toFixed(1);

    console.log(
      `📊 [Chunk ${chunkIndex}] Completed in ${elapsed}s. ` +
      `Progress: ${done}/${total} (${percent}%)`
    );

  if (done === total) {
  console.log(`🎯 All chunks done for video ${videoId}. Enqueuing finalize...`);
  const finalizeQueue = new Queue('video-finalize', { connection });
  const resolutionStrings = resolutions.map(r => `${r}p`);   // 👈 add this
  await finalizeQueue.add('create-playlists', {
    videoId,
    outputDir,
    resolutions: resolutionStrings,   // 👈 send strings
    totalChunks: total,
  });
  console.log(`🚀 Finalize job enqueued for video ${videoId}`);
}
  } catch (err) {
    console.error(`❌ [Chunk ${chunkIndex}] DB update failed:`, err.message);
    throw err;
  }
}, {
  connection,
  concurrency: 2,            // safe for a 4‑core machine
  attempts: 3,               // automatic retry if a chunk fails
  backoff: { type: 'exponential', delay: 5000 },
});

console.log('👷 Chunk worker started (improved)');