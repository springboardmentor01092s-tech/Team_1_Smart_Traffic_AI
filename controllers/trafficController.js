const axios = require('axios');
const pool = require('../config/db');

const getCongestionLevel = (currentSpeed, freeFlowSpeed) => {
  const ratio = currentSpeed / freeFlowSpeed;
  if (ratio >= 0.8) return 'low';
  if (ratio >= 0.6) return 'moderate';
  if (ratio >= 0.3) return 'high';
  return 'severe';
};

const fetchTrafficData = async (req, res) => {
  try {
    const locationsResult = await pool.query(
      'SELECT location_id, latitude, longitude FROM locations'
    );
    const locations = locationsResult.rows;

    const insertedData = [];
    const failedLocations = [];

    for (const loc of locations) {
      try {
        const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${loc.latitude},${loc.longitude}&key=${process.env.TOMTOM_API_KEY}`;

        const response = await axios.get(url);
        const flowData = response.data.flowSegmentData;

        const congestionLevel = getCongestionLevel(
          flowData.currentSpeed,
          flowData.freeFlowSpeed
        );

        const insertResult = await pool.query(
  `INSERT INTO traffic_data 
   (location_id, recorded_at, average_speed_kmph, congestion_level, source)
   VALUES ($1, NOW(), $2, $3, $4)
   RETURNING *`,
  [loc.location_id, flowData.currentSpeed, congestionLevel, 'TomTom']
);
// Create an alert for congestion
const alertSeverity =
    congestionLevel === 'severe' ? 'critical' :
    congestionLevel === 'high' ? 'critical' :
    congestionLevel === 'moderate' ? 'warning' :
    'info';

await pool.query(
    `INSERT INTO alerts
     (location_id, severity, message, status)
     VALUES ($1, $2, $3, 'active')`,
    [
    loc.location_id,
    alertSeverity,
    `Traffic congestion detected: ${congestionLevel}`
]
);
        insertedData.push(insertResult.rows[0]);
      } catch (locError) {
   console.log("TOMTOM ERROR STATUS:", locError.response?.status);
console.log("TOMTOM ERROR DATA:", JSON.stringify(locError.response?.data));
console.log("TOMTOM ERROR MESSAGE:", locError.message);

    failedLocations.push({
        location_id: loc.location_id,
        error: locError.response?.data || locError.message
    });
}
    }

    res.status(200).json({
      message: 'Traffic data updated',
      data: insertedData,
      failed: failedLocations,
    });
  } catch (error) {
    console.error('Error fetching traffic data:', error.message);
    res.status(500).json({ error: 'Failed to fetch traffic data' });
  }
};

module.exports = { fetchTrafficData };