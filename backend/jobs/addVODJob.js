const vodQueue = require('../queues/vodQueue');

const addVODJob = async ({ videoId, quality, segmentPath }) => {
  await vodQueue.add(
    'generate-partial-quality',
    {
      videoId,
      quality,
      segmentPath
    },
    {
      attempts: 2,       // retry if fails
      backoff: 3000,     // wait before retry
      removeOnComplete: true,
      removeOnFail: false
    }
  );
};

module.exports = addVODJob;
