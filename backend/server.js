/**
 * Entry point. Starts the HTTP server even if MySQL is down, so the API can
 * return meaningful 503 errors instead of the process terminating.
 */
require('dotenv').config({ quiet: true });
const app = require('./app');
const { pool, testConnection } = require('./config/db');

const PORT = Number(process.env.PORT) || 3000;

// Safety nets: log unexpected errors instead of crashing the process
process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled promise rejection:', reason instanceof Error ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[process] Uncaught exception:', err.message);
});

async function start() {
  const connected = await testConnection();
  if (!connected) {
    console.warn('[server] Starting WITHOUT a database connection. Requests will return 503 until MySQL is reachable.');
  }

  let currentPort = PORT;
  let portAttempts = 0;
  const maxPortAttempts = 20;
  const server = app.listen(PORT);

  server.on('listening', () => {
    const address = server.address();
    const activePort = address && typeof address === 'object' ? address.port : currentPort;
    console.log(`[server] Batloung Farm DMS API running on http://localhost:${activePort}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && portAttempts < maxPortAttempts && currentPort < 65535) {
      const previousPort = currentPort;
      currentPort += 1;
      portAttempts += 1;
      console.warn(`[server] Port ${previousPort} is already in use; trying ${currentPort}.`);
      server.listen(currentPort);
      return;
    }
    console.error('[server] Server error:', err.message);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received – closing server and database pool...`);
    server.close(async () => {
      try { await pool.end(); } catch (e) { /* ignore */ }
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
