/** Vendor payment management controller. */
const Payment = require('../models/paymentModel');
const AppError = require('../utils/AppError');

// POST /api/payments  { sale_id, amount, payment_method: CASH | MOBILE_MONEY, reference_no?, payment_date? }
async function createPayment(req, res, next) {
  try {
    const result = await Payment.create({ ...req.body, sale_id: Number(req.body.sale_id) });
    res.status(201).json({
      success: true,
      message: `Payment recorded. Sale ${result.sale_id} is now ${result.payment_status}; outstanding M${result.outstanding_balance.toFixed(2)}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/payments?sale_id=&method=
async function getPayments(req, res, next) {
  try {
    const method = req.query.method ? String(req.query.method).toUpperCase() : undefined;
    if (method && !['CASH', 'MOBILE_MONEY'].includes(method)) {
      throw AppError.badRequest('method must be CASH or MOBILE_MONEY');
    }
    const payments = await Payment.findAll({ sale_id: req.query.sale_id, method });
    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    next(err);
  }
}

// GET /api/payments/balances?outstanding=true
async function getVendorBalances(req, res, next) {
  try {
    const onlyOutstanding = String(req.query.outstanding).toLowerCase() === 'true';
    const balances = await Payment.vendorBalances({ onlyOutstanding });
    const totalOutstanding = balances.reduce((sum, b) => sum + Math.round(Number(b.outstanding_balance) * 100), 0) / 100;
    res.status(200).json({ success: true, count: balances.length, total_outstanding: totalOutstanding, data: balances });
  } catch (err) {
    next(err);
  }
}

module.exports = { createPayment, getPayments, getVendorBalances };
