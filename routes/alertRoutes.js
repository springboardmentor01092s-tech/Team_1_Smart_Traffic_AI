const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM alerts
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching alerts:', err.message);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ['active', 'acknowledged', 'resolved'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status. Use active, acknowledged, or resolved.'
    });
  }

  try {
    const result = await pool.query(
  `
  UPDATE alerts
  SET
    status = CAST($1 AS VARCHAR),
    resolved_at = CASE
      WHEN CAST($1 AS VARCHAR) = 'resolved' THEN CURRENT_TIMESTAMP
      ELSE resolved_at
    END
  WHERE alert_id = $2
  RETURNING *
  `,
  [status, id]
);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('FULL ALERT UPDATE ERROR:', err);
    res.status(500).json({
        error: err.message,
        code: err.code,
        detail: err.detail
    });
}
});
module.exports = router;