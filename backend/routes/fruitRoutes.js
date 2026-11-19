const router = require('express').Router();
const c = require('../controllers/fruitController');
const { validateBody, validateIdParam, validateFruitPrices, schemas } = require('../middleware/validate');

router.route('/')
  .post(validateBody(schemas.fruitSchema), validateFruitPrices(), c.createFruit)
  .get(c.getFruits);

router.get('/available', c.getAvailableFruits);

router.route('/:id')
  .all(validateIdParam('id'))
  .get(c.getFruitById)
  .put(validateBody(schemas.fruitSchema, { partial: true }), c.updateFruit)
  .delete(c.deleteFruit);

module.exports = router;
