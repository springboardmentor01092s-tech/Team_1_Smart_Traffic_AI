const pool = require('../config/db');

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

module.exports = { getRouteAnalysis };