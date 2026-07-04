// jobs/createPlaylistsJob.js
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const Video = require('../models/video');

/**
 * Get the duration of a .ts segment using ffprobe
 * @param {string} filePath - absolute path to the .ts file
 * @returns {Promise<number>} duration in seconds
 */
function getSegmentDuration(filePath) {
  return new Promise((resolve, reject) => {
    execFile('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      filePath
    ], (error, stdout) => {
      if (error) {
        // Sometimes ffprobe can't read the file; reject to catch
        return reject(error);
      }
      const duration = parseFloat(stdout.trim());
      if (isNaN(duration)) return reject(new Error(`Invalid duration for ${filePath}: ${stdout}`));
      resolve(duration);
    });
  });
}

/**
 * Build a variant .m3u8 playlist for one resolution
 * @param {string} outputDir - directory containing the .ts chunks
 * @param {string} resolution - e.g. "720p"
 * @param {number} totalChunks - total number of chunks expected (optional, for validation)
 * @returns {Promise<string>} playlist content
 */
async function buildVariantPlaylist(outputDir, resolution, totalChunks) {
  // Collect all .ts files for this resolution
  const files = fs.readdirSync(outputDir)
    .filter(f => f.endsWith(`_${resolution}.ts`))
    .sort(); // ensure correct order

  if (files.length === 0) {
    throw new Error(`No segments found for resolution ${resolution} in ${outputDir}`);
  }

  // Optional: warn if we're missing some chunks
  if (totalChunks && files.length !== totalChunks) {
    console.warn(`⚠️ Expected ${totalChunks} chunks for ${resolution}, but found ${files.length}. Some chunks may be missing.`);
  }

  let playlist = '#EXTM3U\n';
  playlist += '#EXT-X-VERSION:3\n';
  playlist += `#EXT-X-TARGETDURATION:10\n`; // will be overridden later by actual max
  playlist += '#EXT-X-MEDIA-SEQUENCE:0\n';

  let maxDuration = 0;
  for (const file of files) {
    const filePath = path.join(outputDir, file);
    try {
      const duration = await getSegmentDuration(filePath);
      if (duration > maxDuration) maxDuration = duration;
      playlist += `#EXTINF:${duration.toFixed(5)},\n`;
      playlist += `${file}\n`;
    } catch (err) {
      console.error(`❌ Failed to read duration for ${file}: ${err.message}`);
      // Include with a fallback duration (10s) so the playlist can still play
      playlist += `#EXTINF:10.00000,\n`;
      playlist += `${file}\n`;
    }
  }

  // Now set the correct maximum duration
  const targetDuration = Math.ceil(maxDuration);
  playlist = playlist.replace('#EXT-X-TARGETDURATION:10', `#EXT-X-TARGETDURATION:${targetDuration}`);

  return playlist;
}

/**
 * Main function called by the finalize worker.
 * Creates playlists for all resolutions and updates the database.
 */
async function createPlaylists(videoId, outputDir, resolutions, totalChunks) {
  console.log(`📝 Creating playlists for video ${videoId}...`);

  const variantPlaylists = [];

  for (const res of resolutions) {
    const content = await buildVariantPlaylist(outputDir, res, totalChunks);
    const fileName = `${res}.m3u8`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Wrote ${fileName}`);
    variantPlaylists.push({
      resolution: res,
      playlistPath: fileName,
    });
  }

  // Build master playlist
  let master = '#EXTM3U\n';
  master += '#EXT-X-VERSION:3\n';
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

  for (const variant of variantPlaylists) {
    const bandwidth = bandwidthMap[variant.resolution] || 1000000;
    const resString = resolutionMap[variant.resolution] || variant.resolution;
    master += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resString}\n`;
    master += `${variant.playlistPath}\n`;
  }

  const masterPath = path.join(outputDir, 'master.m3u8');
  fs.writeFileSync(masterPath, master, 'utf8');
  console.log(`✅ Wrote master.m3u8`);

  // Update video document
  const video = await Video.findById(videoId);
  if (!video) throw new Error('Video not found in DB');
  video.hlsPath = `/uploads/hls/${videoId}/master.m3u8`;
  video.status = 'ready';
  await video.save();

  console.log(`🎉 Video ${videoId} finalized and ready.`);
  return { success: true };
}

module.exports = { createPlaylists };