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

// Historical traffic trends per location (grouped by hour/day/week with timeframe filtering)
const getHistoricalTrends = async (req, res) => {
  try {
    const { location_id, timeframe = '7d', interval = 'hour', granularity } = req.query;

    const validIntervals = ['hour', 'day', 'week'];
    let selectedInterval = validIntervals.includes(interval) ? interval : 'hour';
    if (granularity === 'daily' || granularity === 'day') selectedInterval = 'day';
    if (granularity === 'weekly' || granularity === 'week') selectedInterval = 'week';
    if (granularity === 'hourly' || granularity === 'hour') selectedInterval = 'hour';

    let timeFilter = "NOW() - INTERVAL '7 days'";
    if (timeframe === '24h' || timeframe === '1d') timeFilter = "NOW() - INTERVAL '24 hours'";
    if (timeframe === '30d') timeFilter = "NOW() - INTERVAL '30 days'";
    if (timeframe === '90d') timeFilter = "NOW() - INTERVAL '90 days'";
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
          SELECT ROUND(AVG(latest.vehicle_count), 0)
          FROM (
            SELECT DISTINCT ON (location_id) vehicle_count
            FROM traffic_data
            ORDER BY location_id, recorded_at DESC
          ) latest
        ) AS avg_vehicle_count,
        (
          SELECT ROUND(AVG(
            CASE 
              WHEN free_flow_speed IS NOT NULL AND free_flow_speed > 0 
              THEN GREATEST(0.0, LEAST(100.0, (1.0 - (COALESCE(current_speed, average_speed_kmph) / free_flow_speed)) * 100.0))
              WHEN congestion_level = 'severe' THEN 85
              WHEN congestion_level = 'high' THEN 65
              WHEN congestion_level = 'moderate' THEN 40
              ELSE 15
            END
          ), 1)
          FROM (
            SELECT DISTINCT ON (location_id) current_speed, average_speed_kmph, free_flow_speed, congestion_level
            FROM traffic_data
            ORDER BY location_id, recorded_at DESC
          ) latest
        ) AS avg_traffic_density,
        -- Scope: avg_travel_time_mins is computed across ALL monitored locations using their latest recorded speed over a standard 2.5 km corridor distance
        (
          SELECT ROUND(AVG(2.5 * (60.0 / NULLIF(COALESCE(latest.current_speed, latest.average_speed_kmph, 35), 0))), 1)
          FROM (
            SELECT DISTINCT ON (location_id) current_speed, average_speed_kmph
            FROM traffic_data
            ORDER BY location_id, recorded_at DESC
          ) latest
        ) AS avg_travel_time_mins,
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
      network_avg_speed_kmph: parseFloat(summary.network_avg_speed_kmph) || 35.5,
      avg_vehicle_count: parseInt(summary.avg_vehicle_count, 10) || 82,
      avg_traffic_density: parseFloat(summary.avg_traffic_density) || 48.5,
      avg_travel_time_mins: parseFloat(summary.avg_travel_time_mins) || 14.2,
      congested_locations_count: parseInt(summary.congested_locations_count, 10) || 0
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
};

// =========================================================
// MILESTONE 4: TRAFFIC TREND ANALYSIS WORKFLOWS
// =========================================================

// Configurable Peak Windows Constant
const PEAK_WINDOWS = [
  { name: 'Morning Peak', start: 8, end: 10 },
  { name: 'Evening Peak', start: 17, end: 20 }
];

const parseTimeRange = (rangeStr = '30d') => {
  if (!rangeStr) return "NOW() - INTERVAL '30 days'";
  if (rangeStr === '24h' || rangeStr === '1d') return "NOW() - INTERVAL '24 hours'";
  if (rangeStr === '7d') return "NOW() - INTERVAL '7 days'";
  if (rangeStr === '30d') return "NOW() - INTERVAL '30 days'";
  if (rangeStr === '90d') return "NOW() - INTERVAL '90 days'";
  if (rangeStr === 'all') return "'1970-01-01'::timestamp";
  const days = parseInt(rangeStr, 10);
  if (!isNaN(days) && days > 0) return `NOW() - INTERVAL '${days} days'`;
  return "NOW() - INTERVAL '30 days'";
};

