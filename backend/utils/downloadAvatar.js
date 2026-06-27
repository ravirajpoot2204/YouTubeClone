const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const downloadAvatar = (url, filename) => {
  return new Promise((resolve, reject) => {
    // Ensure the target directory exists
    const dir = path.join(__dirname, '..', 'uploads', 'avatars');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, filename);
    const file = fs.createWriteStream(filePath);

    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      // Handle redirects (Google often redirects)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadAvatar(response.headers.location, filename)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download avatar: ${response.statusCode}`));
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // remove partial file
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
};

module.exports = { downloadAvatar };