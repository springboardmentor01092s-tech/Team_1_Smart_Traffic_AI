const express = require('express');
const router = express.Router();
const { getAllAlerts, getAlertsByLocation, updateAlertStatus } = require('../controllers/alertController');

router.get('/', getAllAlerts);
router.patch('/:id/status', updateAlertStatus);
router.get('/:location_id', getAlertsByLocation);

module.exports = router;