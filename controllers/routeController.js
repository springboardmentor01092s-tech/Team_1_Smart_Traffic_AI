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

// Create a new route with ordered locations using PostgreSQL transaction
const createRoute = async (req, res) => {
  const { name, location_ids, created_by } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Route name is required' });
  }

  if (!Array.isArray(location_ids) || location_ids.length === 0) {
    return res.status(400).json({ error: 'location_ids must be a non-empty array of location UUIDs' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert into routes table
    const routeResult = await client.query(
      `INSERT INTO routes (name, created_by)
       VALUES ($1, $2)
       RETURNING route_id, name, created_by, created_at`,
      [name.trim(), created_by || null]
    );

    const newRoute = routeResult.rows[0];

    // 2. Insert linked rows into route_locations with 1-based sequence_order
    const locationInserts = [];
    for (let index = 0; index < location_ids.length; index++) {
      const locationId = location_ids[index];
      const seqOrder = index + 1;

      const locResult = await client.query(
        `INSERT INTO route_locations (route_id, location_id, sequence_order)
         VALUES ($1, $2, $3)
         RETURNING location_id, sequence_order`,
        [newRoute.route_id, locationId, seqOrder]
      );
      locationInserts.push(locResult.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Route created successfully',
      route: {
        ...newRoute,
        locations: locationInserts
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create route error:', err.message);

    if (err.code === '23503') {
      return res.status(400).json({ error: 'One or more location_ids or created_by user_ids do not exist' });
    }

    res.status(500).json({ error: 'Failed to create route' });
  } finally {
    client.release();
  }
};

// Get all routes with ordered location sequence
const getAllRoutes = async (req, res) => {
  try {
    const query = `
      SELECT 
        r.route_id,
        r.name,
        r.created_by,
        r.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'location_id', l.location_id,
              'name', l.name,
              'road_type', l.road_type,
              'latitude', l.latitude,
              'longitude', l.longitude,
              'sequence_order', rl.sequence_order
            ) ORDER BY rl.sequence_order ASC
          ) FILTER (WHERE l.location_id IS NOT NULL),
          '[]'::json
        ) AS locations
      FROM routes r
      LEFT JOIN route_locations rl ON r.route_id = rl.route_id
      LEFT JOIN locations l ON rl.location_id = l.location_id
      GROUP BY r.route_id, r.name, r.created_by, r.created_at
      ORDER BY r.created_at DESC;
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Get all routes error:', err);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
};

// Get a single route by ID with ordered locations
const getRouteById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        r.route_id,
        r.name,
        r.created_by,
        r.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'location_id', l.location_id,
              'name', l.name,
              'road_type', l.road_type,
              'latitude', l.latitude,
              'longitude', l.longitude,
              'sequence_order', rl.sequence_order
            ) ORDER BY rl.sequence_order ASC
          ) FILTER (WHERE l.location_id IS NOT NULL),
          '[]'::json
        ) AS locations
      FROM routes r
      LEFT JOIN route_locations rl ON r.route_id = rl.route_id
      LEFT JOIN locations l ON rl.location_id = l.location_id
      WHERE r.route_id = $1
      GROUP BY r.route_id, r.name, r.created_by, r.created_at;
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get route by ID error:', err);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
};

// Delete a route by ID
const deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM routes WHERE route_id = $1 RETURNING route_id, name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({
      message: 'Route deleted successfully',
      deleted_route: result.rows[0]
    });
  } catch (err) {
    console.error('Delete route error:', err);
    res.status(500).json({ error: 'Failed to delete route' });
  }
};

module.exports = { 
  getRouteAnalysis, 
  createRoute, 
  getAllRoutes, 
  getRouteById, 
  deleteRoute 
};