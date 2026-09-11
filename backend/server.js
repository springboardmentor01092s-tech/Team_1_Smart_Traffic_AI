const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ quiet: true });
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

// Compression middleware
app.use(compression());

// Rate Limiting middleware
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' }
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

// Timeout middleware (60 seconds for long external API calls like TomTom fetching)
const timeoutMiddleware = (timeoutMs = 60000) => (req, res, next) => {
  req.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request Timeout' });
    }
  });
  res.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request Timeout' });
    }
  });
  next();
};

app.use(timeoutMiddleware());
app.use('/api/', publicLimiter);
app.use('/api/auth', authLimiter);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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

// Health check endpoint verifying DB connectivity
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'UP',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'DOWN',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('PostgreSQL pool closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error closing database pool:', err.message);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Forceful shutdown triggered after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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

