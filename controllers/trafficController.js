const axios = require('axios');
const pool = require('../config/db'); // adjust path to wherever your db connection file actually is
function getCongestionLevel(currentSpeed, freeFlowSpeed) {
  if (!freeFlowSpeed || freeFlowSpeed === 0) return 'unknown';
  const ratio = currentSpeed / freeFlowSpeed;

  if (ratio >= 0.8) return 'low';
  if (ratio >= 0.5) return 'moderate';
  if (ratio >= 0.3) return 'high';
  return 'severe';
}
const fetchTrafficDataCore = async () => {
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
      const congestionLevel = getCongestionLevel(flowData.currentSpeed, flowData.freeFlowSpeed);
      const vehicleCount = flowData.vehicleCount ?? null;

      const insertResult = await pool.query(
        `INSERT INTO traffic_data 
         (location_id, recorded_at, vehicle_count, average_speed_kmph, congestion_level, source)
         VALUES ($1, NOW(), $2, $3, $4, $5)
         RETURNING *`,
        [loc.location_id, vehicleCount, flowData.currentSpeed, congestionLevel, 'TomTom']
      );
      insertedData.push(insertResult.rows[0]);
    } catch (locError) {
      console.error(`Failed for location ${loc.location_id}:`, locError.message);
      failedLocations.push({ location_id: loc.location_id, error: locError.message });
    }
  }

  console.log(`✅ Traffic fetch done: ${insertedData.length} inserted, ${failedLocations.length} failed`);
  return { insertedData, failedLocations };
};

const fetchTrafficData = async (req, res) => {
  try {
    const { insertedData, failedLocations } = await fetchTrafficDataCore();
    res.status(200).json({ message: 'Traffic data updated', data: insertedData, failed: failedLocations });
  } catch (error) {
    console.error('Error fetching traffic data:', error.message);
    res.status(500).json({ error: 'Failed to fetch traffic data' });
  }
};

const getLiveTraffic = async (req, res) => {
  try {
    const { timeframe = 'live' } = req.query;

    if (timeframe === '1h' || timeframe === '24h') {
      const intervalStr = timeframe === '1h' ? "INTERVAL '1 hour'" : "INTERVAL '24 hours'";
      const result = await pool.query(`
        SELECT 
          td.data_id,
          td.location_id,
          td.recorded_at,
          td.vehicle_count,
          td.average_speed_kmph,
          COALESCE(td.current_speed, td.average_speed_kmph, 30) AS current_speed,
          COALESCE(td.free_flow_speed, 60) AS free_flow_speed,
          td.congestion_level,
          l.name AS location_name,
          l.latitude,
          l.longitude,
          l.road_type
        FROM traffic_data td
        JOIN locations l ON td.location_id = l.location_id
        WHERE td.recorded_at >= NOW() - ${intervalStr}
        ORDER BY td.recorded_at DESC;
      `);
      return res.json(result.rows);
    }

    // Default 'live': Latest recorded reading for each location
    const result = await pool.query(`
      SELECT DISTINCT ON (td.location_id)
        td.data_id,
        td.location_id,
        td.recorded_at,
        td.vehicle_count,
        td.average_speed_kmph,
        COALESCE(td.current_speed, td.average_speed_kmph, 30) AS current_speed,
        COALESCE(td.free_flow_speed, 60) AS free_flow_speed,
        td.congestion_level,
        l.name AS location_name,
        l.latitude,
        l.longitude,
        l.road_type
      FROM traffic_data td
      JOIN locations l ON td.location_id = l.location_id
      ORDER BY td.location_id, td.recorded_at DESC;
    `);

    if (result.rows.length === 0) {
      const locResult = await pool.query(`
        SELECT 
          location_id,
          name AS location_name,
          latitude,
          longitude,
          road_type,
          45 AS vehicle_count,
          35.0 AS current_speed,
          50.0 AS free_flow_speed,
          35.0 AS average_speed_kmph,
          'moderate' AS congestion_level,
          NOW() AS recorded_at
        FROM locations;
      `);
      return res.json(locResult.rows);
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching live traffic:', err.message);
    res.status(500).json({ error: 'Failed to fetch live traffic data' });
  }
};

module.exports = { fetchTrafficData, fetchTrafficDataCore, getLiveTraffic };