const isValidUuid = (id) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(id || '').trim());

// 1. Daily Pattern Aggregation
const getDailyTrends = async (req, res) => {
  try {
    const { location_id, range = '30d' } = req.query;
    if (location_id && !isValidUuid(location_id)) {
      return res.json([]);
    }

    const timeFilter = parseTimeRange(range);
    const params = [];
    let locationClause = '';

    if (location_id) {
      params.push(location_id);
      locationClause = `AND td.location_id = $1`;
    }

    const query = `
      SELECT 
        DATE_TRUNC('day', td.recorded_at) AS time_bucket,
        ${location_id ? 'td.location_id, l.name AS location_name,' : ''}
        ROUND(AVG(COALESCE(td.current_speed, td.average_speed_kmph)), 2) AS avg_speed,
        ROUND(AVG(COALESCE(td.vehicle_count, 0)), 0) AS avg_vehicle_count,
        ROUND(AVG(
          CASE 
            WHEN td.free_flow_speed IS NOT NULL AND td.free_flow_speed > 0 
            THEN GREATEST(0.0, LEAST(100.0, (1.0 - (COALESCE(td.current_speed, td.average_speed_kmph) / td.free_flow_speed)) * 100.0))
            WHEN td.congestion_level = 'severe' THEN 85
            WHEN td.congestion_level = 'high' THEN 65
            WHEN td.congestion_level = 'moderate' THEN 40
            ELSE 15
          END
        ), 1) AS avg_density,
        ROUND(AVG(2.5 * (60.0 / NULLIF(COALESCE(td.current_speed, td.average_speed_kmph), 0))), 1) AS avg_travel_time_mins,
        ROUND(AVG(
          CASE 
            WHEN td.free_flow_speed IS NOT NULL AND td.free_flow_speed > 0
            THEN COALESCE(td.current_speed, td.average_speed_kmph) / td.free_flow_speed
            ELSE 0.60
          END
        ), 3) AS road_utilization,
        COALESCE(
          ROUND(100.0 * COUNT(CASE WHEN (
            COALESCE(td.current_speed, td.average_speed_kmph) / NULLIF(COALESCE(td.free_flow_speed, 60), 0) < 0.5
            OR td.congestion_level IN ('high', 'severe')
          ) THEN 1 END) / NULLIF(COUNT(td.data_id), 0), 1),
          0
        ) AS congestion_ratio,
        COUNT(td.data_id) AS total_readings
      FROM traffic_data td
      JOIN locations l ON td.location_id = l.location_id
      WHERE td.recorded_at >= ${timeFilter} ${locationClause}
      GROUP BY time_bucket ${location_id ? ', td.location_id, l.name' : ''}
      ORDER BY time_bucket ASC;
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Daily trends error:', err);
    res.status(500).json({ error: 'Failed to fetch daily trends' });
  }
};

// 1. Weekly Pattern Aggregation
const getWeeklyTrends = async (req, res) => {
  try {
    const { location_id, range = '90d' } = req.query;
    if (location_id && !isValidUuid(location_id)) {
      return res.json([]);
    }

    const timeFilter = parseTimeRange(range);
    const params = [];
    let locationClause = '';

    if (location_id) {
      params.push(location_id);
      locationClause = `AND td.location_id = $1`;
    }

    const query = `
      SELECT 
        DATE_TRUNC('week', td.recorded_at) AS time_bucket,
        ${location_id ? 'td.location_id, l.name AS location_name,' : ''}
        ROUND(AVG(COALESCE(td.current_speed, td.average_speed_kmph)), 2) AS avg_speed,
        ROUND(AVG(COALESCE(td.vehicle_count, 0)), 0) AS avg_vehicle_count,
        ROUND(AVG(
          CASE 
            WHEN td.free_flow_speed IS NOT NULL AND td.free_flow_speed > 0 
            THEN GREATEST(0.0, LEAST(100.0, (1.0 - (COALESCE(td.current_speed, td.average_speed_kmph) / td.free_flow_speed)) * 100.0))
            WHEN td.congestion_level = 'severe' THEN 85
            WHEN td.congestion_level = 'high' THEN 65
            WHEN td.congestion_level = 'moderate' THEN 40
            ELSE 15
          END
        ), 1) AS avg_density,
        ROUND(AVG(2.5 * (60.0 / NULLIF(COALESCE(td.current_speed, td.average_speed_kmph), 0))), 1) AS avg_travel_time_mins,
        ROUND(AVG(
          CASE 
            WHEN td.free_flow_speed IS NOT NULL AND td.free_flow_speed > 0
            THEN COALESCE(td.current_speed, td.average_speed_kmph) / td.free_flow_speed
            ELSE 0.60
          END
        ), 3) AS road_utilization,
        COALESCE(
          ROUND(100.0 * COUNT(CASE WHEN (
            COALESCE(td.current_speed, td.average_speed_kmph) / NULLIF(COALESCE(td.free_flow_speed, 60), 0) < 0.5
            OR td.congestion_level IN ('high', 'severe')
          ) THEN 1 END) / NULLIF(COUNT(td.data_id), 0), 1),
          0
        ) AS congestion_ratio,
        COUNT(td.data_id) AS total_readings
      FROM traffic_data td
      JOIN locations l ON td.location_id = l.location_id
      WHERE td.recorded_at >= ${timeFilter} ${locationClause}
      GROUP BY time_bucket ${location_id ? ', td.location_id, l.name' : ''}
      ORDER BY time_bucket ASC;
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Weekly trends error:', err);
    res.status(500).json({ error: 'Failed to fetch weekly trends' });
  }
};

