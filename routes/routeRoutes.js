const express = require('express');
const router = express.Router();
const {
  getRouteAnalysis,
  createRoute,
  getAllRoutes,
  getRouteById,
  deleteRoute,
  getTravelTime
} = require('../controllers/routeController');

router.post('/', createRoute);
router.get('/', getAllRoutes);
router.get('/:id', getRouteById);
router.delete('/:id', deleteRoute);
router.get('/:id/analysis', getRouteAnalysis);
router.get('/:id/travel-time', getTravelTime);

module.exports = router;
