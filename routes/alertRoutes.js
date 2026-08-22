const express = require('express');
const router = express.Router();
const { getAllAlerts, getAlertsByLocation } = require('../controllers/alertController');

router.get('/', getAllAlerts);
router.get('/:location_id', getAlertsByLocation);

module.exports = router;