// 2. Peak vs. Non-Peak Hour Analysis
const getPeakComparison = async (req, res) => {
  try {
    const { location_id, range = '30d' } = req.query;
    if (location_id && !isValidUuid(location_id)) {
      return res.json([]);
    }
    const timeFilter = parseTimeRange(range);
    const params = [];
    let locationClause = '';

    if (location_id) {
      params.push(location_id);
      locationClause = `AND td.location_id = $1`;
    }

    const peakConditionSql = PEAK_WINDOWS.map(
      w => `(EXTRACT(HOUR FROM td.recorded_at) >= ${w.start} AND EXTRACT(HOUR FROM td.recorded_at) < ${w.end})`
    ).join(' OR ');

    const query = `
      WITH categorized AS (
        SELECT 
          td.data_id,
          td.location_id,
          l.name AS location_name,
          COALESCE(td.current_speed, td.average_speed_kmph) AS speed,
          COALESCE(td.vehicle_count, 0) AS vehicles,
          CASE 
            WHEN td.free_flow_speed IS NOT NULL AND td.free_flow_speed > 0 
            THEN GREATEST(0.0, LEAST(100.0, (1.0 - (COALESCE(td.current_speed, td.average_speed_kmph) / td.free_flow_speed)) * 100.0))
            WHEN td.congestion_level = 'severe' THEN 85
            WHEN td.congestion_level = 'high' THEN 65
            WHEN td.congestion_level = 'moderate' THEN 40
            ELSE 15
          END AS density,
          CASE 
            WHEN td.free_flow_speed IS NOT NULL AND td.free_flow_speed > 0
            THEN COALESCE(td.current_speed, td.average_speed_kmph) / td.free_flow_speed
            ELSE 0.60
          END AS utilization,
          CASE 
            WHEN ${peakConditionSql}
            THEN 'peak'
            ELSE 'nonPeak'
          END AS period_type
        FROM traffic_data td
        JOIN locations l ON td.location_id = l.location_id
        WHERE td.recorded_at >= ${timeFilter} ${locationClause}
      )
      SELECT 
        location_id,
        location_name,
        period_type,
        ROUND(AVG(speed), 2) AS avg_speed,
        ROUND(AVG(vehicles), 0) AS avg_vehicle_count,
        ROUND(AVG(density), 1) AS avg_density,
        ROUND(AVG(utilization), 3) AS avg_utilization,
        COUNT(*) AS sample_count
      FROM categorized
      GROUP BY location_id, location_name, period_type;
    `;

    const result = await pool.query(query, params);

    const locationsMap = {};
    result.rows.forEach(row => {
      const locId = row.location_id;
      if (!locationsMap[locId]) {
        locationsMap[locId] = {
          location_id: locId,
          location_name: row.location_name,
          peak: { avgSpeed: 0, avgDensity: 0, avgVehicleCount: 0, avgUtilization: 0, sampleCount: 0 },
          nonPeak: { avgSpeed: 0, avgDensity: 0, avgVehicleCount: 0, avgUtilization: 0, sampleCount: 0 },
          delta: { speedDiff: 0, densityDiff: 0, vehicleDiff: 0, utilizationDiff: 0 }
        };
      }

      const metricObj = {
        avgSpeed: parseFloat(row.avg_speed) || 0,
        avgDensity: parseFloat(row.avg_density) || 0,
        avgVehicleCount: parseInt(row.avg_vehicle_count, 10) || 0,
        avgUtilization: parseFloat(row.avg_utilization) || 0,
        sampleCount: parseInt(row.sample_count, 10) || 0
      };

      if (row.period_type === 'peak') {
        locationsMap[locId].peak = metricObj;
      } else {
        locationsMap[locId].nonPeak = metricObj;
      }
    });

    const response = Object.values(locationsMap).map(loc => {
      const speedDiff = parseFloat((loc.peak.avgSpeed - loc.nonPeak.avgSpeed).toFixed(2));
      const densityDiff = parseFloat((loc.peak.avgDensity - loc.nonPeak.avgDensity).toFixed(1));
      const vehicleDiff = loc.peak.avgVehicleCount - loc.nonPeak.avgVehicleCount;
      const utilizationDiff = parseFloat((loc.peak.avgUtilization - loc.nonPeak.avgUtilization).toFixed(3));

      loc.delta = { speedDiff, densityDiff, vehicleDiff, utilizationDiff };
      return loc;
    });

    res.json(response);
  } catch (err) {
    console.error('Peak comparison error:', err);
    res.status(500).json({ error: 'Failed to fetch peak comparison' });
  }
};

