const pool = require('../config/db');

async function applyIndexesAndExplain() {
  console.log('========================================');
  console.log('Database Indexing & Query EXPLAIN ANALYZE Optimization');
  console.log('========================================\n');

  const indexes = [
    { name: 'idx_traffic_data_recorded_at', sql: 'CREATE INDEX IF NOT EXISTS idx_traffic_data_recorded_at ON traffic_data(recorded_at DESC);' },
    { name: 'idx_traffic_data_loc_recorded_speed', sql: 'CREATE INDEX IF NOT EXISTS idx_traffic_data_loc_recorded_speed ON traffic_data(location_id, recorded_at DESC, average_speed_kmph);' },
    { name: 'idx_route_locations_loc_id', sql: 'CREATE INDEX IF NOT EXISTS idx_route_locations_loc_id ON route_locations(location_id);' },
    { name: 'idx_recommendations_orig_route', sql: 'CREATE INDEX IF NOT EXISTS idx_recommendations_orig_route ON recommendations(original_route_id);' },
    { name: 'idx_recommendations_rec_route', sql: 'CREATE INDEX IF NOT EXISTS idx_recommendations_rec_route ON recommendations(recommended_route_id);' },
    { name: 'idx_alerts_location_id', sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_location_id ON alerts(location_id);' },
    { name: 'idx_alerts_status_severity', sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON alerts(status, severity);' }
  ];

  try {
    for (const idx of indexes) {
      console.log(`[INDEX] Creating ${idx.name}...`);
      await pool.query(idx.sql);
      console.log(`  └─ SUCCESS: ${idx.name} ready.\n`);
    }

    console.log('--- EXPLAIN ANALYZE Verification on Key Analytics Endpoints ---');

    // 1. Trends query EXPLAIN ANALYZE
    const explainTrends = await pool.query(`
      EXPLAIN ANALYZE
      SELECT td.location_id, l.name AS location_name, DATE_TRUNC('day', td.recorded_at) AS time_bucket,
             ROUND(AVG(td.average_speed_kmph), 2) AS avg_speed_kmph
      FROM traffic_data td
      JOIN locations l ON td.location_id = l.location_id
      WHERE td.recorded_at >= NOW() - INTERVAL '7 days'
      GROUP BY td.location_id, l.name, time_bucket
      ORDER BY time_bucket DESC;
    `);
    console.log('Trends Query Execution Plan:');
    explainTrends.rows.forEach(r => console.log('  ', r['QUERY PLAN']));
    console.log('');

    // 2. Bottlenecks query EXPLAIN ANALYZE
    const explainBottlenecks = await pool.query(`
      EXPLAIN ANALYZE
      SELECT td.location_id, l.name AS location_name, COUNT(td.data_id) AS total_readings
      FROM traffic_data td
      JOIN locations l ON td.location_id = l.location_id
      WHERE td.recorded_at >= NOW() - INTERVAL '30 days'
      GROUP BY td.location_id, l.name;
    `);
    console.log('Bottlenecks Query Execution Plan:');
    explainBottlenecks.rows.forEach(r => console.log('  ', r['QUERY PLAN']));
    console.log('');

    console.log('========================================');
    console.log('Backend Indexing & EXPLAIN Verification Completed Successfully!');
    console.log('========================================');
  } catch (err) {
    console.error('Error during indexing execution:', err.message);
  } finally {
    await pool.end();
  }
}

applyIndexesAndExplain();
