import mongoose from 'mongoose';
import { createEnhancedLogger } from '../utils/consola-logger';
import dotenv from 'dotenv';
dotenv.config();

const logger = createEnhancedLogger('database');

declare global {
  // We need to use interface declaration merging instead of 'var' with 'any'
  interface Global {
    mongoose: {
      conn: mongoose.Connection | null;
      promise: Promise<mongoose.Connection> | null;
      listenersAttached: boolean;
    } | undefined;
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in your .env file');
}

// Use the typed global interface
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, listenersAttached: false };
}

export async function connectToDatabase() {
  if (cached.conn) {
    logger.debug('Using cached database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      retryReads: true,
    };

    // Increase max listeners to prevent memory leak warnings
    mongoose.connection.setMaxListeners(20);

    logger.info('Creating new database connection');
    cached.promise = mongoose.connect(MONGODB_URI!, opts);
  }

  try {
    cached.conn = await cached.promise;
    logger.info('📊 Database connected successfully');
    return cached.conn;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('💥 Failed to connect to database', {
      error: errorMessage,
      uri: MONGODB_URI ? `${MONGODB_URI.substring(0, 20)}...` : 'undefined',
      ...(errorStack && { stack: errorStack })
    });
    cached.promise = null;
    throw error;
  }
}

export async function disconnectFromDatabase() {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    logger.info('Database disconnected');
  }
}

// Only attach event listeners once to prevent memory leaks
if (!cached.listenersAttached) {
  mongoose.connection.on('error', (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('💥 Database connection error', { error: errorMessage });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Database disconnected');
    if (cached) {
      cached.conn = null;
      cached.promise = null;
    }
  });

  cached.listenersAttached = true;
}

export default connectToDatabase;