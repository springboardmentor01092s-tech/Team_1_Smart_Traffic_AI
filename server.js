const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const cron = require('node-cron');
const { fetchTrafficData } = require('./controllers/trafficController');
const predictionRoutes = require('./routes/predictionRoutes');
const alertRoutes = require('./routes/alertRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const routeRoutes = require('./routes/routeRoutes');

const app = express();          // must come first

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/routes', routeRoutes);

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

cron.schedule('*/15 * * * *', async () => {
  console.log('Running scheduled traffic data fetch...');
  try {
    const fakeReq = {};
    const fakeRes = {
      status: () => ({ json: (data) => console.log('Cron result:', data.message) }),
    };
    await fetchTrafficData(fakeReq, fakeRes);
  } catch (err) {
    console.error('Cron job error:', err.message);
  }
});