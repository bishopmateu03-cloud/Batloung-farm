/** Sales database queries (sales + sales_details + stock decrease + payment). */
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const { withTransaction } = require('../utils/transaction');
const {
  calculateSaleTotal, determinePaymentStatus, calculateOutstanding, toCents,
} = require('../utils/calculations');
const vendorModel = require('./vendorModel');
const stockModel = require('./stockModel');

async function findAll({ vendor_id: vendorId, payment_status: status, start, end } = {}) {
  const where = [];
  const params = [];
  if (vendorId) { where.push('s.vendor_id = ?'); params.push(vendorId); }
  if (status) { where.push('s.payment_status = ?'); params.push(status); }
  if (start) { where.push('s.sale_date >= ?'); params.push(start); }
  if (end) { where.push('s.sale_date <= ?'); params.push(end); }
  const [rows] = await pool.execute(
    `SELECT s.sale_id, s.vendor_id, v.vendor_name, s.sale_date, s.payment_status,
            s.total_amount, s.amount_paid, (s.total_amount - s.amount_paid) AS outstanding_balance,
            (SELECT COALESCE(SUM(sd.quantity), 0) FROM sales_details sd WHERE sd.sale_id = s.sale_id) AS total_boxes
     FROM sales s JOIN vendors v ON v.vendor_id = s.vendor_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY s.sale_date DESC, s.sale_id DESC`,
    params,
  );
  return rows;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.execute(
    `SELECT s.*, (s.total_amount - s.amount_paid) AS outstanding_balance,
            v.vendor_name, v.phone_number, v.location
     FROM sales s JOIN vendors v ON v.vendor_id = s.vendor_id
     WHERE s.sale_id = ?`,
    [id],
  );
  if (!rows[0]) return null;
  const [items] = await conn.execute(
    `SELECT sd.sales_detail_id, sd.fruit_id, f.fruit_name, sd.packaging_size,
            sd.quantity, sd.unit_price, sd.line_total
     FROM sales_details sd JOIN fruits f ON f.fruit_id = sd.fruit_id
     WHERE sd.sale_id = ? ORDER BY sd.sales_detail_id`,
    [id],
  );
  const [payments] = await conn.execute(
    'SELECT payment_id, payment_date, amount, payment_method, reference_no FROM payments WHERE sale_id = ? ORDER BY payment_id',
    [id],
  );
  return { ...rows[0], items, payments };
}

/** Combines duplicate lines (same fruit + size) so stock is checked on the real total. */
function mergeItems(items) {
  const map = new Map();
  for (const item of items) {
    const key = `${item.fruit_id}|${item.packaging_size}`;
    const existing = map.get(key);
    if (existing) existing.quantity += item.quantity;
    else map.set(key, { fruit_id: item.fruit_id, packaging_size: item.packaging_size, quantity: item.quantity });
  }
  // Deterministic order → stock rows are always locked in the same order (avoids deadlocks)
  return [...map.values()].sort((a, b) => (a.fruit_id - b.fruit_id) || a.packaging_size.localeCompare(b.packaging_size));
}

/**
 * Records a sale with many fruit items in ONE transaction:
 *  1. vendor must be registered
 *  2. lock and check stock for EVERY item – if any item is short, reject the whole sale
 *  3. take the selling price for each packaging size from stock and calculate the total
 *  4. insert header + details, reduce stock, record the initial payment (if any)
 * Any failure → ROLLBACK: no sale, no details, no stock change.
 */
async function create({ vendor_id: vendorId, sale_date: saleDate, items, payment }) {
  return withTransaction(async (conn) => {
    // 1. Vendor
    const vendor = await vendorModel.findById(vendorId, conn);
    if (!vendor) throw AppError.notFound(`Vendor with ID ${vendorId} is not registered`);

    // 2. Stock check for all items before anything is written
    const lines = mergeItems(items);
    const problems = [];
    for (const line of lines) {
      const row = await stockModel.lockRow(conn, line.fruit_id, line.packaging_size);
      if (!row) {
        problems.push({ fruit_id: line.fruit_id, packaging_size: line.packaging_size, reason: 'Fruit/packaging size not found' });
        continue;
      }
      if (row.status !== 'ACTIVE') {
        problems.push({ fruit_id: line.fruit_id, fruit_name: row.fruit_name, packaging_size: line.packaging_size, reason: 'Fruit is INACTIVE and cannot be sold' });
        continue;
      }
      if (row.available_quantity < line.quantity) {
        problems.push({
          fruit_id: line.fruit_id,
          fruit_name: row.fruit_name,
          packaging_size: line.packaging_size,
          requested: line.quantity,
          available: row.available_quantity,
          reason: `Insufficient stock: requested ${line.quantity} ${line.packaging_size} box(es) of ${row.fruit_name}, only ${row.available_quantity} available`,
        });
        continue;
      }
      line.unit_price = Number(row.selling_price);
      line.fruit_name = row.fruit_name;
    }
    if (problems.length) {
      throw AppError.badRequest('Sale rejected – stock is unavailable. No stock was reduced and no sale was created.', problems);
    }

    // 3. Automatic total
    const { items: pricedLines, total } = calculateSaleTotal(lines);

    // Payment at time of sale (CASH / MOBILE_MONEY), or CREDIT = fully outstanding
    const method = payment ? String(payment.payment_method).toUpperCase() : 'CREDIT';
    const amountPaid = method === 'CREDIT' ? 0 : Number(payment.amount);
    if (toCents(amountPaid) > toCents(total)) {
      throw AppError.badRequest(`Payment of M${amountPaid.toFixed(2)} exceeds the sale total of M${total.toFixed(2)}`);
    }
    const status = determinePaymentStatus(total, amountPaid);

    // 4. Write header, details, stock and payment
    const [header] = await conn.execute(
      `INSERT INTO sales (vendor_id, sale_date, payment_status, total_amount, amount_paid)
       VALUES (?, COALESCE(?, CURRENT_DATE), ?, ?, ?)`,
      [vendorId, saleDate || null, status, total, amountPaid],
    );
    const saleId = header.insertId;

    for (const line of pricedLines) {
      await conn.execute(
        `INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, line.fruit_id, line.packaging_size, line.quantity, line.unit_price],
      );
      await stockModel.decrease(conn, line.fruit_id, line.packaging_size, line.quantity);
    }

    if (amountPaid > 0) {
      await conn.execute(
        `INSERT INTO payments (sale_id, payment_date, amount, payment_method, reference_no)
         VALUES (?, COALESCE(?, CURRENT_DATE), ?, ?, ?)`,
        [saleId, payment.payment_date || saleDate || null, amountPaid, method, payment.reference_no || null],
      );
    }

    const sale = await findById(saleId, conn);
    return { ...sale, outstanding_balance: calculateOutstanding(sale.total_amount, sale.amount_paid) };
  });
}

module.exports = { findAll, findById, create, mergeItems };
