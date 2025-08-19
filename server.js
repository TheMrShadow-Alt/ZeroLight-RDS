const express = require('express');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const Redis = require('ioredis');

const app = express();
const redis = new Redis(); // Connect to Redis (default: localhost:6379)
app.use(express.static(__dirname)); // Serve static files from the current directory

const server = https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
}, app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createSession', async ({ password }) => {
    const sessionId = require('crypto').randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    await redis.set(`session:${sessionId}`, hashedPassword);
    socket.join(sessionId);
    socket.emit('sessionCreated', { sessionId });
    console.log(`Session created: ${sessionId}`);
  });

  socket.on('joinSession', async ({ sessionId, password }) => {
    const storedHash = await redis.get(`session:${sessionId}`);
    if (storedHash && await bcrypt.compare(password, storedHash)) {
      socket.join(sessionId);
      socket.emit('sessionCreated', { sessionId });
      console.log(`Client ${socket.id} joined session ${sessionId}`);
    } else {
      socket.emit('sessionError', { message: 'Invalid session ID or password' });
    }
  });

  socket.on('offer', ({ offer, sessionId }) => {
    socket.to(sessionId).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ answer, to, sessionId }) => {
    socket.to(to).emit('answer', { answer });
  });

  socket.on('candidate', ({ candidate, sessionId }) => {
    socket.to(sessionId).emit('candidate', { candidate });
  });

  socket.on('data', ({ data, sessionId }) => {
    socket.to(sessionId).emit('data', { data });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(8080, () => {
  console.log('Signaling server running on https://localhost:8080');
});