const router = require('express').Router();
const c = require('../controllers/saleController');
const { validateBody, validateIdParam, validateItems, validatePayment } = require('../middleware/validate');

router.route('/')
  .post(
    validateBody({
      vendor_id: { type: 'integer', required: true, min: 1 },
      sale_date: { type: 'date' },
    }),
    validateItems('sale'),
    validatePayment(),
    c.createSale,
  )
  .get(c.getSales);

router.get('/:id', validateIdParam('id'), c.getSaleById);

module.exports = router;
