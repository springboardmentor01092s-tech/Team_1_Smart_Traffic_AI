const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

async function runTrendWorkflowsVerification() {
  console.log(`========================================`);
  console.log(`Traffic Trend Analysis Workflows (Milestone 4) Comprehensive Verification`);
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

  // Fetch a valid location UUID from active database
  let sampleLocationId = null;
  try {
    const busiestRes = await axios.get(`${BASE_URL}/api/analytics/busiest-locations?limit=1`);
    if (busiestRes.data && busiestRes.data.length > 0) {
      sampleLocationId = busiestRes.data[0].location_id;
      console.log(`ℹ️ Sample valid location UUID for filtering tests: ${sampleLocationId}\n`);
    }
  } catch (err) {
    console.log(`ℹ️ Could not pre-fetch sample location UUID: ${err.message}\n`);
  }

  // 1. GET /api/analytics/trends/daily
  await test('GET /api/analytics/trends/daily (Network-wide daily trends)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/trends/daily?range=30d`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Retrieved ${res.data.length} daily time buckets`);
  });

  await test('GET /api/analytics/trends/daily (Location-specific daily trends with valid UUID)', async () => {
    if (!sampleLocationId) return console.log('     Skipping location-specific test (no sample UUID)');
    const res = await axios.get(`${BASE_URL}/api/analytics/trends/daily?location_id=${sampleLocationId}&range=7d`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Retrieved ${res.data.length} daily records for location ${sampleLocationId}`);
  });

  await test('GET /api/analytics/trends/daily (Non-existent/invalid location edge case)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/trends/daily?location_id=invalid-uuid-1234&range=7d`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    if (res.data.length !== 0) throw new Error(`Expected empty array, got ${res.data.length} items`);
    console.log(`     Successfully handled invalid location UUID (returned empty array)`);
  });

  // 2. GET /api/analytics/trends/weekly
  await test('GET /api/analytics/trends/weekly (Network-wide weekly trends)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/trends/weekly?range=90d`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Retrieved ${res.data.length} weekly time buckets`);
  });

  await test('GET /api/analytics/trends/weekly (Non-existent location edge case)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/trends/weekly?location_id=00000000-0000-0000-0000-000000000000&range=90d`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    if (res.data.length !== 0) throw new Error(`Expected empty array, got ${res.data.length} items`);
    console.log(`     Successfully handled non-existent location weekly trends`);
  });

  // 3. GET /api/analytics/peak-comparison
  await test('GET /api/analytics/peak-comparison (Peak vs Non-Peak comparison overall)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/peak-comparison?range=30d`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Retrieved peak comparison for ${res.data.length} locations`);
    if (res.data.length > 0) {
      const sample = res.data[0];
      if (!sample.location_id || !sample.peak || !sample.nonPeak || !sample.delta) {
        throw new Error('Peak comparison object structure mismatch');
      }
      console.log(`     Sample location (${sample.location_name}): Peak Speed = ${sample.peak.avgSpeed} km/h, Non-Peak Speed = ${sample.nonPeak.avgSpeed} km/h, Delta = ${sample.delta.speedDiff}`);
    }
  });

  await test('GET /api/analytics/peak-comparison (Single location filter with valid UUID)', async () => {
    if (!sampleLocationId) return console.log('     Skipping single location peak comparison');
    const res = await axios.get(`${BASE_URL}/api/analytics/peak-comparison?location_id=${sampleLocationId}&range=7d`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Retrieved single location peak comparison (${res.data.length} match)`);
  });

  await test('GET /api/analytics/peak-comparison (Non-existent location edge case)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/peak-comparison?location_id=invalid-uuid&range=7d`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    if (res.data.length !== 0) throw new Error(`Expected empty array, got ${res.data.length} items`);
    console.log(`     Successfully handled non-existent location peak comparison`);
  });

  // 4. GET /api/analytics/recurring-congestion & BOUNDARY OPERATOR TESTS
  await test('GET /api/analytics/recurring-congestion (Standard threshold 0.10)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/recurring-congestion?limit=10&range=30d&threshold=0.10`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
    console.log(`     Retrieved ${res.data.length} recurring congestion spots`);
    if (res.data.length > 0) {
      const spot = res.data[0];
      if (spot.frequency_pct === undefined || !spot.most_common_time_of_day || !spot.severity) {
        throw new Error('Recurring congestion spot structure mismatch');
      }
      console.log(`     Top Spot: ${spot.location_name} | Freq: ${spot.frequency_pct}% | Peak Time: ${spot.most_common_time_of_day} | Severity: ${spot.severity}`);
    }
  });

  await test('GET /api/analytics/recurring-congestion (Boundary verification: Exact, One-below, One-above & Custom thresholds)', async () => {
    // 1. Get baseline dataset with low threshold to inspect actual frequency ratios
    const baseRes = await axios.get(`${BASE_URL}/api/analytics/recurring-congestion?limit=50&range=30d&threshold=0.01`);
    if (!baseRes.data || baseRes.data.length === 0) {
      return console.log('     Skipping boundary test (no dataset available)');
    }

    // Pick a sample spot from active data
    const targetSpot = baseRes.data[0];
    const exactRatio = targetSpot.congested_samples / targetSpot.total_samples;
    console.log(`     Target spot "${targetSpot.location_name}": ${targetSpot.congested_samples}/${targetSpot.total_samples} samples = exact ratio ${exactRatio}`);

    // Test A: Exact threshold (ratio == threshold) -> MUST BE INCLUDED (inclusive >= operator)
    const exactThreshRes = await axios.get(`${BASE_URL}/api/analytics/recurring-congestion?limit=50&range=30d&threshold=${exactRatio}`);
    const includedExact = exactThreshRes.data.some(s => s.location_id === targetSpot.location_id);
    if (!includedExact) {
      throw new Error(`Inclusive >= boundary failure: Spot with ratio ${exactRatio} was excluded at threshold ${exactRatio}`);
    }
    console.log(`     ✓ Exact threshold test PASSED: ratio ${exactRatio} INCLUDED at threshold ${exactRatio}`);

    // Test B: One fraction below threshold (threshold = exactRatio - 0.0001) -> MUST BE INCLUDED
    const belowThresh = Math.max(0.0001, exactRatio - 0.0001);
    const belowRes = await axios.get(`${BASE_URL}/api/analytics/recurring-congestion?limit=50&range=30d&threshold=${belowThresh}`);
    const includedBelow = belowRes.data.some(s => s.location_id === targetSpot.location_id);
    if (!includedBelow) {
      throw new Error(`Boundary failure: Spot with ratio ${exactRatio} was excluded when threshold is below (${belowThresh})`);
    }
    console.log(`     ✓ Below-threshold test PASSED: ratio ${exactRatio} INCLUDED at threshold ${belowThresh}`);

    // Test C: One fraction above threshold (threshold = exactRatio + 0.0001) -> MUST BE EXCLUDED
    const aboveThresh = exactRatio + 0.0001;
    const aboveRes = await axios.get(`${BASE_URL}/api/analytics/recurring-congestion?limit=50&range=30d&threshold=${aboveThresh}`);
    const includedAbove = aboveRes.data.some(s => s.location_id === targetSpot.location_id);
    if (includedAbove) {
      throw new Error(`Boundary failure: Spot with ratio ${exactRatio} was INCLUDED when threshold is above (${aboveThresh})`);
    }
    console.log(`     ✓ Above-threshold test PASSED: ratio ${exactRatio} EXCLUDED at threshold ${aboveThresh}`);

    // Test D: Custom threshold parameter dynamic behavior (e.g. custom threshold 0.50)
    const customRes = await axios.get(`${BASE_URL}/api/analytics/recurring-congestion?limit=50&range=30d&threshold=0.50`);
    customRes.data.forEach(spot => {
      const spotRatio = spot.congested_samples / spot.total_samples;
      if (spotRatio < 0.50 - 0.0001) {
        throw new Error(`Custom threshold leak: Spot with ratio ${spotRatio} returned for threshold 0.50`);
      }
    });
    console.log(`     ✓ Custom threshold (0.50) dynamic parameter test PASSED (${customRes.data.length} spots matched)`);
  });

  // 5. GET /api/analytics/performance-comparison
  await test('GET /api/analytics/performance-comparison (Comparative Performance default periods)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/performance-comparison`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = res.data;
    if (!data.period1 || !data.period2 || !data.changes) {
      throw new Error('Performance comparison response structure mismatch');
    }
    console.log(`     Period 1 Speed: ${data.period1.metrics.avgSpeed} km/h vs Period 2 Speed: ${data.period2.metrics.avgSpeed} km/h | Speed Change: ${data.changes.speed_pct_change}%`);
  });

  await test('GET /api/analytics/performance-comparison (Custom explicit ISO date range parameters)', async () => {
    const r1Start = '2026-08-01T00:00:00.000Z';
    const r1End = '2026-08-07T23:59:59.000Z';
    const r2Start = '2026-07-24T00:00:00.000Z';
    const r2End = '2026-07-31T23:59:59.000Z';
    const res = await axios.get(`${BASE_URL}/api/analytics/performance-comparison?range1_start=${r1Start}&range1_end=${r1End}&range2_start=${r2Start}&range2_end=${r2End}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.period1 || !res.data.changes) throw new Error('Custom range response structure error');
    console.log(`     Custom ISO ranges evaluated cleanly`);
  });

  console.log(`========================================`);
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

runTrendWorkflowsVerification().catch((err) => {
  console.error('Test script failure:', err.message);
  process.exit(1);
});
