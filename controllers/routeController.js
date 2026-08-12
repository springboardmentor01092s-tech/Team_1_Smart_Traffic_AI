const pool = require('../config/db');
const { haversineDistance } = require('../utils/geoUtils');

const getRouteAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const levelScore = { low: 1, moderate: 2, high: 3 };

    const result = await pool.query(
      `SELECT DISTINCT ON (rl.location_id)
        rl.location_id, td.congestion_level
       FROM route_locations rl
       JOIN traffic_data td ON td.location_id = rl.location_id
       WHERE rl.route_id = $1
       ORDER BY rl.location_id, td.recorded_at DESC`,
      [id]
    );

    const rows = result.rows;
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No traffic data found for this route' });
    }

    const avgScore = rows.reduce((sum, r) => sum + levelScore[r.congestion_level], 0) / rows.length;

    let level;
    if (avgScore <= 1.5) level = 'low';
    else if (avgScore <= 2.5) level = 'moderate';
    else level = 'high';

    res.json({ routeId: id, congestionScore: avgScore, level });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTravelTime = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the route exists
    const routeResult = await pool.query('SELECT route_id, name FROM routes WHERE route_id = $1', [id]);
    if (routeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Route not found' });
    }

    // Fetch ordered locations for the route along with their latest traffic speed
    const locationsResult = await pool.query(
      `SELECT
         rl.location_id,
         rl.sequence_order,
         l.name,
         l.latitude,
         l.longitude,
         td.*
       FROM route_locations rl
       JOIN locations l ON l.location_id = rl.location_id
       LEFT JOIN LATERAL (
         SELECT *
         FROM traffic_data
         WHERE location_id = rl.location_id
         ORDER BY recorded_at DESC
         LIMIT 1
       ) td ON true
       WHERE rl.route_id = $1
       ORDER BY rl.sequence_order ASC`,
      [id]
    );

    const locations = locationsResult.rows;

    if (locations.length < 2) {
      return res.status(400).json({ message: 'Route must contain at least 2 locations to compute travel time' });
    }

    let totalDistanceKm = 0;
    let estimatedTravelTimeMinutes = 0;
    const segments = [];

    for (let i = 0; i < locations.length - 1; i++) {
      const fromLoc = locations[i];
      const toLoc = locations[i + 1];

      const dist = haversineDistance(
        fromLoc.latitude,
        fromLoc.longitude,
        toLoc.latitude,
        toLoc.longitude
      );

      // Speed fallback logic: current_speed -> average_speed_kmph -> free_flow_speed -> default (30 km/h)
      const rawSpeed = fromLoc.current_speed ?? fromLoc.average_speed_kmph ?? fromLoc.free_flow_speed;
      let speedKmph = parseFloat(rawSpeed);
      if (isNaN(speedKmph) || speedKmph <= 0) {
        speedKmph = 30; // default speed fallback
      }

      const segmentMinutes = (dist / speedKmph) * 60;

      totalDistanceKm += dist;
      estimatedTravelTimeMinutes += segmentMinutes;

      segments.push({
        fromLocationId: fromLoc.location_id,
        fromLocationName: fromLoc.name,
        toLocationId: toLoc.location_id,
        toLocationName: toLoc.name,
        distanceKm: parseFloat(dist.toFixed(2)),
        speedKmph: parseFloat(speedKmph.toFixed(2)),
        estimatedTimeMinutes: parseFloat(segmentMinutes.toFixed(2)),
      });
    }

    res.json({
      routeId: id,
      totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
      estimatedTravelTimeMinutes: parseFloat(estimatedTravelTimeMinutes.toFixed(2)),
      segments,
    });
  } catch (err) {
    console.error('Error computing travel time:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getRouteAnalysis, getTravelTime };