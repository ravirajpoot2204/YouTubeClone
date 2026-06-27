const { Worker } = require('bullmq');
const connection = require('../config/redisConnection');
const Video = require('../models/video');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const worker = new Worker('video-upload', async job => {
  const { videoId, inputPath, filename } = job.data;
  console.log(`🎬 Processing video ${videoId}...`);

  // Update progress
  await job.updateProgress(10);

  const video = await Video.findById(videoId);
  if (!video) throw new Error('Video not found');

  const outputDir = path.join(__dirname, '..', 'uploads', 'hls', videoId);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const hlsPlaylist = path.join(outputDir, 'index.m3u8').replace(/\\/g, '/');

  // Example FFmpeg command: transcode to HLS
  const ffmpegCmd = `ffmpeg -i "${inputPath}" -c:v libx264 -c:a aac -f hls -hls_time 4 -hls_list_size 0 "${hlsPlaylist}"`;

  await new Promise((resolve, reject) => {
    exec(ffmpegCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('FFmpeg error:', stderr);
        reject(error);
      } else {
        resolve();
      }
    });
  });

  await job.updateProgress(70);

  // Generate thumbnail (optional, we already have a default, but you can use the video)
  // ... (use the generateThumbnail utility or FFmpeg snapshot)

  // Update video document
  video.hlsPath = `/uploads/hls/${videoId}/index.m3u8`;
  video.status = 'ready';
  video.duration = 0; // you can calculate with FFprobe later
  await video.save();

  console.log(`✅ Video ${videoId} processed`);
  return { success: true };
}, { connection });

worker.on('completed', job => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

console.log('👷 Upload worker started');