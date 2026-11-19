const router = require('express').Router();
const c = require('../controllers/stockController');
const { validateBody, validateIdParam } = require('../middleware/validate');

router.get('/', c.getStock);
router.get('/low', c.getLowStock);
router.get('/fruit/:fruitId', validateIdParam('fruitId'), c.getStockByFruit);
router.put(
  '/:fruitId/:size',
  validateIdParam('fruitId'),
  validateBody({
    selling_price: { type: 'number', positive: true },
    reorder_level: { type: 'integer', min: 0 },
  }, { partial: true }),
  c.updateStockSettings,
);

module.exports = router;
