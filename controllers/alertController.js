const pool = require('../config/db');

const getAllAlerts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM alerts ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

const getAlertsByLocation = async (req, res) => {
  const { location_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM alerts WHERE location_id = $1 ORDER BY created_at DESC`,
      [location_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch alerts by location error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts for this location' });
  }
};

module.exports = { getAllAlerts, getAlertsByLocation };