// backend/config/multerConfig.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ Auto-create folders if they don't exist
const ensureUploadFolders = () => {
  const folders = ['uploads/videos', 'uploads/thumbnails'];
  folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  });
};
ensureUploadFolders();

// ✅ Clean file names by removing spaces and special characters
const sanitizeFileName = (originalName) => {
  const name = path.basename(originalName, path.extname(originalName));
  const ext = path.extname(originalName);
  const cleanName = name.replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
  return `${Date.now()}-${cleanName}${ext}`;
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith('video/')) {
      cb(null, 'uploads/videos');
    } else if (file.mimetype.startsWith('image/')) {
      cb(null, 'uploads/thumbnails');
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  },
  filename: function (req, file, cb) {
    const safeName = sanitizeFileName(file.originalname);
    cb(null, safeName);
  }
});

const upload = multer({ storage });

module.exports = upload;
