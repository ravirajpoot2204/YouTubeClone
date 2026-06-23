const path = require('path');
const generateThumbnail = require('../utils/generateThumbnail');

exports.handleAutoThumbnail = async (videoFilePath, videoFilename) => {
  const outputDir = path.join(__dirname, '../uploads/thumbnails');
  const thumbName = `${videoFilename.split('.')[0]}_thumbnail.jpg`;

  try {
    const thumbnailPath = await generateThumbnail(videoFilePath, thumbName, outputDir);
    return `/uploads/thumbnails/${thumbName}`; // ✅ proper relative path
  } catch (err) {
    console.error('❌ Thumbnail generation failed:', err);
    return '/uploads/thumbnails/Default_Thumbnail.jpg'; // fallback
  }
};
