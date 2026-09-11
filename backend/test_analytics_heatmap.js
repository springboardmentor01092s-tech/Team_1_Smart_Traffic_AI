const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

async function runAnalyticsHeatmapVerification() {
  console.log(`========================================`);
  console.log(`Analytics & Heat Map Module API Verification`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`========================================\n`);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      console.log(`[TESTING] ${name}...`);
      await fn();
      console.log(`  └─ SUCCESS: ${name}\n`);
      passed++;
    } catch (err) {
      console.error(`  └─ FAILED: ${name}`);
      if (err.response) {
        console.error(`     Status: ${err.response.status}`);
        console.error(`     Data: ${JSON.stringify(err.response.data)}`);
      } else {
        console.error(`     Error: ${err.message}`);
      }
      console.log('');
      failed++;
    }
  }

  // 1. GET /api/traffic?timeframe=live
  await test('GET /api/traffic?timeframe=live (Live traffic data for heat map)', async () => {
    const res = await axios.get(`${BASE_URL}/api/traffic?timeframe=live`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Retrieved ${res.data.length} live traffic points`);
  });

  // 2. GET /api/traffic?timeframe=1h
  await test('GET /api/traffic?timeframe=1h (Last 1h traffic window)', async () => {
    const res = await axios.get(`${BASE_URL}/api/traffic?timeframe=1h`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Retrieved ${res.data.length} traffic points for 1h window`);
  });

  // 3. GET /api/traffic?timeframe=24h
  await test('GET /api/traffic?timeframe=24h (Last 24h traffic window)', async () => {
    const res = await axios.get(`${BASE_URL}/api/traffic?timeframe=24h`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Retrieved ${res.data.length} traffic points for 24h window`);
  });

  // 4. GET /api/analytics/dashboard-summary
  await test('GET /api/analytics/dashboard-summary (KPI summary strip fields)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/dashboard-summary`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = res.data;
    
    // Confirm all 5 KPI fields exist and are numeric
    const fields = [
      'total_locations',
      'avg_traffic_density',
      'avg_vehicle_count',
      'network_avg_speed_kmph',
      'avg_travel_time_mins'
    ];

    fields.forEach((field) => {
      if (data[field] === undefined || data[field] === null || typeof data[field] !== 'number') {
        throw new Error(`Field ${field} is missing or not a number: ${data[field]}`);
      }
    });

    console.log(`     KPI Strip Metrics: total_locations=${data.total_locations}, density=${data.avg_traffic_density}%, vehicles=${data.avg_vehicle_count}, speed=${data.network_avg_speed_kmph} km/h, travel_time=${data.avg_travel_time_mins} mins`);
  });

  // 5. GET /api/analytics/trends
  await test('GET /api/analytics/trends (Historical trends line chart data)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/trends?timeframe=7d`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Trends records count: ${res.data.length}`);
  });

  // 6. GET /api/analytics/busiest-locations
  await test('GET /api/analytics/busiest-locations (Vehicle volume bar chart data)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/busiest-locations?limit=10&timeframe=7d`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Busiest locations count: ${res.data.length}`);
  });

  // 7. GET /api/analytics/most-congested-routes
  await test('GET /api/analytics/most-congested-routes (Most congested routes table data)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/most-congested-routes?limit=10`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Congested routes count: ${res.data.length}`);
  });

  // 8. GET /api/routes
  await test('GET /api/routes (All routes list)', async () => {
    const res = await axios.get(`${BASE_URL}/api/routes`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Routes count: ${res.data.length}`);
  });

  console.log(`========================================`);
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

runAnalyticsHeatmapVerification().catch((err) => {
  console.error('Test script failure:', err.message);
  process.exit(1);
});
