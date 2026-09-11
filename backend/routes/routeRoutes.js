const express = require('express');
const router = express.Router();
const {
  getRouteAnalysis,
  createRoute,
  getAllRoutes,
  getRouteById,
  deleteRoute,
  getTravelTime,
  getRouteRecommendation,
  getRecommendationHistory
} = require('../controllers/routeController');

router.post('/', createRoute);
router.get('/', getAllRoutes);
router.get('/recommendations', getRouteRecommendation);
router.get('/recommendations/history', getRecommendationHistory);
router.get('/:id', getRouteById);
router.delete('/:id', deleteRoute);
router.get('/:id/analysis', getRouteAnalysis);
router.get('/:id/travel-time', getTravelTime);
router.get('/:id/recommendation', getRouteRecommendation);

module.exports = router;

