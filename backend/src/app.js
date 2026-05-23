/**
 * Express application setup.
 * Middleware chain: helmet → cors → cookie-parser → JSON parser → API routes → error handler.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { NODE_ENV, NEXT_PUBLIC_API_URL } = require('./config/env');

const app = express();

// ─── Security Headers ────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────
app.use(cors({
  origin: true, // Allow all origins — auth is handled by JWT, not CORS
  credentials: true, // Required for HTTP-only refresh token cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-scanner-key', 'x-branch-id', 'x-skip-cache'],
}));

// ─── Body Parsing ────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: '50mb' })); // 50mb to support backup restore uploads

// ─── Health Check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Versioned health endpoint for frontend API status monitoring
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// ─── Rate Limiting ───────────────────────────────────────────
const { apiLimiter } = require('./middleware/rateLimiter');
app.use('/api', apiLimiter);

// ─── API Routes ──────────────────────────────────────────────
const apiRouter = require('./routes');
app.use('/api/v1', apiRouter);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
});

// ─── Global Error Handler ────────────────────────────────────
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;
