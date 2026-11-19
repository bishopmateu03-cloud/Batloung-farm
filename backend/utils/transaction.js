/**
 * Runs a unit of work inside a MySQL transaction using explicit
 * BEGIN / COMMIT / ROLLBACK statements on one dedicated connection.
 *
 * If the callback throws (validation failure, insufficient stock, SQL error)
 * everything done inside it is rolled back – no partial sales or purchases.
 */
const { pool } = require('../config/db');

async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.query('BEGIN');
    const result = await work(conn);
    await conn.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await conn.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[transaction] ROLLBACK failed:', rollbackErr.message);
    }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { withTransaction };
