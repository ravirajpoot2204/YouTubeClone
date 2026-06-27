const fs = require('fs');
const path = require('path');
const Video = require('../models/video');

async function createPlaylists(videoId, outputDir, resolutions) {
  // 1. Read all segment files
  const files = fs.readdirSync(outputDir);
  const variantPlaylists = [];

  // 2. Create variant playlist for each resolution
  for (const res of resolutions) {
    const regex = new RegExp(`seg_\\d{5}_${res}p\\.ts$`);
    const segmentFiles = files.filter(f => regex.test(f)).sort();

    if (segmentFiles.length === 0) continue;

    const playlistName = `${res}p.m3u8`;
    const playlistPath = path.join(outputDir, playlistName);
    const targetDuration = 10; // must match chunk duration

    const lines = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      `#EXT-X-TARGETDURATION:${targetDuration}`,
      '#EXT-X-MEDIA-SEQUENCE:0',
      ...segmentFiles.flatMap(f => [`#EXTINF:${targetDuration.toFixed(6)},`, f]),
      '#EXT-X-ENDLIST',
    ];
    fs.writeFileSync(playlistPath, lines.join('\n'));

    const bandwidthMap = { 144: 200000, 240: 400000, 360: 800000, 480: 1500000, 720: 3000000, 1080: 5000000 };
    const widthMap = { 144: 256, 240: 426, 360: 640, 480: 854, 720: 1280, 1080: 1920 };
    variantPlaylists.push({
      resolution: res,
      playlistName,
      bandwidth: bandwidthMap[res],
      width: widthMap[res],
      height: res,
    });
  }

  // 3. Master playlist
  const masterLines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    ...variantPlaylists.map(v =>
      `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.width}x${v.height}\n${v.playlistName}`
    ),
  ];
  fs.writeFileSync(path.join(outputDir, 'master.m3u8'), masterLines.join('\n'));

  // 4. Update database (this is the critical part that was failing)
  try {
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        hlsPath: `/uploads/hls/${videoId}/master.m3u8`,
        status: 'completed',
      },
      { new: true }
    );
    console.log(`✅ Playlists created and video ${videoId} marked as completed.`);
  } catch (err) {
    console.error('❌ Failed to update video after playlists:', err.message);
    throw err; // let the worker know it failed
  }
}

module.exports = { createPlaylists };