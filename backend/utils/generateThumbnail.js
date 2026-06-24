const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

/**
 * Generates a thumbnail from a video file.
 * If FFmpeg is not available, returns a default thumbnail path.
 * 
 * @param {string} videoPath - Full path to the video file.
 * @param {string} outputDir - Directory to save the thumbnail.
 * @returns {Promise<string>} - Path to the generated thumbnail.
 */
const generateThumbnail = (videoPath, outputDir) => {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const thumbnailName = `thumb_${Date.now()}.jpg`;
    const thumbnailPath = path.join(outputDir, thumbnailName);

    // Try using FFmpeg to extract a frame at 1 second
    const ffmpegCmd = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${thumbnailPath}" -y`;

    exec(ffmpegCmd, (error, stdout, stderr) => {
      if (error) {
        console.warn('FFmpeg not available or failed, using default thumbnail.');
        // Return a default thumbnail path (ensure this default exists in your uploads)
        const defaultThumb = path.join(__dirname, '..', 'uploads', 'thumbnails', 'Default_Thumbnail.jpg');
        if (fs.existsSync(defaultThumb)) {
          resolve(defaultThumb);
        } else {
          // Create a simple placeholder? For now, reject with info.
          reject(new Error('FFmpeg not available and no default thumbnail found.'));
        }
      } else {
        console.log('Thumbnail generated:', thumbnailPath);
        resolve(thumbnailPath);
      }
    });
  });
};

module.exports = generateThumbnail;