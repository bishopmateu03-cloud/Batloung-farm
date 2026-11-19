/** Fruit management controller. */
const Fruit = require('../models/fruitModel');
const AppError = require('../utils/AppError');

// POST /api/fruits
async function createFruit(req, res, next) {
  try {
    const fruit = await Fruit.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Fruit registered with SMALL, MEDIUM and LARGE stock records',
      data: fruit,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/fruits?status=ACTIVE   (defaults to all fruits; ?status=ACTIVE for available only)
async function getFruits(req, res, next) {
  try {
    const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
    if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
      throw AppError.badRequest('status must be ACTIVE or INACTIVE');
    }
    const fruits = await Fruit.findAll({ status });
    res.status(200).json({ success: true, count: fruits.length, data: fruits });
  } catch (err) {
    next(err);
  }
}

// GET /api/fruits/available – active fruits that have stock in any size
async function getAvailableFruits(req, res, next) {
  try {
    const fruits = (await Fruit.findAll({ status: 'ACTIVE' })).filter((f) => Number(f.total_boxes_in_stock) > 0);
    res.status(200).json({ success: true, count: fruits.length, data: fruits });
  } catch (err) {
    next(err);
  }
}

// GET /api/fruits/:id
async function getFruitById(req, res, next) {
  try {
    const fruit = await Fruit.findById(req.params.id);
    if (!fruit) throw AppError.notFound(`Fruit with ID ${req.params.id} not found`);
    res.status(200).json({ success: true, data: fruit });
  } catch (err) {
    next(err);
  }
}

// PUT /api/fruits/:id
async function updateFruit(req, res, next) {
  try {
    const existing = await Fruit.findById(req.params.id);
    if (!existing) throw AppError.notFound(`Fruit with ID ${req.params.id} not found`);
    const fruit = await Fruit.update(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Fruit updated successfully', data: fruit });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/fruits/:id – only fruits that were never bought or sold
async function deleteFruit(req, res, next) {
  try {
    const existing = await Fruit.findById(req.params.id);
    if (!existing) throw AppError.notFound(`Fruit with ID ${req.params.id} not found`);
    const used = await Fruit.countTransactions(req.params.id);
    if (used > 0) {
      throw AppError.conflict(
        `"${existing.fruit_name}" has purchase/sales history and cannot be deleted. Set its status to INACTIVE instead.`,
      );
    }
    await Fruit.remove(req.params.id);
    res.status(200).json({ success: true, message: `Fruit "${existing.fruit_name}" deleted successfully` });
  } catch (err) {
    next(err);
  }
}

module.exports = { createFruit, getFruits, getAvailableFruits, getFruitById, updateFruit, deleteFruit };
