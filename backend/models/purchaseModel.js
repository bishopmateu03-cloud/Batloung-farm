/** Purchase database queries (purchases + purchase_details + stock increase). */
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const { withTransaction } = require('../utils/transaction');
const { calculatePurchaseTotal } = require('../utils/calculations');
const supplierModel = require('./supplierModel');
const stockModel = require('./stockModel');

async function findAll({ supplier_id: supplierId, start, end } = {}) {
  const where = [];
  const params = [];
  if (supplierId) { where.push('p.supplier_id = ?'); params.push(supplierId); }
  if (start) { where.push('p.purchase_date >= ?'); params.push(start); }
  if (end) { where.push('p.purchase_date <= ?'); params.push(end); }
  const [rows] = await pool.execute(
    `SELECT p.purchase_id, p.supplier_id, s.business_name, s.province, p.purchase_date,
            p.total_amount, COUNT(pd.purchase_detail_id) AS number_of_items,
            COALESCE(SUM(pd.quantity), 0) AS total_boxes
     FROM purchases p
     JOIN suppliers s ON s.supplier_id = p.supplier_id
     LEFT JOIN purchase_details pd ON pd.purchase_id = p.purchase_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     GROUP BY p.purchase_id, p.supplier_id, s.business_name, s.province,
              p.purchase_date, p.total_amount
     ORDER BY p.purchase_date DESC, p.purchase_id DESC`,
    params,
  );
  return rows;
}