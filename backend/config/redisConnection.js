const IORedis = require('ioredis');

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {

  
  
console.log("REDIS_URL : ",REDIS_URL);
console.log("redisurl_ : ",redisUrl);
  console.error('❌ REDIS_URL is not set. Make sure it is defined in your .env file or environment variables. : ');
  process.exit(1);
}

// Log the URL without the password for safety
const safeUrl = redisUrl.replace(/\/\/.*@/, '//***@');
console.log(`🔌 Connecting to Redis at ${safeUrl}`);

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: false,      // connect immediately so we catch errors early
  retryStrategy(times) {
    if (times > 5) {
      console.error('❌ Redis connection failed after 5 retries. Exiting.');
      return null;         // stop retrying
    }
    return Math.min(times * 200, 2000); // delay between retries
  },
});

connection.on('connect', () => {
  console.log('✅ Connected to Redis successfully.');
});

connection.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
  // If you want the process to exit on connection failure, uncomment the next line:
  // process.exit(1);
});

module.exports = connection;