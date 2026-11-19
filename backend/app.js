/** Express application setup (kept separate from server.js so it can be tested). */
require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const apiRoutes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { pool, describeDbError } = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Serve the compiled React entry first, then the existing static admin pages.
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const FRONTEND_BUILD_DIR = path.join(FRONTEND_DIR, 'dist');
app.use(express.static(FRONTEND_BUILD_DIR));
app.use(express.static(FRONTEND_DIR));

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Batloung Farm Distribution Management System API',
    endpoints: [
      '/api/suppliers', '/api/fruits', '/api/stock', '/api/vendors',
      '/api/purchases', '/api/sales', '/api/payments', '/api/reports', '/health', 'frontend: /',
    ],
  });
});

// Health check – reports database status without crashing
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ success: true, server: 'up', database: 'connected' });
  } catch (err) {
    res.status(503).json({ success: false, server: 'up', database: 'unavailable', message: describeDbError(err) });
  }
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
