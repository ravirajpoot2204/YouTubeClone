const { Worker } = require('bullmq');
const connection = require('../config/redisConnection');
const { createPlaylists } = require('../jobs/createPlaylistsJob');

const worker = new Worker('video-finalize', async (job) => {
  const { videoId, outputDir, resolutions } = job.data;
  await createPlaylists(videoId, outputDir, resolutions);
}, { connection });

console.log('Finalize worker started');