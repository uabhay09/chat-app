const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const cors = require('cors');
const { z } = require('zod');
const JWT_SECRET = 'your-secret-key';
mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/chatapp');

const mongoMessageSchema = new mongoose.Schema({
  room: String,
  msg: String,
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', mongoMessageSchema);
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const subClient = pubClient.duplicate();
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

io.adapter(createAdapter(pubClient, subClient));
console.log('Redis adapter connected');

redisClient.ping((err, result) => {
  console.log('Redis ping:', err || result);
});

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 5,
  duration: 10,
  keyPrefix: 'rl',
  rejectIfRedisNotReady: false,
  insuranceLimiter: new RateLimiterMemory({
    points: 5,
    duration: 10,
  }),
});

const messageSchema = z.object({
  room: z.string().min(1).max(50),
  msg: z.string().min(1).max(1000),
});

const joinSchema = z.string().min(1).max(50);


app.use(express.json());
app.use(cors());

const USERS = [
  { userId: '1', username: 'alice', passwordHash: bcrypt.hashSync('password123', 10) },
  { userId: '2', username: 'bob', passwordHash: bcrypt.hashSync('password456', 10) },
];

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(
    { userId: user.userId, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token });
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('unauthorized'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

socket.on('join room', async (room) => {
  const parsed = joinSchema.safeParse(room);
  if (!parsed.success) {
    socket.emit('error', 'Invalid room name');
    return;
  }

  socket.join(parsed.data);
  socket.currentRoom = parsed.data;
  const history = await Message.find({ room: parsed.data }).sort({ createdAt: 1 }).limit(50);
  socket.emit('chat history', history);
  redisClient.sadd(`room:${parsed.data}:online`, socket.username, () => {
    redisClient.smembers(`room:${parsed.data}:online`, (err, onlineUsers) => {
      io.to(parsed.data).emit('presence update', onlineUsers);
    });
  });
});

socket.on('chat message', async (data) => {
  const parsed = messageSchema.safeParse(data);
  if (!parsed.success) {
    socket.emit('error', 'Invalid message');
    return;
  }

  const { room, msg } = parsed.data;

  console.log('userId:', socket.userId, 'username:', socket.username);
  try {
    const key = socket.userId || socket.id;
    await rateLimiter.consume(key);
  } catch (err) {
    socket.emit('rate_limit', 'Rate limit exceeded. Slow down.');
    return;
  }

  const saved = await Message.create({ room, msg });
  io.to(room).emit('chat message', saved.msg);
});

  socket.on('disconnect', () => {
    const room = socket.currentRoom;
    if (!room) return;
    redisClient.srem(`room:${room}:online`, socket.username, () => {
      redisClient.smembers(`room:${room}:online`, (err, onlineUsers) => {
        io.to(room).emit('presence update', onlineUsers);
      });
    });
  });
});
module.exports = { app, server, io, mongoose, redisClient, pubClient, subClient };