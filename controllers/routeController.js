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


// Internal helper for route analysis
const calculateRouteAnalysisInternal = async (routeId) => {
  const levelScore = { low: 1, moderate: 2, high: 3, severe: 4 };
  const result = await pool.query(
    `SELECT DISTINCT ON (rl.location_id)
      rl.location_id, td.congestion_level
     FROM route_locations rl
     JOIN traffic_data td ON td.location_id = rl.location_id
     WHERE rl.route_id = $1
     ORDER BY rl.location_id, td.recorded_at DESC`,
    [routeId]
  );

  const rows = result.rows;
  if (rows.length === 0) return null;

  const avgScore = rows.reduce((sum, r) => sum + (levelScore[r.congestion_level] || 1), 0) / rows.length;

  let level;
  if (avgScore <= 1.5) level = 'low';
  else if (avgScore <= 2.5) level = 'moderate';
  else level = 'high';

  return { routeId, congestionScore: parseFloat(avgScore.toFixed(2)), level };
};

// Internal helper for route travel time computation
const calculateRouteTravelTimeInternal = async (routeId) => {
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
    [routeId]
  );

  const locations = locationsResult.rows;
  if (locations.length < 2) return null;

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

    const rawSpeed = fromLoc.current_speed ?? fromLoc.average_speed_kmph ?? fromLoc.free_flow_speed;
    let speedKmph = parseFloat(rawSpeed);
    if (isNaN(speedKmph) || speedKmph <= 0) {
      speedKmph = 30;
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

  return {
    routeId,
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
    estimatedTravelTimeMinutes: parseFloat(estimatedTravelTimeMinutes.toFixed(2)),
    segments
  };
};

