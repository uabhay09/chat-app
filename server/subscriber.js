const redis = require('redis');

const sub = redis.createClient();

sub.on('connect', () => {
  console.log('Subscriber connected to Redis');
});

sub.subscribe('test-channel');

sub.on('message', (channel, message) => {
  console.log('received:', message);
});