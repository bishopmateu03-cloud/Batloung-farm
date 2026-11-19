/** Sales management controller. */
const Sale = require('../models/saleModel');
const AppError = require('../utils/AppError');

// POST /api/sales
async function createSale(req, res, next) {
  try {
    const vendorId = Number(req.body.vendor_id);
    const sale = await Sale.create({ ...req.body, vendor_id: vendorId });
    res.status(201).json({
      success: true,
      message: `Sale recorded for ${sale.vendor_name}: total M${Number(sale.total_amount).toFixed(2)}, status ${sale.payment_status}`,
      data: sale,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/sales?vendor_id=&payment_status=&start=&end=
async function getSales(req, res, next) {
  try {
    const filters = { ...req.query };
    if (filters.payment_status) {
      filters.payment_status = String(filters.payment_status).toUpperCase();
      if (!['PAID', 'PARTIALLY_PAID', 'UNPAID'].includes(filters.payment_status)) {
        throw AppError.badRequest('payment_status must be PAID, PARTIALLY_PAID or UNPAID');
      }
    }
    const sales = await Sale.findAll(filters);
    res.status(200).json({ success: true, count: sales.length, data: sales });
  } catch (err) {
    next(err);
  }
}

// GET /api/sales/:id
async function getSaleById(req, res, next) {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) throw AppError.notFound(`Sale with ID ${req.params.id} not found`);
    res.status(200).json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
}

module.exports = { createSale, getSales, getSaleById };
