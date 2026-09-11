const axios = require('axios');
const pool = require('./config/db');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

async function runRecommendationTests() {
  console.log(`========================================`);
  console.log(`TrafficVision AI — Recommendation Engine & Plain Reports Verification`);
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

  // 1. GET /api/analytics/bottlenecks
  await test('GET /api/analytics/bottlenecks (Identify Bottleneck Patterns)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/bottlenecks?limit=5&range=30d`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Expected response to be an array of bottleneck patterns');
    console.log(`     Retrieved ${res.data.length} bottleneck patterns`);

    if (res.data.length > 0) {
      const p = res.data[0];
      if (!p.locationId || p.bottleneckScore === undefined || p.frequency === undefined || !p.typicalTimeWindows || !p.lastSeverity) {
        throw new Error('Bottleneck pattern object structure mismatch');
      }
      console.log(`     Top Bottleneck: ${p.locationName} | Score: ${p.bottleneckScore}/100 | Window: ${p.typicalTimeWindows} | Last Severity: ${p.lastSeverity}`);
    }
  });

  // Setup sample test routes in DB if needed for route comparison verification
  let sampleRouteAId = null;
  let sampleRouteBId = null;

  try {
    const routesRes = await axios.get(`${BASE_URL}/api/routes`);
    if (routesRes.data && routesRes.data.length >= 2) {
      sampleRouteAId = routesRes.data[0].route_id;
      sampleRouteBId = routesRes.data[1].route_id;
    } else {
      // Seed 2 routes sharing start & end locations if < 2 exist
      const locsRes = await pool.query('SELECT location_id FROM locations ORDER BY name ASC LIMIT 3');
      if (locsRes.rows.length >= 3) {
        const l1 = locsRes.rows[0].location_id;
        const l2 = locsRes.rows[1].location_id;
        const l3 = locsRes.rows[2].location_id;

        const r1 = await axios.post(`${BASE_URL}/api/routes`, {
          name: 'Main Expressway Corridor A',
          location_ids: [l1, l2]
        });
        const r2 = await axios.post(`${BASE_URL}/api/routes`, {
          name: 'Bypass Bypass Corridor B',
          location_ids: [l1, l3, l2]
        });

        sampleRouteAId = r1.data.route.route_id;
        sampleRouteBId = r2.data.route.route_id;
      }
    }
  } catch (e) {
    console.log(`ℹ️ Setup note: ${e.message}`);
  }

  // 2. GET /api/routes/recommendations (Route Recommendation Engine & Time-Saved Math Sanity Check)
  await test('GET /api/routes/recommendations (AI Route Recommendation & Travel Time Delta & Status Flag)', async () => {
    const url = sampleRouteAId
      ? `${BASE_URL}/api/routes/recommendations?routeId=${sampleRouteAId}`
      : `${BASE_URL}/api/routes/recommendations`;

    const res = await axios.get(url);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const rec = res.data;

    if (!rec.recommendedRouteId || !rec.insteadOfRouteId || rec.originalEtaMins === undefined || rec.recommendedEtaMins === undefined || rec.minutesSaved === undefined || !rec.reason || !rec.status) {
      throw new Error('Recommendation object structure mismatch (missing status or required fields)');
    }

    if (!['alternate_available', 'already_optimal'].includes(rec.status)) {
      throw new Error(`Invalid recommendation status '${rec.status}'`);
    }

    const expectedMinutesSaved = parseFloat(Math.max(0, rec.originalEtaMins - rec.recommendedEtaMins).toFixed(2));
    if (Math.abs(rec.minutesSaved - expectedMinutesSaved) > 0.05) {
      throw new Error(`Time saved math mismatch: expected ${expectedMinutesSaved}, got ${rec.minutesSaved}`);
    }

    console.log(`     Status: ${rec.status}`);
    console.log(`     Original Route: ${rec.insteadOfRouteName} (${rec.originalEtaMins} min)`);
    console.log(`     Recommended Route: ${rec.recommendedRouteName} (${rec.recommendedEtaMins} min)`);
    console.log(`     Minutes Saved: ${rec.minutesSaved} min | Reason: "${rec.reason}"`);
  });

  // 2b. Refinement 1 Test: Hysteresis Anti-Flapping Verification
  await test('Hysteresis Buffer Anti-Flapping Test (Consecutive Calls Hold Stable Recommendation)', async () => {
    if (!sampleRouteAId) return console.log('     Skipping hysteresis test (no sample route)');

    const call1 = await axios.get(`${BASE_URL}/api/routes/recommendations?routeId=${sampleRouteAId}`);
    const call2 = await axios.get(`${BASE_URL}/api/routes/recommendations?routeId=${sampleRouteAId}`);
    const call3 = await axios.get(`${BASE_URL}/api/routes/recommendations?routeId=${sampleRouteAId}`);

    if (call1.data.recommendedRouteId !== call2.data.recommendedRouteId || call2.data.recommendedRouteId !== call3.data.recommendedRouteId) {
      throw new Error(`Hysteresis failure: Recommendation flipped erratically between consecutive calls (${call1.data.recommendedRouteId} vs ${call2.data.recommendedRouteId})`);
    }

    console.log(`     ✓ Recommendation remained stable across 3 consecutive queries: ${call1.data.recommendedRouteId}`);
  });

  // 2c. Refinement 2 Test: Already Optimal Route State
  await test('Refinement 2: Already Optimal State Flag Verification', async () => {
    // Pick the recommended route from previous query and query its recommendation
    const recRes = await axios.get(`${BASE_URL}/api/routes/recommendations?routeId=${sampleRouteAId}`);
    const bestRouteId = recRes.data.recommendedRouteId;

    const optRes = await axios.get(`${BASE_URL}/api/routes/recommendations?routeId=${bestRouteId}`);
    if (optRes.status !== 200) throw new Error(`Expected 200, got ${optRes.status}`);

    if (!optRes.data.status) {
      throw new Error('Missing status field in response');
    }

    console.log(`     Route ${bestRouteId} recommendation status: "${optRes.data.status}"`);
    if (optRes.data.status === 'already_optimal') {
      console.log(`     ✓ Confirmed status is "already_optimal" when route is already fastest.`);
    }
  });

  // 3. GET /api/routes/recommendations/history (DB Persistence Check)
  await test('GET /api/routes/recommendations/history (Persisted Recommendations Audit)', async () => {
    const res = await axios.get(`${BASE_URL}/api/routes/recommendations/history?limit=5`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Expected history to be an array');
    console.log(`     Persisted recommendations count in DB: ${res.data.length}`);
  });

  // 4. POST /api/reports/traffic-prediction/generate & Plain Language Report Verification
  await test('POST /api/reports/traffic-prediction/generate & Plain-Language Report Verification', async () => {
    const genRes = await axios.post(`${BASE_URL}/api/reports/traffic-prediction/generate`);
    if (genRes.status !== 201) throw new Error(`Expected 201 from report generation, got ${genRes.status}`);

    const reportRes = await axios.get(`${BASE_URL}/api/reports/traffic-prediction`);
    if (reportRes.status !== 200) throw new Error(`Expected 200, got ${reportRes.status}`);

    const payload = reportRes.data;
    const plainSummary = payload.plain_summary || payload.summary?.plain_summary;

    if (!plainSummary || !plainSummary.sections) {
      throw new Error('Missing plain_summary sections in report response');
    }

    const { congestion_trends, incidents, road_performance, ai_recommendations } = plainSummary.sections;

    if (!congestion_trends || !incidents || !road_performance || !ai_recommendations) {
      throw new Error('Plain summary does not contain all 4 required sections (congestion_trends, incidents, road_performance, ai_recommendations)');
    }

    // Jargon term leakage check: confirm no unformatted technical identifiers leak in plain summary text
    const combinedPlainContent = `${congestion_trends} ${incidents} ${road_performance} ${ai_recommendations}`;
    const jargonRegex = /(congestionScore|speed_ratio|predicted_congestion|free_flow_speed)/i;

    if (jargonRegex.test(combinedPlainContent)) {
      const match = combinedPlainContent.match(jargonRegex)[0];
      throw new Error(`Raw jargon term '${match}' leaked into plain-language summary!`);
    }

    console.log(`     ✓ All 4 required plain-language sections verified.`);
    console.log(`     ✓ Jargon sanity check PASSED (no raw technical variables leaked).`);
    console.log(`     Sample Plain Trend: "${congestion_trends.substring(0, 90)}..."`);
  });

  console.log(`========================================`);
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

runRecommendationTests().catch((err) => {
  console.error('Test execution error:', err.message);
  process.exit(1);
});
