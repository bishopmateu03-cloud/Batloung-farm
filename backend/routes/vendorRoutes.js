const router = require('express').Router();
const c = require('../controllers/vendorController');
const { validateBody, validateIdParam, schemas } = require('../middleware/validate');

router.route('/')
  .post(validateBody(schemas.vendorSchema), c.createVendor)
  .get(c.getVendors);

router.get('/search', c.searchVendors);
router.get('/:id/balance', validateIdParam('id'), c.getVendorBalance);

router.route('/:id')
  .all(validateIdParam('id'))
  .get(c.getVendorById)
  .put(validateBody(schemas.vendorSchema, { partial: true }), c.updateVendor);

module.exports = router;