const getTravelTime = async (req, res) => {
  try {
    const { id } = req.params;
    const routeResult = await pool.query('SELECT route_id, name FROM routes WHERE route_id = $1', [id]);
    if (routeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Route not found' });
    }

    const result = await calculateRouteTravelTimeInternal(id);
    if (!result) {
      return res.status(400).json({ message: 'Route must contain at least 2 locations to compute travel time' });
    }

    res.json(result);
  } catch (err) {
    console.error('Error computing travel time:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Task 2: AI Route Recommendation Engine
 * GET /api/routes/recommendations?origin=&destination=
 * GET /api/routes/:id/recommendation
 */
const getRouteRecommendation = async (req, res) => {
  try {
    let routeId = req.params.id || req.query.routeId;
    const { origin, destination } = req.query;

    let targetRoute = null;

    if (routeId) {
      const routeRes = await pool.query('SELECT route_id, name FROM routes WHERE route_id = $1', [routeId]);
      if (routeRes.rows.length > 0) {
        targetRoute = routeRes.rows[0];
      }
    }

    // If no routeId or not found, try resolving via origin and destination query params
    if (!targetRoute && (origin || destination)) {
      const matchRes = await pool.query(`
        SELECT r.route_id, r.name
        FROM routes r
        JOIN route_locations rl_start ON r.route_id = rl_start.route_id
        JOIN route_locations rl_end ON r.route_id = rl_end.route_id
        JOIN locations l_start ON rl_start.location_id = l_start.location_id
        JOIN locations l_end ON rl_end.location_id = l_end.location_id
        WHERE (rl_start.sequence_order = 1 AND (l_start.location_id::text = $1 OR l_start.name ILIKE $1))
          AND (rl_end.sequence_order = (SELECT MAX(sequence_order) FROM route_locations WHERE route_id = r.route_id)
               AND (l_end.location_id::text = $2 OR l_end.name ILIKE $2))
        LIMIT 1;
      `, [origin, destination]);

      if (matchRes.rows.length > 0) {
        targetRoute = matchRes.rows[0];
        routeId = targetRoute.route_id;
      }
    }

    // Fallback: pick the first available route if none specified
    if (!targetRoute) {
      const fallbackRes = await pool.query('SELECT route_id, name FROM routes ORDER BY created_at ASC LIMIT 1');
      if (fallbackRes.rows.length === 0) {
        return res.status(404).json({ error: 'No routes found in system' });
      }
      targetRoute = fallbackRes.rows[0];
      routeId = targetRoute.route_id;
    }

    // Get origin and destination location IDs for the target route
    const endLocsRes = await pool.query(`
      SELECT 
        (SELECT location_id FROM route_locations WHERE route_id = $1 ORDER BY sequence_order ASC LIMIT 1) AS start_loc,
        (SELECT location_id FROM route_locations WHERE route_id = $1 ORDER BY sequence_order DESC LIMIT 1) AS end_loc
    `, [routeId]);

    const startLocId = endLocsRes.rows[0]?.start_loc;
    const endLocId = endLocsRes.rows[0]?.end_loc;

    // Calculate original route stats
    const origAnalysis = await calculateRouteAnalysisInternal(routeId);
    const origTravel = await calculateRouteTravelTimeInternal(routeId);

    const origScore = origAnalysis ? origAnalysis.congestionScore : 2.0;
    const origEtaMins = origTravel ? origTravel.estimatedTravelTimeMinutes : 15.0;

    // Find candidate alternate routes
    let candidateRoutesRes;
    if (startLocId && endLocId) {
      candidateRoutesRes = await pool.query(`
        SELECT r.route_id, r.name
        FROM routes r
        JOIN route_locations rl_start ON r.route_id = rl_start.route_id
        JOIN route_locations rl_end ON r.route_id = rl_end.route_id
        WHERE r.route_id != $1
          AND rl_start.sequence_order = 1 AND rl_start.location_id = $2
          AND rl_end.sequence_order = (SELECT MAX(sequence_order) FROM route_locations WHERE route_id = r.route_id)
          AND rl_end.location_id = $3
      `, [routeId, startLocId, endLocId]);
    }

    if (!candidateRoutesRes || candidateRoutesRes.rows.length === 0) {
      candidateRoutesRes = await pool.query(`
        SELECT route_id, name FROM routes WHERE route_id != $1
      `, [routeId]);
    }

    const candidateRoutes = candidateRoutesRes.rows;

    // Check last recommendation in database for hysteresis buffer lookup
    const lastRecRes = await pool.query(`
      SELECT recommended_route_id, original_route_id
      FROM recommendations
      WHERE original_route_id = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `, [targetRoute.route_id]);

    const prevRecommendedRouteId = lastRecRes.rows[0]?.recommended_route_id || null;

    let bestRecommendation = null;
    let maxMinutesSaved = -1;

    for (const alt of candidateRoutes) {
      const altAnalysis = await calculateRouteAnalysisInternal(alt.route_id);
      const altTravel = await calculateRouteTravelTimeInternal(alt.route_id);

      if (!altAnalysis || !altTravel) continue;

      const altScore = altAnalysis.congestionScore;
      const altEtaMins = altTravel.estimatedTravelTimeMinutes;

      const scoreImprovementPct = ((origScore - altScore) / (origScore || 1)) * 100;
      const timeSaved = parseFloat((origEtaMins - altEtaMins).toFixed(2));

      // Hysteresis threshold logic:
      // If this alternate route was previously recommended, hold it as long as improvement >= 10.0% (hysteresis band).
      // If evaluating a fresh candidate route, require >= 15.0% improvement threshold to switch.
      const isPrevRecommended = (prevRecommendedRouteId === alt.route_id);
      const requiredThreshold = isPrevRecommended ? 10.0 : 15.0;

      if ((scoreImprovementPct >= requiredThreshold || (altScore < origScore && timeSaved > 0)) && timeSaved >= maxMinutesSaved) {
        maxMinutesSaved = timeSaved;
        const minutesSaved = Math.max(0, timeSaved);
        const reason = `Take ${alt.name} instead of ${targetRoute.name} to avoid congestion. Congestion score is ${scoreImprovementPct.toFixed(1)}% lower, saving ~${minutesSaved} minutes.`;

        bestRecommendation = {
          status: 'alternate_available',
          recommendedRouteId: alt.route_id,
          recommendedRouteName: alt.name,
          insteadOfRouteId: targetRoute.route_id,
          insteadOfRouteName: targetRoute.name,
          originalEtaMins: origEtaMins,
          recommendedEtaMins: altEtaMins,
          minutesSaved: minutesSaved,
          congestionScoreOriginal: origScore,
          congestionScoreRecommended: altScore,
          improvementPct: parseFloat(scoreImprovementPct.toFixed(1)),
          reason: reason
        };
      }
    }

    // If no candidate route meets the threshold, return already_optimal status
    if (!bestRecommendation) {
      bestRecommendation = {
        status: 'already_optimal',
        recommendedRouteId: targetRoute.route_id,
        recommendedRouteName: targetRoute.name,
        insteadOfRouteId: targetRoute.route_id,
        insteadOfRouteName: targetRoute.name,
        originalEtaMins: origEtaMins,
        recommendedEtaMins: origEtaMins,
        minutesSaved: 0,
        congestionScoreOriginal: origScore,
        congestionScoreRecommended: origScore,
        improvementPct: 0,
        reason: `Current route (${targetRoute.name}) is optimal; no alternate route offers a >= 15% lower congestion score.`
      };
    } else {
      // Persist recommendation into recommendations table
      try {
        await pool.query(`
          INSERT INTO recommendations (
            original_route_id,
            recommended_route_id,
            original_congestion_score,
            recommended_congestion_score,
            original_eta_mins,
            recommended_eta_mins,
            minutes_saved,
            reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          bestRecommendation.insteadOfRouteId,
          bestRecommendation.recommendedRouteId,
          bestRecommendation.congestionScoreOriginal,
          bestRecommendation.congestionScoreRecommended,
          bestRecommendation.originalEtaMins,
          bestRecommendation.recommendedEtaMins,
          bestRecommendation.minutesSaved,
          bestRecommendation.reason
        ]);
      } catch (dbErr) {
        console.error('Failed to persist recommendation:', dbErr.message);
      }
    }

    res.json(bestRecommendation);
  } catch (err) {
    console.error('Error generating route recommendation:', err);
    res.status(500).json({ error: 'Failed to compute route recommendation' });
  }
};

/**
 * GET /api/routes/recommendations/history
 */
const getRecommendationHistory = async (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10) || 10;
    limit = Math.min(limit, 100);

    const result = await pool.query(`
      SELECT 
        rec.recommendation_id,
        rec.original_route_id,
        r_orig.name AS original_route_name,
        rec.recommended_route_id,
        r_rec.name AS recommended_route_name,
        rec.original_congestion_score,
        rec.recommended_congestion_score,
        rec.original_eta_mins,
        rec.recommended_eta_mins,
        rec.minutes_saved,
        rec.reason,
        rec.created_at
      FROM recommendations rec
      LEFT JOIN routes r_orig ON rec.original_route_id = r_orig.route_id
      LEFT JOIN routes r_rec ON rec.recommended_route_id = r_rec.route_id
      ORDER BY rec.created_at DESC
      LIMIT $1;
    `, [limit]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching recommendation history:', err);
    res.status(500).json({ error: 'Failed to fetch recommendation history' });
  }
};

module.exports = {
  getRouteAnalysis,
  createRoute,
  getAllRoutes,
  getRouteById,
  deleteRoute,
  getTravelTime,
  getRouteRecommendation,
  getRecommendationHistory
};

