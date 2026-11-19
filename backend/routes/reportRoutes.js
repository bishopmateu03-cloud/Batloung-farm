const router = require('express').Router();
const c = require('../controllers/reportController');
const { validateDateRange } = require('../middleware/validate');

router.get('/top-fruits', c.topFruits);
router.get('/revenue', validateDateRange, c.revenue);
router.get('/top-vendor', c.topVendor);
router.get('/stock-levels', c.stockLevels);

module.exports = router;
