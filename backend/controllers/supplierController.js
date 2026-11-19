/** Supplier management controller. */
const Supplier = require('../models/supplierModel');
const AppError = require('../utils/AppError');
const { PROVINCES } = require('../middleware/validate');

// POST /api/suppliers
async function createSupplier(req, res, next) {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, message: 'Supplier registered successfully', data: supplier });
  } catch (err) {
    next(err);
  }
}

// GET /api/suppliers?province=Limpopo
async function getSuppliers(req, res, next) {
  try {
    const { province } = req.query;
    if (province && !PROVINCES.includes(province)) {
      throw AppError.badRequest(`province must be one of: ${PROVINCES.join(', ')}`);
    }
    const suppliers = await Supplier.findAll({ province });
    res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (err) {
    next(err);
  }
}

// GET /api/suppliers/:id
async function getSupplierById(req, res, next) {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) throw AppError.notFound(`Supplier with ID ${req.params.id} not found`);
    res.status(200).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
}

// PUT /api/suppliers/:id
async function updateSupplier(req, res, next) {
  try {
    const existing = await Supplier.findById(req.params.id);
    if (!existing) throw AppError.notFound(`Supplier with ID ${req.params.id} not found`);
    const supplier = await Supplier.update(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Supplier updated successfully', data: supplier });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/suppliers/:id
// Business constraint: a supplier with recorded purchases cannot be deleted
// (it would destroy purchase history and stock audit trail).
async function deleteSupplier(req, res, next) {
  try {
    const existing = await Supplier.findById(req.params.id);
    if (!existing) throw AppError.notFound(`Supplier with ID ${req.params.id} not found`);

    const purchases = await Supplier.countPurchases(req.params.id);
    if (purchases > 0) {
      throw AppError.conflict(
        `Supplier "${existing.business_name}" cannot be deleted because it has ${purchases} recorded purchase(s)`,
      );
    }
    await Supplier.remove(req.params.id);
    res.status(200).json({ success: true, message: `Supplier "${existing.business_name}" deleted successfully` });
  } catch (err) {
    next(err);
  }
}

module.exports = { createSupplier, getSuppliers, getSupplierById, updateSupplier, deleteSupplier };
