/**
 * Stock database queries.
 * Stock is kept per fruit AND packaging size (SMALL / MEDIUM / LARGE).
 */
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');

const BASE_SELECT = `
  SELECT st.stock_id, st.fruit_id, f.fruit_name, f.status AS fruit_status,
         st.packaging_size, st.available_quantity, st.selling_price, st.reorder_level,
         CASE WHEN st.available_quantity <= st.reorder_level THEN 'LOW' ELSE 'OK' END AS stock_status,
         st.last_updated
  FROM stock st
  JOIN fruits f ON f.fruit_id = st.fruit_id`;
const ORDER = " ORDER BY f.fruit_name, FIELD(st.packaging_size, 'SMALL','MEDIUM','LARGE')";

async function findAll({ packaging_size: size } = {}) {
  const params = [];
  let sql = BASE_SELECT;
  if (size) {
    sql += ' WHERE st.packaging_size = ?';
    params.push(size);
  }
  const [rows] = await pool.execute(sql + ORDER, params);
  return rows;
}

async function findByFruit(fruitId) {
  const [rows] = await pool.execute(`${BASE_SELECT} WHERE st.fruit_id = ?${ORDER}`, [fruitId]);
  return rows;
}

/**
 * Low stock: available quantity at or below a threshold.
 * If no threshold is supplied, each row's own reorder_level is used.
 */
async function findLowStock(threshold) {
  let sql;
  let params;
  if (threshold !== undefined) {
    sql = `${BASE_SELECT} WHERE f.status = 'ACTIVE' AND st.available_quantity <= ?`;
    params = [threshold];
  } else {
    sql = `${BASE_SELECT} WHERE f.status = 'ACTIVE' AND st.available_quantity <= st.reorder_level`;
    params = [];
  }
  const [rows] = await pool.execute(`${sql} ORDER BY st.available_quantity ASC, f.fruit_name`, params);
  return rows;
}

/** Locks a stock row inside a transaction so concurrent sales cannot oversell. */
async function lockRow(conn, fruitId, size) {
  const [rows] = await conn.execute(
    `SELECT st.stock_id, st.available_quantity, st.selling_price, f.fruit_name, f.status
     FROM stock st JOIN fruits f ON f.fruit_id = st.fruit_id
     WHERE st.fruit_id = ? AND st.packaging_size = ? FOR UPDATE`,
    [fruitId, size],
  );
  return rows[0] || null;
}

/** Increases stock (purchase). */
async function increase(conn, fruitId, size, quantity) {
  const [result] = await conn.execute(
    'UPDATE stock SET available_quantity = available_quantity + ? WHERE fruit_id = ? AND packaging_size = ?',
    [quantity, fruitId, size],
  );
  if (result.affectedRows !== 1) {
    throw AppError.badRequest(`No stock record exists for fruit ${fruitId} (${size})`);
  }
}

/**
 * Decreases stock (sale). The WHERE clause guarantees the balance can never
 * go negative even under concurrent requests; the CHECK constraint is a final guard.
 */
async function decrease(conn, fruitId, size, quantity) {
  const [result] = await conn.execute(
    `UPDATE stock SET available_quantity = available_quantity - ?
     WHERE fruit_id = ? AND packaging_size = ? AND available_quantity >= ?`,
    [quantity, fruitId, size, quantity],
  );
  if (result.affectedRows !== 1) {
    throw AppError.badRequest(`Insufficient stock for fruit ${fruitId} (${size}); sale cancelled`);
  }
}

async function updateSettings(fruitId, size, { selling_price: price, reorder_level: reorder }) {
  const sets = [];
  const params = [];
  if (price !== undefined) { sets.push('selling_price = ?'); params.push(Number(price)); }
  if (reorder !== undefined) { sets.push('reorder_level = ?'); params.push(Number(reorder)); }
  const [result] = await pool.execute(
    `UPDATE stock SET ${sets.join(', ')} WHERE fruit_id = ? AND packaging_size = ?`,
    [...params, fruitId, size],
  );
  return result.affectedRows;
}

async function getPrices(fruitId) {
  const [rows] = await pool.execute('SELECT packaging_size, selling_price FROM stock WHERE fruit_id = ?', [fruitId]);
  return Object.fromEntries(rows.map((r) => [r.packaging_size, Number(r.selling_price)]));
}

module.exports = {
  findAll, findByFruit, findLowStock, lockRow, increase, decrease, updateSettings, getPrices,
};
