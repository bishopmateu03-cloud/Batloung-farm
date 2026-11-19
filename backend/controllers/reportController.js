/** Reporting controller (PART D SQL reports). */
const Report = require('../models/reportModel');

// GET /api/reports/top-fruits?limit=5
async function topFruits(req, res, next) {
  try {
    const data = await Report.topSellingFruits(req.query.limit || 5);
    res.status(200).json({ success: true, report: 'Most frequently sold fruits', count: data.length, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/revenue?start=2026-10-01&end=2026-10-31
async function revenue(req, res, next) {
  try {
    const data = await Report.revenueBetween(req.query.start, req.query.end);
    res.status(200).json({ success: true, report: 'Total sales revenue for date range', data });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/top-vendor
async function topVendor(req, res, next) {
  try {
    const data = await Report.topVendorByBoxes();
    res.status(200).json({ success: true, report: 'Vendor with the highest number of boxes purchased', data });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/stock-levels
async function stockLevels(req, res, next) {
  try {
    const data = await Report.currentStockLevels();
    res.status(200).json({ success: true, report: 'Current stock levels per fruit and packaging size', count: data.length, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { topFruits, revenue, topVendor, stockLevels };
