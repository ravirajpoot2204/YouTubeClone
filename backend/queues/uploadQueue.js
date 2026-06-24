const { Queue } = require('bullmq');
const connection = require('../config/redisConnection');

const uploadQueue = new Queue('video-upload', { connection });

module.exports = uploadQueue;