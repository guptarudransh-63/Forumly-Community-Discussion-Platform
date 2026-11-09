import { createRequire } from 'module';
import { config } from '../config/env.js';

const require = createRequire(import.meta.url);
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let ioInstance = null;

export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    let token = null;

    // 1. Try handshake auth token
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    }

    // 2. Try cookie
    if (!token && socket.handshake.headers.cookie) {
      const match = socket.handshake.headers.cookie.match(/token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      // Allow unauthenticated connection for public room subscriptions
      socket.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded;
      next();
    } catch {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    // If authenticated, join user's private notification channel
    if (socket.user && socket.user.id) {
      const userRoom = `user:${socket.user.id}`;
      socket.join(userRoom);
    }

    // Allow subscribing to post updates
    socket.on('join:post', (postId) => {
      socket.join(`post:${postId}`);
    });

    socket.on('leave:post', (postId) => {
      socket.leave(`post:${postId}`);
    });

    // Allow subscribing to community updates
    socket.on('join:community', (slug) => {
      socket.join(`community:${slug}`);
    });

    socket.on('leave:community', (slug) => {
      socket.leave(`community:${slug}`);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO() {
  return ioInstance;
}
