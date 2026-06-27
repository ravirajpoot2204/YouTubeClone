const { exec } = require('child_process');

exports.getVideoDuration = (filePath) =>
  new Promise((resolve, reject) => {
    // Normalise to forward slashes for cross‑platform safety
    const safePath = filePath.replace(/\\/g, '/');
    console.log(`🔍 ffprobe checking: ${safePath}`);
    exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${safePath}"`,
      (err, stdout) => {
        if (err) {
          console.error('❌ ffprobe exec error:', err.message);
          return reject(err);
        }
        const dur = parseFloat(stdout);
        if (isNaN(dur)) {
          console.error('❌ ffprobe returned non‑numeric:', stdout);
          return reject(new Error('Invalid duration'));
        }
        console.log(`✅ ffprobe duration: ${dur}s`);
        resolve(dur);
      }
    );
  });