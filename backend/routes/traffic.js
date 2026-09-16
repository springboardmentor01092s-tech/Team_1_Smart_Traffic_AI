const express = require('express');
const router = express.Router();
const { fetchTrafficData, getLiveTraffic } = require('../controllers/trafficController');

router.get('/', getLiveTraffic);
router.get('/fetch', fetchTrafficData);

module.exports = router;