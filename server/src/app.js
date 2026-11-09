import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { swaggerDocument } from './docs/swagger.js';

// Route modules
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import communitiesRoutes from './routes/communities.js';
import postsRoutes from './routes/posts.js';
import commentsRoutes from './routes/comments.js';
import votesRoutes from './routes/votes.js';
import feedsRoutes from './routes/feeds.js';
import savedPostsRoutes from './routes/savedPosts.js';
import searchRoutes from './routes/search.js';
import moderationRoutes from './routes/moderation.js';
import notificationsRoutes from './routes/notifications.js';
import mediaRoutes from './routes/media.js';

export const createApp = () => {
  const app = express();

  // Basic security and parsing middlewares
  app.use(
    cors({
      origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  app.use(cookieParser(config.cookieSecret));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static uploads
  app.use('/uploads', express.static(config.uploadDir));

  // Welcome & Service Discovery root route
  app.get('/', (req, res) => {
    res.type('html').send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8"/>
          <title>Forumly Server API</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; display: flex; justify-content: center; }
            .card { background: #1e293b; border: 1px solid #334155; padding: 32px; border-radius: 16px; max-width: 580px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
            h1 { color: #ff4500; font-size: 24px; margin-top: 0; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
            a { color: #ff4500; text-decoration: none; font-weight: 600; }
            a:hover { text-decoration: underline; }
            .pill { display: inline-block; background: #334155; color: #38bdf8; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-family: monospace; margin: 4px 0; }
            .links { margin-top: 20px; border-top: 1px solid #334155; padding-top: 16px; }
            .link-item { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🚀 Forumly API Server is Running</h1>
            <p>You have accessed the backend REST API on port <span class="pill">${config.port}</span>.</p>
            <div class="links">
              <div class="link-item">🌐 <b>Frontend React App:</b> <a href="http://localhost:5173" target="_blank">http://localhost:5173</a></div>
              <div class="link-item">📖 <b>API Documentation:</b> <a href="/api-docs">/api-docs</a></div>
              <div class="link-item">💓 <b>API Health Check:</b> <a href="/api/v1/health">/api/v1/health</a></div>
            </div>
          </div>
        </body>
      </html>
    `);
  });

  // Swagger Documentation (lazy-loaded so it doesn't block server boot)
  let swaggerServe = null;
  let swaggerSetup = null;
  app.use('/api-docs', async (req, res, next) => {
    try {
      if (!swaggerServe) {
        const swaggerUiModule = await import('swagger-ui-express');
        const swaggerUi = swaggerUiModule.default || swaggerUiModule;
        swaggerServe = swaggerUi.serve;
        swaggerSetup = swaggerUi.setup(swaggerDocument);
      }
      return swaggerServe(req, res, () => swaggerSetup(req, res, next));
    } catch (err) {
      console.error('[Swagger] Error serving docs:', err);
      next(err);
    }
  });

  // Healthcheck endpoint
  app.get('/api/v1/health', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.json({
      status: isDbConnected ? 'healthy' : 'database_disconnected',
      database: isDbConnected ? 'connected' : 'disconnected',
      platform: 'Forumly',
      timestamp: new Date().toISOString(),
    });
  });

  // REST API v1 routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/communities', communitiesRoutes);
  app.use('/api/v1/posts', postsRoutes);
  app.use('/api/v1/comments', commentsRoutes);
  app.use('/api/v1/votes', votesRoutes);
  app.use('/api/v1/feeds', feedsRoutes);
  app.use('/api/v1/saved-posts', savedPostsRoutes);
  app.use('/api/v1/search', searchRoutes);
  app.use('/api/v1/moderation', moderationRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/media', mediaRoutes);

  // Catch-all 404
  app.use('*', (req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  // Central error handling
  app.use(errorHandler);

  return app;
};
