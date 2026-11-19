const router = require('express').Router();
const c = require('../controllers/paymentController');
const { validateBody, validatePayment } = require('../middleware/validate');

router.route('/')
  .post(
    validatePayment({ requireSaleId: true }),
    validateBody({ reference_no: { type: 'string', max: 50 } }),
    c.createPayment,
  )
  .get(c.getPayments);

router.get('/balances', c.getVendorBalances);

module.exports = router;
