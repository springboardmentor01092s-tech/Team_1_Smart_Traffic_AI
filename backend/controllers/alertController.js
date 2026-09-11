const pool = require('../config/db');

const ALLOWED_STATUSES = ['Active', 'Notified', 'Acknowledged', 'Resolved'];

const ALLOWED_TRANSITIONS = {
  Active: ['Notified'],
  Notified: ['Acknowledged'],
  Acknowledged: ['Resolved'],
  Resolved: []
};

const getAllAlerts = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT * FROM alerts`;
    const values = [];

    if (status && status.toLowerCase() !== 'all') {
      query += ` WHERE LOWER(status) = LOWER($1)`;
      values.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

const getAlertsByLocation = async (req, res) => {
  const { location_id } = req.params;
  const { status } = req.query;
  try {
    let query = `SELECT * FROM alerts WHERE location_id = $1`;
    const values = [location_id];

    if (status && status.toLowerCase() !== 'all') {
      query += ` AND LOWER(status) = LOWER($2)`;
      values.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch alerts by location error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts for this location' });
  }
};

const updateAlertStatus = async (req, res) => {
  const { id } = req.params;
  const { status, bypassValidation } = req.body;

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Atomic row-level lock prevents concurrent race conditions
    const alertResult = await client.query(
      `SELECT * FROM alerts WHERE alert_id = $1 FOR UPDATE`,
      [id]
    );

    if (alertResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Alert not found' });
    }

    const currentAlert = alertResult.rows[0];
    const currentStatus = currentAlert.status;

    // Idempotent update: if status is already identical, return current state cleanly
    if (currentStatus === status) {
      await client.query('COMMIT');
      return res.json(currentAlert);
    }

    // Enforce transition lifecycle rules unless explicitly bypassed
    if (!bypassValidation) {
      const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(status)) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Conflict: Invalid status transition from ${currentStatus} to ${status}`
        });
      }
    }

    // Atomic update statement. Sets resolved_at timestamp when Resolved, clears (NULL) if moved off Resolved
    const updateQuery = `
      UPDATE alerts
      SET status = $1::VARCHAR,
          resolved_at = CASE WHEN $1::VARCHAR = 'Resolved' THEN NOW() ELSE NULL END
      WHERE alert_id = $2
      RETURNING *
    `;

    const result = await client.query(updateQuery, [status, id]);
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update alert status error:', err);
    res.status(500).json({ error: 'Failed to update alert status' });
  } finally {
    client.release();
  }
};

module.exports = { getAllAlerts, getAlertsByLocation, updateAlertStatus };