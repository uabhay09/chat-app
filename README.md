
## The Problem Redis Solves

Without Redis, running two server instances breaks the app completely.

User A connects to Server 1. User B connects to Server 2. Both join "room1". 
User A sends a message — Server 1 broadcasts to its own connections only. 
User B never receives it because Server 2 has no idea a message was sent.

Redis pub/sub fixes this: every server publishes outgoing messages to a shared 
Redis channel. Every server is subscribed to that channel and rebroadcasts to 
its own locally connected clients. The two servers are now in sync.

This is why chat apps need Redis the moment they scale past one server — 
not as a cache, but as a message bus.

## How to Run

```bash
docker-compose up --build
```

That's it. This starts:
- Two server instances (ports 3001 and 3002)
- Redis
- MongoDB (data persists across restarts)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `MONGO_URL` | `mongodb://localhost:27017/chatapp` | MongoDB connection string |
| `PORT` | `3001` | Server port |
| `JWT_SECRET` | — | Secret key for signing tokens |

## Tech Stack

- **Node.js + Express** — HTTP server and REST endpoints
- **Socket.io** — WebSocket abstraction, rooms, real-time events
- **MongoDB + Mongoose** — message persistence
- **Redis** — pub/sub across server instances, presence tracking, rate limiting
- **JWT** — stateless auth on socket connections
- **Docker + docker-compose** — one command to run the entire system
- **GitHub Actions** — CI runs tests on every push

## Redis — Three Distinct Uses in This Project

1. **Pub/Sub** — sync messages across multiple server instances
2. **Presence** — track online users per room using Redis Sets
3. **Rate Limiting** — shared request counter across instances via `rate-limiter-flexible`

## CI

GitHub Actions runs the test suite on every push with Redis and MongoDB 
spun up as services — same environment as production.
