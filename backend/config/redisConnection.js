const IORedis = require('ioredis');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',   // or 'localhost' if WSL port is forwarded
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,  // required for BullMQ
});

module.exports = connection;