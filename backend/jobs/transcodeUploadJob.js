const uploadQueue = require('../queues/uploadQueue');

const addTranscodeJob = async ({ videoId, inputPath }) => {
  await uploadQueue.add('transcode', {
    videoId,
    inputPath
  }, {
    attempts: 3,
    backoff: 5000
  });
};

module.exports = addTranscodeJob;
