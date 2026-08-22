const pool = require('../config/db'); // adjust path to your existing pg pool setup
const { v4: uuidv4 } = require('uuid'); // npm install uuid if not already installed

// Simple rule-based congestion thresholds — tune these as you gather real data
function deriveCongestionLevel(avgSpeed) {
  if (avgSpeed >= 50) return 'low';
  if (avgSpeed >= 30) return 'moderate';
  if (avgSpeed >= 15) return 'high';
  return 'severe';
}

const generatePrediction = async (req, res) => {
  const { location_id } = req.params;

  try {
    // Step 1: Fetch last 5 readings for this location
    const recentData = await pool.query(
      `SELECT average_speed_kmph, congestion_level
       FROM traffic_data
       WHERE location_id = $1
       ORDER BY recorded_at DESC
       LIMIT 5`,
      [location_id]
    );

    if (recentData.rows.length === 0) {
      return res.status(404).json({ error: 'No traffic data found for this location yet' });
    }

    // Step 2: Calculate simple averages (the rule)
    const rows = recentData.rows;
    const avgSpeed =
      rows.reduce((sum, r) => sum + parseFloat(r.average_speed_kmph), 0) / rows.length;

    // Step 3: Derive predicted congestion level from the rule
    const predictedCongestion = deriveCongestionLevel(avgSpeed);

    // Step 4: Predict for 15 minutes from now
    const predictedFor = new Date(Date.now() + 15 * 60 * 1000);

    // Step 5: Insert prediction into the predictions table
    const insertResult = await pool.query(
      `INSERT INTO predictions 
        (prediction_id, location_id, created_at, predicted_for, predicted_congestion, confidence_score, model_version)
       VALUES ($1, $2, NOW(), $3, $4, $5, $6)
       RETURNING *`,
      [
        uuidv4(),
        location_id,
        predictedFor,
        predictedCongestion,
        0.5, // placeholder confidence score for rule-based method
        'rule-based-v1'
      ]
    );

    const newPrediction = insertResult.rows[0];

// Trigger an alert if predicted congestion is high or severe
if (newPrediction.predicted_congestion === 'high' || newPrediction.predicted_congestion === 'severe') {
  const severityMap = { high: 'warning', severe: 'critical' };

  await pool.query(
    `INSERT INTO alerts
      (alert_id, location_id, prediction_id, severity, message, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [
      uuidv4(),
      newPrediction.location_id,
      newPrediction.prediction_id,
      severityMap[newPrediction.predicted_congestion],
      `${newPrediction.predicted_congestion === 'severe' ? 'Severe' : 'High'} congestion predicted at location ${newPrediction.location_id}`,
      'active'
    ]
  );
}
    res.status(201).json({
      message: 'Prediction generated successfully',
      basedOnAvgSpeed: avgSpeed.toFixed(2),
      prediction: insertResult.rows[0]
    });

  } catch (err) {
    console.error('Prediction error:', err);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
};

const getLatestPrediction = async (req, res) => {
  const { location_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM predictions WHERE location_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [location_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No predictions found for this location' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch prediction error:', err);
    res.status(500).json({ error: 'Failed to fetch prediction' });
  }
};
module.exports = { generatePrediction, getLatestPrediction };