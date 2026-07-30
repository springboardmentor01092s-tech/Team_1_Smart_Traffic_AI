const express = require('express');
const router = express.Router();
const { fetchTrafficData } = require('../controllers/trafficController');

router.get('/fetch', fetchTrafficData);

module.exports = router;