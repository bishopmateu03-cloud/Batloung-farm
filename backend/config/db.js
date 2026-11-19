/**
 * Database configuration – MySQL connection pool (mysql2/promise).
 * Credentials come only from environment variables (.env), never hard-coded.
 */
require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');

const REQUIRED_VARS = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn(`[db] Missing environment variables: ${missing.join(', ')}. Check your .env file.`);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
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
