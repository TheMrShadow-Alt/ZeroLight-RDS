const { Server } = require('socket.io');

module.exports = (req, res) => {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO');
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('createSession', async ({ password }) => {
        const sessionId = require('crypto').randomBytes(8).toString('hex');
        // In-memory storage (no Redis on Vercel free tier)
        if (!res.socket.server.sessions) res.socket.server.sessions = {};
        res.socket.server.sessions[sessionId] = { password };
        socket.join(sessionId);
        socket.emit('sessionCreated', { sessionId });
      });

      socket.on('joinSession', ({ sessionId, password }) => {
        if (res.socket.server.sessions && res.socket.server.sessions[sessionId] && res.socket.server.sessions[sessionId].password === password) {
          socket.join(sessionId);
          socket.emit('sessionCreated', { sessionId });
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
  }
  res.end();
};
