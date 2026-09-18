const redis = require('redis');

const pub = redis.createClient();

pub.on('connect', () => {
  console.log('Publisher connected to Redis');
  pub.publish('test-channel', 'hello from publisher');
  console.log('Message published');
  pub.quit();
});