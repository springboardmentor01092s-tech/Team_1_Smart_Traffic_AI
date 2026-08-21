const pool = require('../config/db'); // adjust path to match your existing db connection setup

const getCongestionByLocation = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (location_id) location_id, average_speed_kmph, vehicle_count, congestion_level, recorded_at
      FROM traffic_data
      ORDER BY location_id, recorded_at DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch congestion by location' });
  }
};

const getAlertsSummary = async (req, res) => {
  try {
    const summary = await pool.query(`SELECT severity, COUNT(*) FROM alerts GROUP BY severity;`);
    const recent = await pool.query(`
      SELECT alert_id, location_id, severity, created_at 
      FROM alerts ORDER BY created_at DESC LIMIT 5;
    `);
    res.json({ summary: summary.rows, recent: recent.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alerts summary' });
  }
};

const getOverallSummary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT congestion_level, COUNT(*) 
      FROM (
        SELECT DISTINCT ON (location_id) location_id, congestion_level
        FROM traffic_data
        ORDER BY location_id, recorded_at DESC
      ) latest
      GROUP BY congestion_level;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch overall summary' });
  }
};

// Historical traffic trends per location (grouped by hour/day with timeframe filtering)
const getHistoricalTrends = async (req, res) => {
  try {
    const { location_id, timeframe = '7d', interval = 'hour' } = req.query;

    const validIntervals = ['hour', 'day'];
    const selectedInterval = validIntervals.includes(interval) ? interval : 'hour';

    let timeFilter = "NOW() - INTERVAL '7 days'";
    if (timeframe === '24h') timeFilter = "NOW() - INTERVAL '24 hours'";
    if (timeframe === '30d') timeFilter = "NOW() - INTERVAL '30 days'";
    if (timeframe === 'all') timeFilter = "'1970-01-01'::timestamp";

    const params = [];
    let locationClause = '';

    if (location_id) {
      params.push(location_id);
      locationClause = `AND td.location_id = $1`;
    }

    const query = `
      SELECT 
        td.location_id,
        l.name AS location_name,
        l.road_type,
        DATE_TRUNC('${selectedInterval}', td.recorded_at) AS time_bucket,
        ROUND(AVG(td.average_speed_kmph), 2) AS avg_speed_kmph,
        ROUND(AVG(td.vehicle_count), 0) AS avg_vehicle_count,
        COUNT(*) AS total_readings,
        MODE() WITHIN GROUP (ORDER BY td.congestion_level) AS dominant_congestion_level
      FROM traffic_data td
      JOIN locations l ON td.location_id = l.location_id
      WHERE td.recorded_at >= ${timeFilter} ${locationClause}
      GROUP BY td.location_id, l.name, l.road_type, time_bucket
      ORDER BY time_bucket DESC, l.name;
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Historical trends error:', err);
    res.status(500).json({ error: 'Failed to fetch historical trends' });
  }
};

// Busiest locations / most congested locations
const getBusiestLocations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const timeframe = req.query.timeframe || '7d';

    let timeFilter = "NOW() - INTERVAL '7 days'";
    if (timeframe === '24h') timeFilter = "NOW() - INTERVAL '24 hours'";
    if (timeframe === '30d') timeFilter = "NOW() - INTERVAL '30 days'";
    if (timeframe === 'all') timeFilter = "'1970-01-01'::timestamp";

    const query = `
      SELECT 
        l.location_id,
        l.name AS location_name,
        l.road_type,
        l.latitude,
        l.longitude,
        ROUND(AVG(td.average_speed_kmph), 2) AS avg_speed_kmph,
        ROUND(AVG(td.vehicle_count), 0) AS avg_vehicle_count,
        COUNT(td.data_id) AS total_readings,
        COUNT(CASE WHEN td.congestion_level IN ('high', 'severe') THEN 1 END) AS high_congestion_readings,
        COALESCE(
          ROUND(100.0 * COUNT(CASE WHEN td.congestion_level IN ('high', 'severe') THEN 1 END) / NULLIF(COUNT(td.data_id), 0), 1), 
          0
        ) AS congestion_percentage,
        (
          SELECT td2.congestion_level 
          FROM traffic_data td2 
          WHERE td2.location_id = l.location_id 
          ORDER BY td2.recorded_at DESC 
          LIMIT 1
        ) AS latest_congestion_level
      FROM locations l
      LEFT JOIN traffic_data td ON l.location_id = td.location_id AND td.recorded_at >= ${timeFilter}
      GROUP BY l.location_id, l.name, l.road_type, l.latitude, l.longitude
      ORDER BY avg_speed_kmph ASC, congestion_percentage DESC
      LIMIT $1;
    `;

    const result = await pool.query(query, [limit]);
    res.json(result.rows);
  } catch (err) {
    console.error('Busiest locations error:', err);
    res.status(500).json({ error: 'Failed to fetch busiest locations' });
  }
};

// Most congested routes
const getMostCongestedRoutes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const query = `
      SELECT 
        r.route_id,
        r.name AS route_name,
        COUNT(DISTINCT rl.location_id) AS total_locations,
        ROUND(AVG(latest_traffic.average_speed_kmph), 2) AS route_avg_speed_kmph,
        COUNT(CASE WHEN latest_traffic.congestion_level IN ('high', 'severe') THEN 1 END) AS congested_segments_count,
        CASE 
          WHEN AVG(CASE 
            WHEN latest_traffic.congestion_level = 'severe' THEN 4
            WHEN latest_traffic.congestion_level = 'high' THEN 3
            WHEN latest_traffic.congestion_level = 'moderate' THEN 2
            ELSE 1 
          END) >= 3.0 THEN 'severe'
          WHEN AVG(CASE 
            WHEN latest_traffic.congestion_level = 'severe' THEN 4
            WHEN latest_traffic.congestion_level = 'high' THEN 3
            WHEN latest_traffic.congestion_level = 'moderate' THEN 2
            ELSE 1 
          END) >= 2.2 THEN 'high'
          WHEN AVG(CASE 
            WHEN latest_traffic.congestion_level = 'severe' THEN 4
            WHEN latest_traffic.congestion_level = 'high' THEN 3
            WHEN latest_traffic.congestion_level = 'moderate' THEN 2
            ELSE 1 
          END) >= 1.5 THEN 'moderate'
          ELSE 'low'
        END AS route_overall_congestion
      FROM routes r
      JOIN route_locations rl ON r.route_id = rl.route_id
      LEFT JOIN LATERAL (
        SELECT average_speed_kmph, congestion_level, recorded_at
        FROM traffic_data td
        WHERE td.location_id = rl.location_id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) latest_traffic ON true
      GROUP BY r.route_id, r.name
      ORDER BY route_avg_speed_kmph ASC
      LIMIT $1;
    `;

    const result = await pool.query(query, [limit]);
    res.json(result.rows);
  } catch (err) {
    console.error('Most congested routes error:', err);
    res.status(500).json({ error: 'Failed to fetch most congested routes' });
  }
};

// Detailed alert severity & status statistics
const getAlertStats = async (req, res) => {
  try {
    const query = `
      SELECT 
        (SELECT json_object_agg(COALESCE(severity, 'unknown'), count) FROM (
          SELECT severity, COUNT(*) AS count FROM alerts GROUP BY severity
        ) s) AS by_severity,
        (SELECT json_object_agg(COALESCE(status, 'unknown'), count) FROM (
          SELECT status, COUNT(*) AS count FROM alerts GROUP BY status
        ) st) AS by_status,
        (SELECT COUNT(*) FROM alerts) AS total_alerts,
        (SELECT COUNT(*) FROM alerts WHERE status = 'active') AS active_alerts,
        (SELECT COUNT(*) FROM alerts WHERE severity = 'critical' AND status = 'active') AS active_critical_alerts,
        (
          SELECT json_agg(top_locs) FROM (
            SELECT l.location_id, l.name AS location_name, COUNT(a.alert_id) AS alert_count
            FROM alerts a
            JOIN locations l ON a.location_id = l.location_id
            GROUP BY l.location_id, l.name
            ORDER BY alert_count DESC
            LIMIT 5
          ) top_locs
        ) AS top_alerting_locations;
    `;

    const result = await pool.query(query);
    const data = result.rows[0];
    res.json({
      by_severity: data.by_severity || {},
      by_status: data.by_status || {},
      total_alerts: parseInt(data.total_alerts, 10) || 0,
      active_alerts: parseInt(data.active_alerts, 10) || 0,
      active_critical_alerts: parseInt(data.active_critical_alerts, 10) || 0,
      top_alerting_locations: data.top_alerting_locations || []
    });
  } catch (err) {
    console.error('Alert stats error:', err);
    res.status(500).json({ error: 'Failed to fetch alert stats' });
  }
};

// Overview KPI summary for dashboard widgets
const getDashboardSummary = async (req, res) => {
  try {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM locations) AS total_locations,
        (SELECT COUNT(*) FROM traffic_data) AS total_traffic_records,
        (SELECT COUNT(*) FROM alerts WHERE status = 'active') AS active_alerts_count,
        (SELECT COUNT(*) FROM alerts WHERE severity = 'critical' AND status = 'active') AS critical_alerts_count,
        (SELECT COUNT(*) FROM predictions) AS total_predictions_count,
        (
          SELECT ROUND(AVG(latest.average_speed_kmph), 2)
          FROM (
            SELECT DISTINCT ON (location_id) average_speed_kmph
            FROM traffic_data
            ORDER BY location_id, recorded_at DESC
          ) latest
        ) AS network_avg_speed_kmph,
        (
          SELECT COUNT(*)
          FROM (
            SELECT DISTINCT ON (location_id) congestion_level
            FROM traffic_data
            ORDER BY location_id, recorded_at DESC
          ) latest
          WHERE latest.congestion_level IN ('high', 'severe')
        ) AS congested_locations_count;
    `;

    const result = await pool.query(query);
    const summary = result.rows[0];

    res.json({
      total_locations: parseInt(summary.total_locations, 10) || 0,
      total_traffic_records: parseInt(summary.total_traffic_records, 10) || 0,
      active_alerts_count: parseInt(summary.active_alerts_count, 10) || 0,
      critical_alerts_count: parseInt(summary.critical_alerts_count, 10) || 0,
      total_predictions_count: parseInt(summary.total_predictions_count, 10) || 0,
      network_avg_speed_kmph: parseFloat(summary.network_avg_speed_kmph) || 0,
      congested_locations_count: parseInt(summary.congested_locations_count, 10) || 0
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
};

module.exports = { 
  getCongestionByLocation, 
  getAlertsSummary, 
  getOverallSummary,
  getHistoricalTrends,
  getBusiestLocations,
  getMostCongestedRoutes,
  getAlertStats,
  getDashboardSummary
};