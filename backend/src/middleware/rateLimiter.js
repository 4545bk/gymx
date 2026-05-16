/**
 * Rate Limiter Middleware — In-memory sliding window.
 *
 * Three tiers:
 *   1. Login: 5 attempts / 15 minutes per IP
 *   2. General API: 100 requests / minute per IP
 *   3. Scanner: 60 requests / minute per IP
 *
 * Uses in-memory Map — no extra dependencies. Suitable for single-instance deploy.
 * Entries auto-expire via periodic cleanup.
 */

class RateLimitStore {
  constructor() {
    this.hits = new Map();
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  hit(key, windowMs) {
    const now = Date.now();
    const entry = this.hits.get(key) || { timestamps: [] };
    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);
    entry.timestamps.push(now);
    this.hits.set(key, entry);
    return entry.timestamps.length;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.hits) {
      entry.timestamps = entry.timestamps.filter(t => now - t < 15 * 60 * 1000);
      if (entry.timestamps.length === 0) this.hits.delete(key);
    }
  }
}

const store = new RateLimitStore();

function createLimiter(prefix, maxHits, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `${prefix}:${ip}`;
    const count = store.hit(key, windowMs);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxHits);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxHits - count));

    if (count > maxHits) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      });
    }
    next();
  };
}

// ─── Pre-configured limiters ─────────────────────────────
const loginLimiter = createLimiter('login', 5, 15 * 60 * 1000);    // 5 / 15min
const apiLimiter = createLimiter('api', 100, 60 * 1000);            // 100 / min
const scannerLimiter = createLimiter('scanner', 60, 60 * 1000);     // 60 / min

module.exports = { loginLimiter, apiLimiter, scannerLimiter };
