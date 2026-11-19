/** Purchase management controller. */
const Purchase = require('../models/purchaseModel');
const AppError = require('../utils/AppError');
const { validateBody, schemas } = require('../middleware/validate');

/** Validates the supplier block: either supplier_id or a full new supplier object. */
function checkSupplier(body) {
  return new Promise((resolve, reject) => {
    if (body.supplier_id !== undefined) {
      if (!Number.isInteger(Number(body.supplier_id)) || Number(body.supplier_id) < 1) {
        reject(AppError.badRequest('Validation failed', ['supplier_id must be a positive whole number']));
      } else resolve();
      return;
    }
    if (!body.supplier || typeof body.supplier !== 'object') {
      reject(AppError.badRequest('Validation failed', ['Provide supplier_id, or supplier details to register a new supplier']));
      return;
    }
    validateBody(schemas.supplierSchema)({ body: body.supplier }, null, (err) => (err ? reject(err) : resolve()));
  });
}

// POST /api/purchases
async function createPurchase(req, res, next) {
  try {
    await checkSupplier(req.body);
    const purchase = await Purchase.create(req.body);
    res.status(201).json({
      success: true,
      message: `Purchase recorded: ${purchase.items.length} item(s), total M${Number(purchase.total_amount).toFixed(2)}. Stock updated.`,
      data: purchase,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/purchases?supplier_id=&start=&end=
async function getPurchases(req, res, next) {
  try {
    const purchases = await Purchase.findAll(req.query);
    res.status(200).json({ success: true, count: purchases.length, data: purchases });
  } catch (err) {
    next(err);
  }
}

// GET /api/purchases/:id
async function getPurchaseById(req, res, next) {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) throw AppError.notFound(`Purchase with ID ${req.params.id} not found`);
    res.status(200).json({ success: true, data: purchase });
  } catch (err) {
    next(err);
  }
}

module.exports = { createPurchase, getPurchases, getPurchaseById };
