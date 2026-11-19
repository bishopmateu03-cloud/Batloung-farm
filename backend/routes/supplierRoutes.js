const router = require('express').Router();
const c = require('../controllers/supplierController');
const { validateBody, validateIdParam, schemas } = require('../middleware/validate');

router.route('/')
  .post(validateBody(schemas.supplierSchema), c.createSupplier)
  .get(c.getSuppliers);

router.route('/:id')
  .all(validateIdParam('id'))
  .get(c.getSupplierById)
  .put(validateBody(schemas.supplierSchema, { partial: true }), c.updateSupplier)
  .delete(c.deleteSupplier);

module.exports = router;
