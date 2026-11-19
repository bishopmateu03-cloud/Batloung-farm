/** Stock controller – stock per fruit and packaging size. */
const Stock = require('../models/stockModel');
const Fruit = require('../models/fruitModel');
const AppError = require('../utils/AppError');
const { PACKAGING_SIZES } = require('../middleware/validate');

function parseSize(value) {
  if (value === undefined) return undefined;
  const size = String(value).toUpperCase();
  if (!PACKAGING_SIZES.includes(size)) {
    throw AppError.badRequest(`packaging size must be one of: ${PACKAGING_SIZES.join(', ')}`);
  }
  return size;
}

// GET /api/stock?packaging_size=LARGE
async function getStock(req, res, next) {
  try {
    const size = parseSize(req.query.packaging_size);
    const stock = await Stock.findAll({ packaging_size: size });
    res.status(200).json({ success: true, count: stock.length, data: stock });
  } catch (err) {
    next(err);
  }
}

// GET /api/stock/fruit/:fruitId
async function getStockByFruit(req, res, next) {
  try {
    const stock = await Stock.findByFruit(req.params.fruitId);
    if (!stock.length) throw AppError.notFound(`Fruit with ID ${req.params.fruitId} not found`);
    const totalBoxes = stock.reduce((sum, row) => sum + row.available_quantity, 0);
    res.status(200).json({
      success: true,
      data: { fruit_id: stock[0].fruit_id, fruit_name: stock[0].fruit_name, total_boxes: totalBoxes, by_packaging_size: stock },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/stock/low?threshold=10   (no threshold → each row's reorder_level)
async function getLowStock(req, res, next) {
  try {
    let threshold;
    if (req.query.threshold !== undefined) {
      threshold = Number(req.query.threshold);
      if (!Number.isInteger(threshold) || threshold < 0) {
        throw AppError.badRequest('threshold must be a whole number of 0 or more');
      }
    }
    const rows = await Stock.findLowStock(threshold);
    res.status(200).json({
      success: true,
      criteria: threshold !== undefined ? `available_quantity <= ${threshold}` : 'available_quantity <= reorder_level',
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/stock/:fruitId/:size  { selling_price, reorder_level }
async function updateStockSettings(req, res, next) {
  try {
    const size = parseSize(req.params.size);
    const fruitId = Number(req.params.fruitId);
    const fruit = await Fruit.findById(fruitId);
    if (!fruit) throw AppError.notFound(`Fruit with ID ${fruitId} not found`);

    const { selling_price: price } = req.body;
    if (price !== undefined) {
      // keep SMALL < MEDIUM < LARGE so every size has a different price
      const prices = { ...(await Stock.getPrices(fruitId)), [size]: Number(price) };
      if (!(prices.SMALL < prices.MEDIUM && prices.MEDIUM < prices.LARGE)) {
        throw AppError.badRequest('Selling prices must stay different per size: SMALL < MEDIUM < LARGE', [prices]);
      }
    }
    await Stock.updateSettings(fruitId, size, req.body);
    const stock = await Stock.findByFruit(fruitId);
    res.status(200).json({ success: true, message: `${fruit.fruit_name} ${size} stock settings updated`, data: stock });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStock, getStockByFruit, getLowStock, updateStockSettings };
