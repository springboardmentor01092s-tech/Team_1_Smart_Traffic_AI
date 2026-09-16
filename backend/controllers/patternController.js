const pool = require('../config/db');

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

/**
 * Task 1: Identify Traffic / Bottleneck Patterns
 * Merges historical (rolling window traffic_data + predictions) and real-time latest data
 * into a single scoring function to flag recurring bottlenecks.
 */
const getBottleneckPatterns = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const range = req.query.range || '30d';
    const threshold = parseFloat(req.query.threshold) || 0.25; // 25% frequency threshold
    const timeFilter = parseTimeRange(range);

    const query = `
      WITH historical_readings AS (
        SELECT 
          td.location_id,
          l.name AS location_name,
          l.latitude,
          l.longitude,
          l.road_type,
          td.recorded_at,
          EXTRACT(HOUR FROM td.recorded_at) AS hour_of_day,
          COALESCE(td.current_speed, td.average_speed_kmph) AS speed,
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
          ROUND(AVG(speed), 2) AS avg_speed_kmph,
          ROUND(AVG(speed / NULLIF(free_flow_speed, 0)), 3) AS avg_speed_ratio
        FROM historical_readings
        GROUP BY location_id, location_name, latitude, longitude, road_type
      ),
      latest_readings AS (
        SELECT DISTINCT ON (td.location_id)
          td.location_id,
          COALESCE(td.current_speed, td.average_speed_kmph) AS latest_speed,
          COALESCE(td.free_flow_speed, 60) AS latest_free_flow,
          td.congestion_level AS latest_congestion,
          p.predicted_congestion,
          td.recorded_at AS latest_recorded_at
        FROM traffic_data td
        LEFT JOIN LATERAL (
          SELECT predicted_congestion
          FROM predictions
          WHERE location_id = td.location_id
          ORDER BY created_at DESC
          LIMIT 1
        ) p ON true
        ORDER BY td.location_id, td.recorded_at DESC
      ),
      congested_hours AS (
        SELECT 
          location_id,
          hour_of_day,
          COUNT(*) AS hour_congested_count,
          ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY COUNT(*) DESC) AS rn
        FROM historical_readings
        WHERE is_congested = 1
        GROUP BY location_id, hour_of_day
      ),
      route_assoc AS (
        SELECT DISTINCT ON (location_id)
          location_id,
          route_id
        FROM route_locations
        ORDER BY location_id, sequence_order ASC
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
        s.avg_speed_ratio,
        ROUND((s.congested_samples * 100.0 / NULLIF(s.total_samples, 0)), 1) AS frequency_pct,
        ch.hour_of_day AS peak_hour,
        lr.latest_speed,
        lr.latest_free_flow,
        COALESCE(lr.predicted_congestion, lr.latest_congestion, 'low') AS last_severity,
        ra.route_id
      FROM loc_stats s
      JOIN latest_readings lr ON s.location_id = lr.location_id
      LEFT JOIN congested_hours ch ON s.location_id = ch.location_id AND ch.rn = 1
      LEFT JOIN route_assoc ra ON s.location_id = ra.location_id
      WHERE ROUND((s.congested_samples * 1.0 / NULLIF(s.total_samples, 0)), 4) >= ROUND($1::numeric, 4)
      ORDER BY frequency_pct DESC, s.congested_samples DESC
      LIMIT $2;
    `;

    const result = await pool.query(query, [threshold, limit]);

    const severityWeights = { low: 1, moderate: 2, high: 3, severe: 4 };

    const patterns = result.rows.map((row) => {
      const frequencyPct = parseFloat(row.frequency_pct) || 0;
      const frequencyFraction = parseFloat((frequencyPct / 100).toFixed(3));
      
      const lastSeverity = (row.last_severity || 'low').toLowerCase();
      const severityWeight = severityWeights[lastSeverity] || 1;

      const latestSpeedRatio = row.latest_speed && row.latest_free_flow > 0
        ? Math.min(1.0, parseFloat(row.latest_speed) / parseFloat(row.latest_free_flow))
        : parseFloat(row.avg_speed_ratio || 0.6);

      // Bottleneck Score (0 to 100) combining frequency (60%) and live congestion severity/ratio (40%)
      const bottleneckScore = parseFloat(
        Math.min(100, Math.max(0, (frequencyPct * 0.60) + ((1.0 - latestSpeedRatio) * 40.0))).toFixed(1)
      );

      const peakHour = row.peak_hour !== null ? parseInt(row.peak_hour, 10) : null;
      let typicalTimeWindows = 'N/A';
      if (peakHour !== null) {
        const nextHour = (peakHour + 1) % 24;
        const fmt = (h) => (h < 10 ? `0${h}:00` : `${h}:00`);
        typicalTimeWindows = `${fmt(peakHour)} - ${fmt(nextHour)}`;
      }

      return {
        locationId: row.location_id,
        locationName: row.location_name,
        routeId: row.route_id || null,
        bottleneckScore: bottleneckScore,
        frequency: frequencyFraction,
        frequencyPct: frequencyPct,
        typicalTimeWindows: typicalTimeWindows,
        lastSeverity: lastSeverity,
        avgSpeedKmph: parseFloat(row.avg_speed_kmph),
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude)
      };
    });

    res.json(patterns);
  } catch (err) {
    console.error('Error fetching bottleneck patterns:', err);
    res.status(500).json({ error: 'Failed to fetch bottleneck patterns' });
  }
};

module.exports = { getBottleneckPatterns };
