/**
 * Server entry point.
 * 1. Load environment variables
 * 2. Validate env (crashes if missing)
 * 3. Connect to MongoDB
 * 4. Connect to Redis
 * 5. Start Express HTTP server
 * 6. Initialize background jobs
 */
require('dotenv').config();

// Validate environment variables (will crash if missing)
const { PORT, NODE_ENV } = require('./config/env');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const app = require('./app');

const start = async () => {
  // ─── Database Connections ────────────────────────────────
  await connectDB();
  connectRedis();

  // ─── Seed defaults ───────────────────────────────────────
  const { seedDefaultPlans } = require('./modules/settings/settings.service');
  await seedDefaultPlans();

  // ─── Background Jobs ────────────────────────────────────
  const { initJobs } = require('./jobs');
  initJobs();

  // ─── Start Server ───────────────────────────────────────
  app.listen(PORT, '0.0.0.0', () => {
    console.log('──────────────────────────────────────────────────');
    console.log(`🏋️  GymX API Server running`);
    console.log(`   Port:        ${PORT}`);
    console.log(`   Environment: ${NODE_ENV}`);
    console.log(`   API:         http://localhost:${PORT}/api/v1`);
    console.log(`   Health:      http://localhost:${PORT}/health`);
    console.log(`   LAN:         http://0.0.0.0:${PORT}/api/v1`);
    console.log('──────────────────────────────────────────────────');
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