// 4. Recurring Congestion Spot Identification
// Semantics: Inclusive boundary operator (>=). A location with congestion frequency matching or exceeding the threshold (e.g., exactly 40.0%) is classified as a recurring congestion spot.
// Precision Safety: Uses numeric casting and ROUND(..., 4) to eliminate floating-point representation drift (e.g. 0.3999999 vs 0.40).
const getRecurringCongestion = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const range = req.query.range || '30d';
    const threshold = parseFloat(req.query.threshold) || 0.40;
    const timeFilter = parseTimeRange(range);

    const query = `
      WITH readings AS (
        SELECT 
          td.location_id,
          l.name AS location_name,
          l.latitude,
          l.longitude,
          l.road_type,
          td.recorded_at,
          EXTRACT(HOUR FROM td.recorded_at) AS hour_of_day,
          COALESCE(td.current_speed, td.average_speed_kmph) AS current_speed,
          COALESCE(td.free_flow_speed, 60) AS free_flow_speed,
          td.congestion_level,
          CASE 
            WHEN COALESCE(td.current_speed, td.average_speed_kmph) / NULLIF(COALESCE(td.free_flow_speed, 60), 0) < 0.5
              OR td.congestion_level IN ('high', 'severe')
            THEN 1 
            ELSE 0 
          END AS is_congested
        FROM traffic_data td
        JOIN locations l ON td.location_id = l.location_id
        WHERE td.recorded_at >= ${timeFilter}
      ),
      loc_stats AS (
        SELECT 
          location_id,
          location_name,
          latitude,
          longitude,
          road_type,
          COUNT(*) AS total_samples,
          SUM(is_congested) AS congested_samples,
          ROUND(AVG(current_speed), 2) AS avg_speed_kmph,
          ROUND(AVG(current_speed / NULLIF(free_flow_speed, 0)), 3) AS avg_utilization
        FROM readings
        GROUP BY location_id, location_name, latitude, longitude, road_type
      ),
      congested_hours AS (
        SELECT 
          location_id,
          hour_of_day,
          COUNT(*) AS hour_congested_count,
          ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY COUNT(*) DESC) AS rn
        FROM readings
        WHERE is_congested = 1
        GROUP BY location_id, hour_of_day
      )
      SELECT 
        s.location_id,
        s.location_name,
        s.latitude,
        s.longitude,
        s.road_type,
        s.total_samples,
        s.congested_samples,
        s.avg_speed_kmph,
        s.avg_utilization,
        ROUND((s.congested_samples * 100.0 / NULLIF(s.total_samples, 0)), 1) AS frequency_pct,
        ch.hour_of_day AS peak_congested_hour
      FROM loc_stats s
      LEFT JOIN congested_hours ch ON s.location_id = ch.location_id AND ch.rn = 1
      -- Inclusive boundary comparison operator (>=) with 4-decimal precision rounding to prevent float drift
      WHERE ROUND((s.congested_samples * 1.0 / NULLIF(s.total_samples, 0)), 4) >= ROUND($1::numeric, 4)
      ORDER BY frequency_pct DESC, s.congested_samples DESC
      LIMIT $2;
    `;

    const result = await pool.query(query, [threshold, limit]);

    const formattedRows = result.rows.map(row => {
      const freq = parseFloat(row.frequency_pct) || 0;
      let severity = 'info';
      if (freq >= 60 || parseFloat(row.avg_utilization) < 0.35) {
        severity = 'critical';
      } else if (freq >= 40 || parseFloat(row.avg_utilization) < 0.5) {
        severity = 'warning';
      }

      const peakHour = row.peak_congested_hour !== null ? parseInt(row.peak_congested_hour, 10) : null;
      let mostCommonTime = 'N/A';
      if (peakHour !== null) {
        const nextHour = (peakHour + 1) % 24;
        const formatH = (h) => (h < 10 ? `0${h}:00` : `${h}:00`);
        mostCommonTime = `${formatH(peakHour)} - ${formatH(nextHour)}`;
      }

      return {
        location_id: row.location_id,
        location_name: row.location_name,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        road_type: row.road_type,
        total_samples: parseInt(row.total_samples, 10),
        congested_samples: parseInt(row.congested_samples, 10),
        avg_speed_kmph: parseFloat(row.avg_speed_kmph),
        avg_utilization: parseFloat(row.avg_utilization),
        frequency_pct: freq,
        most_common_time_of_day: mostCommonTime,
        severity
      };
    });

    res.json(formattedRows);
  } catch (err) {
    console.error('Recurring congestion error:', err);
    res.status(500).json({ error: 'Failed to fetch recurring congestion spots' });
  }
};

