const express = require('express');
const router = express.Router();
const { generatePrediction, getLatestPrediction } = require('../controllers/predictionController');

// POST /api/predictions/:location_id
router.post('/:location_id', generatePrediction);

// GET /api/predictions/:location_id
router.get('/:location_id', getLatestPrediction);

module.exports = router;