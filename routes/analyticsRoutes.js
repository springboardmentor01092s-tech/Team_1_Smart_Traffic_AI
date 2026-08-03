const express = require('express');
const router = express.Router();
const { 
  getCongestionByLocation, 
  getAlertsSummary, 
  getOverallSummary,
  getHistoricalTrends,
  getBusiestLocations,
  getMostCongestedRoutes,
  getAlertStats,
  getDashboardSummary
} = require('../controllers/analyticsController');

router.get('/by-location', getCongestionByLocation);
router.get('/alerts', getAlertsSummary);
router.get('/summary', getOverallSummary);

router.get('/trends', getHistoricalTrends);
router.get('/busiest-locations', getBusiestLocations);
router.get('/most-congested-routes', getMostCongestedRoutes);
router.get('/alert-stats', getAlertStats);
router.get('/dashboard-summary', getDashboardSummary);

module.exports = router;