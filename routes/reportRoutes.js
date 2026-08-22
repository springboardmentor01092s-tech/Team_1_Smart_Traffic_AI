const express = require('express');
const router = express.Router();
const {
  getLatestReport,
  getReportHistory,
  downloadReportPdf,
  generateReportOnDemand
} = require('../controllers/reportController');

// GET /api/reports/traffic-prediction — returns the latest JSON summary
router.get('/traffic-prediction', getLatestReport);

// GET /api/reports/traffic-prediction/history?limit=N — returns past report summaries from the reports table
router.get('/traffic-prediction/history', getReportHistory);

// GET /api/reports/traffic-prediction/pdf/:filename — downloads a specific PDF
router.get('/traffic-prediction/pdf/:filename', downloadReportPdf);

// POST /api/reports/traffic-prediction/generate — triggers the Python script on demand
router.post('/traffic-prediction/generate', generateReportOnDemand);

module.exports = router;
