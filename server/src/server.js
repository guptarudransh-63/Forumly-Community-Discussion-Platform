console.log('===============================================');
console.log('🚀 Starting Forumly Server...');
console.log('⏳ Initializing dependencies...');
console.log('===============================================');

import http from 'http';

async function bootstrap() {
  try {
    const { config } = await import('./config/env.js');
    console.log(`[Config] Running in ${config.nodeEnv} mode (target port: ${config.port})`);

    const { connectDB } = await import('./config/db.js');
    await connectDB();

    console.log('[App] Loading Express application and routes...');
    const { createApp } = await import('./app.js');
    const app = createApp();
    const server = http.createServer(app);
    console.log('[App] Express application and routes mounted.');

    console.log('[Sockets] Initializing WebSocket channels...');
    const { initSockets } = await import('./sockets/index.js');
    initSockets(server);
    console.log('[Sockets] WebSockets channels active.');

    server.listen(config.port, () => {
      console.log('===============================================');
      console.log(`✅ Forumly Server is live on port ${config.port}!`);
      console.log(`📡 REST API: http://localhost:${config.port}/api/v1`);
      console.log(`📖 API Docs: http://localhost:${config.port}/api-docs`);
      console.log(`⚡ Ready to accept connections.`);
      console.log('===============================================');
    });

    const shutdown = async () => {
      console.log('\nShutting down Forumly server gracefully...');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Fatal server startup failure:', err);
    process.exit(1);
  }
}

bootstrap();
