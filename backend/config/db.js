/** MySQL / TiDB connection pool and helpers. */
require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');

const useSsl = process.env.DB_SSL === 'true';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  decimalNumbers: true, // return DECIMAL columns as numbers
  dateStrings: true,    // return DATE columns as 'YYYY-MM-DD'
  connectTimeout: 10000,
  ssl: useSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
});

// TiDB enforces ONLY_FULL_GROUP_BY; relax it per connection so MySQL-style queries work.
pool.pool.on('connection', (conn) => {
  conn.query("SET SESSION sql_mode = REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', '')", (err) => {
    if (err) console.error('[db] Could not relax sql_mode:', err.message);
  });
});

// A pool error must never crash the process – log it and carry on.
pool.on('error', (err) => {
  console.error('[db] Pool error:', err.code || err.message);
});

let dbAvailable = false;

/**
 * Checks that MySQL is reachable. Returns true/false instead of throwing,
 * so the server keeps running and can report a meaningful error.
 */
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.ping();
    dbAvailable = true;
    console.log(`[db] Connected to MySQL database "${process.env.DB_NAME}" on ${process.env.DB_HOST}`);
    return true;
  } catch (err) {
    dbAvailable = false;
    console.error(`[db] Could not connect to MySQL: ${describeDbError(err)}`);
    return false;
  } finally {
    if (conn) conn.release();
  }
}

/** Turns low-level MySQL error codes into human-readable messages. */
function describeDbError(err) {
  switch (err.code) {
    case 'ECONNREFUSED':
      return 'Connection refused – is the MySQL server running on the configured host/port?';
    case 'ER_ACCESS_DENIED_ERROR':
      return 'Access denied – check DB_USER and DB_PASSWORD in .env.';
    case 'ER_BAD_DB_ERROR':
      return `Database "${process.env.DB_NAME}" does not exist – run database/schema.sql first.`;
    case 'ENOTFOUND':
      return `Host "${process.env.DB_HOST}" not found – check DB_HOST in .env.`;
    case 'ETIMEDOUT':
      return 'Connection timed out – the database server did not respond.';
    case 'PROTOCOL_CONNECTION_LOST':
      return 'The connection to the database was lost.';
    default:
      return err.message || String(err);
  }
}

module.exports = {
  pool,
  testConnection,
  describeDbError,
  isDbAvailable: () => dbAvailable,
};