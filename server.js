const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/db');

const { forecastCongestion } = require('./services/congestionlogic');
const {
  generateCongestionNotification,
  generateAccidentNotification
} = require('./services/notificationlogic');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('TrafficVision AI backend is running');
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/congestion/forecast', (req, res) => {
  try {
    const congestionResult = forecastCongestion(req.body);

    const notification = generateCongestionNotification(congestionResult);

    res.json({
      congestion: congestionResult,
      notification: notification
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
app.post('/api/accident/notification', (req, res) => {
  try {
    const notification = generateAccidentNotification(req.body);

    res.json({
      notification: notification
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));