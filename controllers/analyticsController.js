const pool = require('../config/db'); // adjust path to match your existing db connection setup

const getCongestionByLocation = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (location_id) location_id, average_speed_kmph, vehicle_count, congestion_level, recorded_at
      FROM traffic_data
      ORDER BY location_id, recorded_at DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch congestion by location' });
  }
};

const getAlertsSummary = async (req, res) => {
  try {
    const summary = await pool.query(`SELECT severity, COUNT(*) FROM alerts GROUP BY severity;`);
    const recent = await pool.query(`
      SELECT alert_id, location_id, severity, created_at 
      FROM alerts ORDER BY created_at DESC LIMIT 5;
    `);
    res.json({ summary: summary.rows, recent: recent.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alerts summary' });
  }
};

const getOverallSummary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT congestion_level, COUNT(*) 
      FROM (
        SELECT DISTINCT ON (location_id) location_id, congestion_level
        FROM traffic_data
        ORDER BY location_id, recorded_at DESC
      ) latest
      GROUP BY congestion_level;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch overall summary' });
  }
};

module.exports = { getCongestionByLocation, getAlertsSummary, getOverallSummary };