/** Fruit database queries. */
const { pool } = require('../config/db');
const { buildUpdate } = require('../utils/sqlHelpers');
const { withTransaction } = require('../utils/transaction');

const PACKAGING_SIZES = ['SMALL', 'MEDIUM', 'LARGE'];

async function findAll({ status } = {}) {
  let sql = `SELECT f.fruit_id, f.fruit_name, f.description, f.status,
                    COALESCE(SUM(st.available_quantity), 0) AS total_boxes_in_stock,
                    MAX(CASE WHEN st.packaging_size = 'SMALL'  THEN st.available_quantity END) AS small_boxes,
                    MAX(CASE WHEN st.packaging_size = 'MEDIUM' THEN st.available_quantity END) AS medium_boxes,
                    MAX(CASE WHEN st.packaging_size = 'LARGE'  THEN st.available_quantity END) AS large_boxes
             FROM fruits f
             LEFT JOIN stock st ON st.fruit_id = f.fruit_id`;
  const params = [];
  if (status) {
    sql += ' WHERE f.status = ?';
    params.push(status);
  }
  sql += ' GROUP BY f.fruit_id ORDER BY f.fruit_name';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.execute('SELECT * FROM fruits WHERE fruit_id = ?', [id]);
  if (!rows[0]) return null;
  const [stock] = await conn.execute(
    `SELECT packaging_size, available_quantity, selling_price, reorder_level
     FROM stock WHERE fruit_id = ? ORDER BY FIELD(packaging_size, 'SMALL','MEDIUM','LARGE')`,
    [id],
  );
  return { ...rows[0], stock };
}

/**
 * Registers a fruit and creates its three stock rows (SMALL, MEDIUM, LARGE)
 * with their own selling prices – all in one transaction.
 */
async function create({ fruit_name, description, status, prices, reorder_level }) {
  return withTransaction(async (conn) => {
    const [result] = await conn.execute(
      'INSERT INTO fruits (fruit_name, description, status) VALUES (?, ?, ?)',
      [fruit_name.trim(), description ? description.trim() : null, (status || 'ACTIVE').toUpperCase()],
    );
    const fruitId = result.insertId;
    for (const size of PACKAGING_SIZES) {
      await conn.execute(
        `INSERT INTO stock (fruit_id, packaging_size, available_quantity, selling_price, reorder_level)
         VALUES (?, ?, 0, ?, ?)`,
        [fruitId, size, Number(prices[size]), reorder_level !== undefined ? Number(reorder_level) : 10],
      );
    }
    return findById(fruitId, conn);
  });
}

async function update(id, data) {
  const payload = { ...data };
  if (payload.status) payload.status = payload.status.toUpperCase();
  const { setClause, values } = buildUpdate(payload, ['fruit_name', 'description', 'status']);
  await pool.execute(`UPDATE fruits SET ${setClause} WHERE fruit_id = ?`, [...values, id]);
  return findById(id);
}

async function countTransactions(id) {
  const [rows] = await pool.execute(
    `SELECT (SELECT COUNT(*) FROM purchase_details WHERE fruit_id = ?)
          + (SELECT COUNT(*) FROM sales_details    WHERE fruit_id = ?) AS total`,
    [id, id],
  );
  return rows[0].total;
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM fruits WHERE fruit_id = ?', [id]);
  return result.affectedRows;
}

module.exports = { findAll, findById, create, update, countTransactions, remove };
