/**
 * Redis client using ioredis.
 * Used EXCLUSIVELY for the QR check-in hot path cache.
 * Graceful fallback: if Redis is unavailable, the check-in service
 * falls through to MongoDB. A slower check-in is better than no check-in.
 * 
 * IMPORTANT: Redis is OPTIONAL. The system works fully without it.
 */
const Redis = require('ioredis');
const { REDIS_URL } = require('./env');

let redisClient = null;
let redisAvailable = false;
let errorLogged = false; // Only log connection failure once

const connectRedis = () => {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          // Stop retrying after 3 attempts — Redis is clearly not running
          if (!errorLogged) {
            console.warn('⚠️  Redis not available — running without cache (MongoDB fallback active)');
            errorLogged = true;
          }
          return null; // Stop retrying
        }
        return Math.min(times * 500, 2000);
      },
      lazyConnect: false,
      enableOfflineQueue: false, // Don't queue commands when disconnected
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
      errorLogged = false;
      console.log('✅ Redis connected');
    });

    redisClient.on('ready', () => {
      redisAvailable = true;
    });

    redisClient.on('error', () => {
      // Silently handle — retryStrategy already logs the warning
      redisAvailable = false;
    });

    redisClient.on('close', () => {
      redisAvailable = false;
      // No log here — too noisy
    });

    redisClient.on('end', () => {
      redisAvailable = false;
    });

  } catch (err) {
    console.warn('⚠️  Redis initialization failed — running without cache');
    redisAvailable = false;
  }

  return redisClient;
};

/**
 * Safe Redis GET — returns null on any error (graceful fallback).
 */
const safeGet = async (key) => {
  if (!redisAvailable || !redisClient) return null;
  try {
    return await redisClient.get(key);
  } catch (err) {
    return null;
  }
};

/**
 * Safe Redis SET with TTL — silently fails on error.
 */
const safeSet = async (key, value, ttlSeconds = 86400) => {
  if (!redisAvailable || !redisClient) return false;
  try {
    await redisClient.set(key, value, 'EX', ttlSeconds);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Safe Redis DEL — silently fails on error.
 */
const safeDel = async (key) => {
  if (!redisAvailable || !redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Get the raw ioredis client for pipeline operations (cache pre-warm).
 */
const getClient = () => redisClient;
const isAvailable = () => redisAvailable;

module.exports = {
  connectRedis,
  getClient,
  isAvailable,
  safeGet,
  safeSet,
  safeDel,
};
