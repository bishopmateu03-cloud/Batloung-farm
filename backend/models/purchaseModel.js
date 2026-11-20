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

async function findById(id, conn = pool) {
  const [rows] = await conn.execute(
    `SELECT p.*, s.business_name, s.contact_person, s.province
     FROM purchases p JOIN suppliers s ON s.supplier_id = p.supplier_id
     WHERE p.purchase_id = ?`,
    [id],
  );
  if (!rows[0]) return null;
  const [items] = await conn.execute(
    `SELECT pd.purchase_detail_id, pd.fruit_id, f.fruit_name, pd.packaging_size,
            pd.quantity, pd.unit_cost, pd.line_total
     FROM purchase_details pd JOIN fruits f ON f.fruit_id = pd.fruit_id
     WHERE pd.purchase_id = ? ORDER BY pd.purchase_detail_id`,
    [id],
  );
  return { ...rows[0], items };
}

/**
 * Records a purchase with many fruit items in ONE transaction:
 *  1. resolve the supplier (existing supplier_id, or register the supplier details sent)
 *  2. validate every fruit
 *  3. calculate the total automatically
 *  4. insert header + details
 *  5. increase stock for each fruit/packaging size
 * Any failure → ROLLBACK, nothing is saved.
 */
async function create({ supplier_id: supplierId, supplier, purchase_date: purchaseDate, items }) {
  return withTransaction(async (conn) => {
    // 1. Supplier
    let resolvedSupplierId = supplierId;
    if (resolvedSupplierId) {
      const existing = await supplierModel.findById(resolvedSupplierId, conn);
      if (!existing) throw AppError.notFound(`Supplier with ID ${resolvedSupplierId} not found`);
    } else {
      const created = await supplierModel.create(supplier, conn);
      resolvedSupplierId = created.supplier_id;
    }

    // 2. Validate fruits (all items are checked before anything is written)
    const errors = [];
    for (const [i, item] of items.entries()) {
      const [rows] = await conn.execute('SELECT fruit_id, status FROM fruits WHERE fruit_id = ?', [item.fruit_id]);
      if (!rows[0]) errors.push(`items[${i}]: fruit ${item.fruit_id} does not exist`);
    }
    if (errors.length) throw AppError.badRequest('Purchase rejected – no changes were saved', errors);

    // 3. Calculate totals
    const { items: lines, total } = calculatePurchaseTotal(items);

    // 4. Header + details
    const [header] = await conn.execute(
      'INSERT INTO purchases (supplier_id, purchase_date, total_amount) VALUES (?, COALESCE(?, CURRENT_DATE), ?)',
      [resolvedSupplierId, purchaseDate || null, total],
    );
    const purchaseId = header.insertId;

    for (const line of lines) {
      await conn.execute(
        `INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size)
         VALUES (?, ?, ?, ?, ?)`,
        [purchaseId, line.fruit_id, line.quantity, line.unit_cost, line.packaging_size],
      );
      // 5. Stock increase for this fruit + packaging size
      await stockModel.increase(conn, line.fruit_id, line.packaging_size, line.quantity);
    }

    return findById(purchaseId, conn);
  });
}

module.exports = { findAll, findById, create };