/**
 * Vendor payment management:
 * CASH and MOBILE_MONEY payments against sales; unpaid amounts are outstanding credit.
 */
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const { withTransaction } = require('../utils/transaction');
const { determinePaymentStatus, calculateOutstanding, toCents, fromCents } = require('../utils/calculations');

/** Records a payment against a sale and updates the sale's payment status. */
async function create({ sale_id: saleId, amount, payment_method: method, payment_date: date, reference_no: ref }) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      'SELECT sale_id, vendor_id, total_amount, amount_paid FROM sales WHERE sale_id = ? FOR UPDATE',
      [saleId],
    );
    const sale = rows[0];
    if (!sale) throw AppError.notFound(`Sale with ID ${saleId} not found`);

    const outstanding = calculateOutstanding(sale.total_amount, sale.amount_paid);
    if (outstanding <= 0) throw AppError.badRequest(`Sale ${saleId} is already fully PAID`);
    if (toCents(amount) > toCents(outstanding)) {
      throw AppError.badRequest(`Payment of M${Number(amount).toFixed(2)} exceeds the outstanding balance of M${outstanding.toFixed(2)}`);
    }

    const [result] = await conn.execute(
      `INSERT INTO payments (sale_id, payment_date, amount, payment_method, reference_no)
       VALUES (?, COALESCE(?, CURRENT_DATE), ?, ?, ?)`,
      [saleId, date || null, Number(amount), method.toUpperCase(), ref || null],
    );

    const newPaid = fromCents(toCents(sale.amount_paid) + toCents(amount));
    const status = determinePaymentStatus(sale.total_amount, newPaid);
    await conn.execute(
      'UPDATE sales SET amount_paid = ?, payment_status = ? WHERE sale_id = ?',
      [newPaid, status, saleId],
    );

    return {
      payment_id: result.insertId,
      sale_id: saleId,
      vendor_id: sale.vendor_id,
      amount: Number(amount),
      payment_method: method.toUpperCase(),
      sale_total: Number(sale.total_amount),
      amount_paid: newPaid,
      outstanding_balance: calculateOutstanding(sale.total_amount, newPaid),
      payment_status: status,
    };
  });
}

async function findAll({ sale_id: saleId, method } = {}) {
  const where = [];
  const params = [];
  if (saleId) { where.push('p.sale_id = ?'); params.push(saleId); }
  if (method) { where.push('p.payment_method = ?'); params.push(method); }
  const [rows] = await pool.execute(
    `SELECT p.*, s.vendor_id, v.vendor_name
     FROM payments p
     JOIN sales s ON s.sale_id = p.sale_id
     JOIN vendors v ON v.vendor_id = s.vendor_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY p.payment_date DESC, p.payment_id DESC`,
    params,
  );
  return rows;
}

/** Outstanding balance for every vendor (optionally only those who owe money). */
async function vendorBalances({ onlyOutstanding = false } = {}) {
  const [rows] = await pool.execute(
    `SELECT v.vendor_id, v.vendor_name, v.phone_number,
            COUNT(s.sale_id) AS number_of_sales,
            COALESCE(SUM(s.total_amount), 0) AS total_billed,
            COALESCE(SUM(s.amount_paid), 0)  AS total_paid,
            COALESCE(SUM(s.total_amount - s.amount_paid), 0) AS outstanding_balance,
            COALESCE(SUM(s.payment_status = 'UNPAID'), 0)         AS unpaid_sales,
            COALESCE(SUM(s.payment_status = 'PARTIALLY_PAID'), 0) AS partially_paid_sales
     FROM vendors v
     LEFT JOIN sales s ON s.vendor_id = v.vendor_id
     GROUP BY v.vendor_id, v.vendor_name, v.phone_number
     ${onlyOutstanding ? 'HAVING outstanding_balance > 0' : ''}
     ORDER BY outstanding_balance DESC, v.vendor_name`,
  );
  return rows;
}

/** Balance and open (unpaid / partially paid) sales for one vendor. */
async function vendorBalance(vendorId) {
  const [vendors] = await pool.execute('SELECT vendor_id, vendor_name, phone_number FROM vendors WHERE vendor_id = ?', [vendorId]);
  if (!vendors[0]) return null;
  const [sales] = await pool.execute(
    `SELECT sale_id, sale_date, payment_status, total_amount, amount_paid,
            (total_amount - amount_paid) AS outstanding_balance
     FROM sales WHERE vendor_id = ? ORDER BY sale_date, sale_id`,
    [vendorId],
  );
  const totals = sales.reduce((acc, s) => {
    acc.total_billed += toCents(s.total_amount);
    acc.total_paid += toCents(s.amount_paid);
    return acc;
  }, { total_billed: 0, total_paid: 0 });

  return {
    ...vendors[0],
    total_billed: fromCents(totals.total_billed),
    total_paid: fromCents(totals.total_paid),
    outstanding_balance: fromCents(totals.total_billed - totals.total_paid),
    open_sales: sales.filter((s) => s.payment_status !== 'PAID'),
  };
}

module.exports = { create, findAll, vendorBalances, vendorBalance };
