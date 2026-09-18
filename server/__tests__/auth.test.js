const request = require('supertest');
const { app, server, mongoose, redisClient, pubClient, subClient } = require('../index');

describe('POST /login', () => {
  test('returns a token for valid credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'alice', password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('rejects invalid credentials with 401', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'wrong', password: 'nope' });

    expect(res.statusCode).toBe(401);
  });

  beforeAll(async () => {
  await mongoose.connection.once('open', () => {});
});

  afterAll(async () => {
  await mongoose.disconnect();

await redisClient.quit();
await pubClient.quit();
await subClient.quit();

  await new Promise((resolve) => server.close(resolve));
}, 15000);
});