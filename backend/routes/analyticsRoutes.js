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
  getDashboardSummary,
  getDailyTrends,
  getWeeklyTrends,
  getPeakComparison,
  getRecurringCongestion,
  getPerformanceComparison
} = require('../controllers/analyticsController');

const { getBottleneckPatterns } = require('../controllers/patternController');

router.get('/by-location', getCongestionByLocation);
router.get('/alerts', getAlertsSummary);
router.get('/summary', getOverallSummary);

router.get('/trends', getHistoricalTrends);
router.get('/trends/daily', getDailyTrends);
router.get('/trends/weekly', getWeeklyTrends);
router.get('/busiest-locations', getBusiestLocations);
router.get('/most-congested-routes', getMostCongestedRoutes);
router.get('/alert-stats', getAlertStats);
router.get('/dashboard-summary', getDashboardSummary);
router.get('/peak-comparison', getPeakComparison);
router.get('/recurring-congestion', getRecurringCongestion);
router.get('/performance-comparison', getPerformanceComparison);
router.get('/bottlenecks', getBottleneckPatterns);
router.get('/patterns', getBottleneckPatterns);

module.exports = router;