const express = require('express');
const router = express.Router();
const { getCongestionByLocation, getAlertsSummary, getOverallSummary } = require('../controllers/analyticsController');

router.get('/by-location', getCongestionByLocation);
router.get('/alerts', getAlertsSummary);
router.get('/summary', getOverallSummary);

module.exports = router;