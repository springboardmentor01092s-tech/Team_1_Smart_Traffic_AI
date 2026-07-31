const express = require('express');
const router = express.Router();
const { getRouteAnalysis } = require('../controllers/routeController');

router.get('/:id/analysis', getRouteAnalysis);

module.exports = router;