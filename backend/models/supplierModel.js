/** Supplier database queries. */
const { pool } = require('../config/db');
const { buildUpdate } = require('../utils/sqlHelpers');

const COLUMNS = ['business_name', 'contact_person', 'phone', 'province', 'address'];

async function findAll({ province } = {}) {
  let sql = `SELECT s.*, COUNT(p.purchase_id) AS number_of_purchases
             FROM suppliers s
             LEFT JOIN purchases p ON p.supplier_id = s.supplier_id`;
  const params = [];
  if (province) {
    sql += ' WHERE s.province = ?';
    params.push(province);
  }
  sql += ' GROUP BY s.supplier_id ORDER BY s.business_name';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.execute('SELECT * FROM suppliers WHERE supplier_id = ?', [id]);
  return rows[0] || null;
}

async function create(data, conn = pool) {
  const values = COLUMNS.map((c) => (typeof data[c] === 'string' ? data[c].trim() : data[c]));
  const [result] = await conn.execute(
    `INSERT INTO suppliers (${COLUMNS.join(', ')}) VALUES (?, ?, ?, ?, ?)`,
    values,
  );
  return findById(result.insertId, conn);
}

async function update(id, data) {
  const { setClause, values } = buildUpdate(data, COLUMNS);
  await pool.execute(`UPDATE suppliers SET ${setClause} WHERE supplier_id = ?`, [...values, id]);
  return findById(id);
}

async function countPurchases(id) {
  const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM purchases WHERE supplier_id = ?', [id]);
  return rows[0].total;
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM suppliers WHERE supplier_id = ?', [id]);
  return result.affectedRows;
}

module.exports = { findAll, findById, create, update, countPurchases, remove };
