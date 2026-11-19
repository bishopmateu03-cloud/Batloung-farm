/** Vendor database queries. */
const { pool } = require('../config/db');
const { buildUpdate } = require('../utils/sqlHelpers');

const COLUMNS = ['vendor_name', 'phone_number', 'location', 'registration_date'];

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM vendors ORDER BY vendor_name');
  return rows;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.execute('SELECT * FROM vendors WHERE vendor_id = ?', [id]);
  return rows[0] || null;
}

/** Search by (partial) vendor name or phone number. */
async function search(term) {
  const like = `%${term.trim()}%`;
  const digits = term.replace(/[^0-9]/g, '');
  const [rows] = await pool.execute(
    `SELECT * FROM vendors
     WHERE vendor_name LIKE ?
        OR phone_number LIKE ?
        OR (? <> '' AND REPLACE(REPLACE(REPLACE(phone_number, '+', ''), ' ', ''), '-', '') LIKE ?)
     ORDER BY vendor_name`,
    [like, like, digits, `%${digits}%`],
  );
  return rows;
}

async function create(data) {
  const fields = COLUMNS.filter((c) => data[c] !== undefined && data[c] !== '');
  const values = fields.map((c) => (typeof data[c] === 'string' ? data[c].trim() : data[c]));
  const [result] = await pool.execute(
    `INSERT INTO vendors (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
    values,
  );
  return findById(result.insertId);
}

async function update(id, data) {
  const { setClause, values } = buildUpdate(data, COLUMNS);
  await pool.execute(`UPDATE vendors SET ${setClause} WHERE vendor_id = ?`, [...values, id]);
  return findById(id);
}

module.exports = { findAll, findById, search, create, update };
