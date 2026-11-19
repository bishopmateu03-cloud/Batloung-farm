/**
 * Creates the database, tables and sample data by running database/schema.sql.
 * Usage: npm run db:setup     (WARNING: drops and recreates batloung_farm_db)
 */
require('dotenv').config({ quiet: true });
const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const { describeDbError } = require('../config/db');

async function main() {
  let conn;
  try {
    const sql = await fs.readFile(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });
    await conn.query(sql);
    const [tables] = await conn.query(
      'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
      [process.env.DB_NAME],
    );
    console.log(`Database "${process.env.DB_NAME}" created with: ${tables.map((r) => r.t || r.TABLE_NAME).join(', ')}`);
  } catch (err) {
    console.error(`Database setup failed: ${describeDbError(err)}`);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
