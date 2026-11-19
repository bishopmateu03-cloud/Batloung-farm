const router = require('express').Router();
const c = require('../controllers/purchaseController');
const { validateBody, validateIdParam, validateItems } = require('../middleware/validate');

router.route('/')
  .post(
    validateBody({ purchase_date: { type: 'date' } }),
    validateItems('purchase'),
    c.createPurchase,
  )
  .get(c.getPurchases);

router.get('/:id', validateIdParam('id'), c.getPurchaseById);

module.exports = router;
