module.exports = {
  apps: [
    { name: 'upload-worker', script: 'workers/uploadWorker.js' },
  //  { name: 'chunk-worker', script: 'workers/chunkWorker.js' },
     { name: 'quality-worker', script: 'workers/qualityWorker.js' },
    { name: 'finalize-worker', script: 'workers/finalizeWorker.js' },
  ],
};