const express = require('express');
const router = express.Router();
const { getRouteAnalysis, getTravelTime } = require('../controllers/routeController');

router.get('/:id/analysis', getRouteAnalysis);
router.get('/:id/travel-time', getTravelTime);

module.exports = router;