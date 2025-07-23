import mongoose from 'mongoose';
import pino from 'pino';

const logger = pino({ name: 'database' });

declare global {
  var mongoose: any;
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
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

    logger.info('Creating new database connection');
    cached.promise = mongoose.connect(MONGODB_URI!, opts);
  }

  try {
    cached.conn = await cached.promise;
    logger.info('Database connected successfully');
    return cached.conn;
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
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

mongoose.connection.on('error', (error) => {
  logger.error({ error }, 'Database connection error');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Database disconnected');
  cached.conn = null;
  cached.promise = null;
});

export default connectToDatabase;