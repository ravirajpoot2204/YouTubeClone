const { Worker, Queue } = require('bullmq');
const connection = require('../config/redisConnection');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const Video = require('../models/video');

const worker = new Worker('transcode-chunk', async (job) => {
  const { videoId, chunkIndex, startTime, duration, resolutions, inputPath, outputDir } = job.data;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const res of resolutions) {
    const outputFile = path.join(
      outputDir,
      `seg_${String(chunkIndex).padStart(5, '0')}_${res}p.ts`
    );

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seek(startTime)
        .duration(duration)
        .outputOptions([
          `-vf scale=-2:${res}`,
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-c:a aac',
          '-b:a 128k',
          '-f mpegts',
          '-force_key_frames expr:gte(t,n_forced*4)',
        ])
        .output(outputFile)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }

  // Increment completedChunks atomically
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $inc: { completedChunks: 1 } },
    { new: true }
  );

  console.log("Updated Video : ", updatedVideo);
  // If this was the last chunk, trigger finalize
  if (updatedVideo.completedChunks === updatedVideo.totalChunks) {

    const finalizeQueue = new Queue('video-finalize', { connection });
    await finalizeQueue.add('create-playlists', {
      videoId,
      outputDir,
      resolutions,
    });
    console.log(`🚀 Finalize job enqueued for video ${videoId}`);
  }
}, { connection, concurrency: 4 });

console.log('Chunk worker started');