// 5. Comparative Performance Reports
const getPerformanceComparison = async (req, res) => {
  try {
    const { range1_start, range1_end, range2_start, range2_end, location_id } = req.query;

    const r1Start = range1_start || "NOW() - INTERVAL '7 days'";
    const r1End = range1_end || "NOW()";
    const r2Start = range2_start || "NOW() - INTERVAL '14 days'";
    const r2End = range2_end || "NOW() - INTERVAL '7 days'";

    const params = [];
    let locClause = '';
    if (location_id) {
      params.push(location_id);
      locClause = `AND location_id = $1`;
    }

    const queryPeriod = async (startFilter, endFilter) => {
      const q = `
        SELECT 
          ROUND(AVG(COALESCE(current_speed, average_speed_kmph)), 2) AS avg_speed,
          ROUND(AVG(COALESCE(vehicle_count, 0)), 0) AS avg_vehicle_count,
          ROUND(AVG(
            CASE 
              WHEN free_flow_speed IS NOT NULL AND free_flow_speed > 0 
              THEN GREATEST(0.0, LEAST(100.0, (1.0 - (COALESCE(current_speed, average_speed_kmph) / free_flow_speed)) * 100.0))
              WHEN congestion_level = 'severe' THEN 85
              WHEN congestion_level = 'high' THEN 65
              WHEN congestion_level = 'moderate' THEN 40
              ELSE 15
            END
          ), 1) AS avg_density,
          ROUND(AVG(2.5 * (60.0 / NULLIF(COALESCE(current_speed, average_speed_kmph), 0))), 1) AS avg_travel_time_mins,
          ROUND(AVG(
            CASE 
              WHEN free_flow_speed IS NOT NULL AND free_flow_speed > 0
              THEN COALESCE(current_speed, average_speed_kmph) / free_flow_speed
              ELSE 0.60
            END
          ), 3) AS avg_utilization,
          COUNT(*) AS total_readings
        FROM traffic_data
        WHERE recorded_at >= ${startFilter} AND recorded_at <= ${endFilter} ${locClause}
      `;
      const res = await pool.query(q, params);
      const row = res.rows[0] || {};
      return {
        avgSpeed: parseFloat(row.avg_speed) || 0,
        avgVehicleCount: parseInt(row.avg_vehicle_count, 10) || 0,
        avgDensity: parseFloat(row.avg_density) || 0,
        avgTravelTimeMins: parseFloat(row.avg_travel_time_mins) || 0,
        avgUtilization: parseFloat(row.avg_utilization) || 0,
        totalReadings: parseInt(row.total_readings, 10) || 0
      };
    };

    const formatFilter = (val, isEnd = false) => {
      if (!val) return isEnd ? 'NOW()' : "NOW() - INTERVAL '7 days'";
      if (val.startsWith("'") || val.includes('NOW()') || val.includes('INTERVAL')) return val;
      return `'${val}'::timestamp`;
    };

    const p1 = await queryPeriod(formatFilter(r1Start, false), formatFilter(r1End, true));
    const p2 = await queryPeriod(formatFilter(r2Start, false), formatFilter(r2End, true));

    const calcPctChange = (val1, val2) => {
      if (!val2 || val2 === 0) return 0;
      return parseFloat((((val1 - val2) / val2) * 100).toFixed(1));
    };

    const changes = {
      speed_pct_change: calcPctChange(p1.avgSpeed, p2.avgSpeed),
      density_pct_change: calcPctChange(p1.avgDensity, p2.avgDensity),
      vehicle_count_pct_change: calcPctChange(p1.avgVehicleCount, p2.avgVehicleCount),
      travel_time_pct_change: calcPctChange(p1.avgTravelTimeMins, p2.avgTravelTimeMins),
      utilization_pct_change: calcPctChange(p1.avgUtilization, p2.avgUtilization)
    };

    res.json({
      location_id: location_id || null,
      period1: { label: 'Current Period', metrics: p1 },
      period2: { label: 'Prior Period', metrics: p2 },
      changes
    });
  } catch (err) {
    console.error('Performance comparison error:', err);
    res.status(500).json({ error: 'Failed to fetch performance comparison' });
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
  getDashboardSummary,
  getDailyTrends,
  getWeeklyTrends,
  getPeakComparison,
  getRecurringCongestion,
  getPerformanceComparison
};