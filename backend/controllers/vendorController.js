/** Vendor management controller. */
const Vendor = require('../models/vendorModel');
const Payment = require('../models/paymentModel');
const AppError = require('../utils/AppError');

// POST /api/vendors
async function createVendor(req, res, next) {
  try {
    const vendor = await Vendor.create(req.body);
    res.status(201).json({ success: true, message: 'Vendor registered successfully', data: vendor });
  } catch (err) {
    next(err);
  }
}

// GET /api/vendors
async function getVendors(req, res, next) {
  try {
    const vendors = await Vendor.findAll();
    res.status(200).json({ success: true, count: vendors.length, data: vendors });
  } catch (err) {
    next(err);
  }
}

// GET /api/vendors/search?q=palesa   or   ?name=...  or  ?phone=...
async function searchVendors(req, res, next) {
  try {
    const term = String(req.query.q || req.query.name || req.query.phone || '').trim();
    if (term.length < 2) {
      throw AppError.badRequest('Provide a search term of at least 2 characters using ?q=, ?name= or ?phone=');
    }
    const vendors = await Vendor.search(term);
    if (!vendors.length) throw AppError.notFound(`No vendors match "${term}"`);
    res.status(200).json({ success: true, count: vendors.length, data: vendors });
  } catch (err) {
    next(err);
  }
}

// GET /api/vendors/:id
async function getVendorById(req, res, next) {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) throw AppError.notFound(`Vendor with ID ${req.params.id} not found`);
    res.status(200).json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
}

// PUT /api/vendors/:id
async function updateVendor(req, res, next) {
  try {
    const existing = await Vendor.findById(req.params.id);
    if (!existing) throw AppError.notFound(`Vendor with ID ${req.params.id} not found`);
    const vendor = await Vendor.update(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Vendor updated successfully', data: vendor });
  } catch (err) {
    next(err);
  }
}

// GET /api/vendors/:id/balance – outstanding balance for one vendor
async function getVendorBalance(req, res, next) {
  try {
    const balance = await Payment.vendorBalance(req.params.id);
    if (!balance) throw AppError.notFound(`Vendor with ID ${req.params.id} not found`);
    res.status(200).json({ success: true, data: balance });
  } catch (err) {
    next(err);
  }
}

module.exports = { createVendor, getVendors, searchVendors, getVendorById, updateVendor, getVendorBalance };
