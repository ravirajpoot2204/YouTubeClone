const { Queue } = require('bullmq');
const connection = require('../config/redisConnection');

const vodQueue = new Queue('vod-generation', { connection });

module.exports = vodQueue;