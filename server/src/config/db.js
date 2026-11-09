import mongoose from 'mongoose';
import { config } from './env.js';

let mongodInstance = null;
let reconnectTimer = null;

export const connectDB = async (customUri = null) => {
  const targetUri = customUri || config.mongodbUri;

  try {
    // Attempt standard connection with 2s timeout
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] Connected successfully to MongoDB at ${mongoose.connection.host}:${mongoose.connection.port}`);
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
    return mongoose.connection;
  } catch (err) {
    if (process.env.NODE_ENV === 'test') {
      console.warn(`[Database] Test mode: starting embedded MongoMemoryServer fallback...`);
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        const memoryUri = mongodInstance.getUri();
        await mongoose.connect(memoryUri);
        console.log(`[Database] Embedded in-memory MongoDB started and connected for tests at ${memoryUri}`);
        return mongoose.connection;
      } catch (memErr) {
        console.error('[Database] Failed to initialize in-memory MongoDB for tests:', memErr.message);
        throw memErr;
      }
    }

    // In development or production:
    console.warn(`================================================================`);
    console.warn(`⚠️  [Database Warning] Could not connect to MongoDB at ${targetUri}`);
    console.warn(`    Reason: ${err.message}`);
    console.warn(`----------------------------------------------------------------`);
    console.warn(`    MongoDB is required for database operations.`);
    console.warn(`    To start MongoDB locally on macOS, run:`);
    console.warn(`      brew services start mongodb/brew/mongodb-community`);
    console.warn(`    Or with Docker:`);
    console.warn(`      docker run -d -p 27017:27017 --name mongodb mongo:latest`);
    console.warn(`    Or set your MongoDB Atlas URI in server/.env (MONGODB_URI)`);
    console.warn(`----------------------------------------------------------------`);
    console.warn(`    The server is running and will auto-reconnect once MongoDB starts.`);
    console.warn(`================================================================`);

    // Periodic background reconnection attempt
    if (!reconnectTimer) {
      reconnectTimer = setInterval(async () => {
        try {
          await mongoose.connect(targetUri, { serverSelectionTimeoutMS: 2000 });
          console.log(`[Database] Successfully reconnected to MongoDB at ${mongoose.connection.host}:${mongoose.connection.port}`);
          clearInterval(reconnectTimer);
          reconnectTimer = null;
        } catch {
          // Keep polling silently
        }
      }, 5000);
      reconnectTimer.unref();
    }

    return null;
  }
};

export const disconnectDB = async () => {
  try {
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
      mongodInstance = null;
    }
  } catch (err) {
    console.error('[Database] Error disconnecting database:', err);
  }
};
