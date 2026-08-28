const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const trafficRoutes = require('./routes/traffic');
const cron = require('node-cron');
const { fetchTrafficData } = require('./controllers/trafficController');
const predictionRoutes = require('./routes/predictionRoutes');
const alertRoutes = require('./routes/alertRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const routeRoutes = require('./routes/routeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();          // must come first

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/reports', reportRoutes);

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

// Scheduled TomTom data fetch and Report generation every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('Running scheduled traffic data fetch and report generation...');
  try {
    const fakeReq = {};
    const fakeRes = {
      status: () => ({ json: (data) => console.log('Cron fetch result:', data.message) }),
    };
    await fetchTrafficData(fakeReq, fakeRes);
    // ... rest of your cron logic

    // Trigger python report generator script
    const venvWin = path.join(__dirname, '.venv/Scripts/python.exe');
    const venvUnix = path.join(__dirname, '.venv/bin/python');
    const pythonCmd = fs.existsSync(venvWin) ? `"${venvWin}"` : (fs.existsSync(venvUnix) ? `"${venvUnix}"` : 'python');
    const scriptPath = path.join(__dirname, 'generate_traffic_report.py');

    exec(`${pythonCmd} "${scriptPath}"`, { cwd: __dirname }, (error, stdout) => {
      if (error) {
        console.error('Scheduled report generation failed:', error.message);
      } else {
        console.log('Scheduled report generation completed:', stdout.trim());
      }
    });
  } catch (err) {
    console.error('Cron job error:', err.message);
  }
});
