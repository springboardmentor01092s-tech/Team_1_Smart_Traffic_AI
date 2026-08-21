const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

async function runTravelTimeTests() {
  console.log(`Starting Travel Time Estimation Endpoint Tests against: ${BASE_URL}\n`);
  let passed = 0;
  let failed = 0;

  async function testEndpoint(name, fn) {
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

  const isCloseTo = (actual, expected, tolerance = 0.01) => {
    return Math.abs(actual - expected) <= tolerance;
  };

  // 1. Existing shape & well-formedness test
  const sampleRouteId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  await testEndpoint(`GET /api/routes/${sampleRouteId}/travel-time (Valid route shape verification)`, async () => {
    const res = await axios.get(`${BASE_URL}/api/routes/${sampleRouteId}/travel-time`);
    if (res.status !== 200) {
      throw new Error(`Expected HTTP status 200, got ${res.status}`);
    }

    const data = res.data;
    if (data.routeId !== sampleRouteId) {
      throw new Error(`Expected routeId '${sampleRouteId}', got '${data.routeId}'`);
    }
    if (typeof data.totalDistanceKm !== 'number' || data.totalDistanceKm <= 0) {
      throw new Error(`Expected positive totalDistanceKm, got ${data.totalDistanceKm}`);
    }
    if (typeof data.estimatedTravelTimeMinutes !== 'number' || data.estimatedTravelTimeMinutes <= 0) {
      throw new Error(`Expected positive estimatedTravelTimeMinutes, got ${data.estimatedTravelTimeMinutes}`);
    }
    if (!Array.isArray(data.segments) || data.segments.length === 0) {
      throw new Error('Expected non-empty segments array');
    }

    console.log(`     ✓ Total Distance: ${data.totalDistanceKm} km`);
    console.log(`     ✓ Estimated Travel Time: ${data.estimatedTravelTimeMinutes} mins`);
  });

  // 2. Deterministic Math Accuracy Test
  const mathRouteId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  await testEndpoint(`GET /api/routes/${mathRouteId}/travel-time (Deterministic math calculation check)`, async () => {
    const res = await axios.get(`${BASE_URL}/api/routes/${mathRouteId}/travel-time`);
    if (res.status !== 200) {
      throw new Error(`Expected HTTP status 200, got ${res.status}`);
    }

    const data = res.data;
    console.log(`     Math Verification Response:`, JSON.stringify(data, null, 2));

    const expectedTotalDist = 11.00;
    const expectedTotalTime = 16.43;

    if (!isCloseTo(data.totalDistanceKm, expectedTotalDist, 0.01)) {
      throw new Error(`totalDistanceKm expected ${expectedTotalDist} ±0.01, got ${data.totalDistanceKm}`);
    }

    if (!isCloseTo(data.estimatedTravelTimeMinutes, expectedTotalTime, 0.01)) {
      throw new Error(`estimatedTravelTimeMinutes expected ${expectedTotalTime} ±0.01, got ${data.estimatedTravelTimeMinutes}`);
    }

    if (data.segments.length !== 2) {
      throw new Error(`Expected 2 segments, got ${data.segments.length}`);
    }

    // Segment 1: expected 5.56 km, 5.56 mins
    const seg1 = data.segments[0];
    if (!isCloseTo(seg1.distanceKm, 5.56, 0.01)) {
      throw new Error(`Segment 1 distanceKm expected 5.56 ±0.01, got ${seg1.distanceKm}`);
    }
    if (!isCloseTo(seg1.estimatedTimeMinutes, 5.56, 0.01)) {
      throw new Error(`Segment 1 estimatedTimeMinutes expected 5.56 ±0.01, got ${seg1.estimatedTimeMinutes}`);
    }
    if (seg1.speedKmph !== 60) {
      throw new Error(`Segment 1 speedKmph expected 60, got ${seg1.speedKmph}`);
    }

    // Segment 2: expected 5.44 km, 10.87 mins
    const seg2 = data.segments[1];
    if (!isCloseTo(seg2.distanceKm, 5.44, 0.01)) {
      throw new Error(`Segment 2 distanceKm expected 5.44 ±0.01, got ${seg2.distanceKm}`);
    }
    if (!isCloseTo(seg2.estimatedTimeMinutes, 10.87, 0.01)) {
      throw new Error(`Segment 2 estimatedTimeMinutes expected 10.87 ±0.01, got ${seg2.estimatedTimeMinutes}`);
    }
    if (seg2.speedKmph !== 30) {
      throw new Error(`Segment 2 speedKmph expected 30, got ${seg2.speedKmph}`);
    }

    console.log(`     ✓ Math verification passed! totalDistanceKm: ${data.totalDistanceKm} km, totalTime: ${data.estimatedTravelTimeMinutes} mins`);
  });

  // 3. Speed Fallback Chain Test (current_speed IS NULL -> free_flow_speed = 40 km/h)
  const fallbackRouteId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  await testEndpoint(`GET /api/routes/${fallbackRouteId}/travel-time (Speed fallback chain verification)`, async () => {
    const res = await axios.get(`${BASE_URL}/api/routes/${fallbackRouteId}/travel-time`);
    if (res.status !== 200) {
      throw new Error(`Expected HTTP status 200, got ${res.status}`);
    }

    const data = res.data;
    console.log(`     Fallback Verification Response:`, JSON.stringify(data, null, 2));

    const seg = data.segments[0];
    if (seg.speedKmph !== 40) {
      throw new Error(`Expected speedKmph to fallback to free_flow_speed (40 km/h), got ${seg.speedKmph}`);
    }

    const expectedTime = 8.34;
    if (!isCloseTo(data.estimatedTravelTimeMinutes, expectedTime, 0.01)) {
      throw new Error(`estimatedTravelTimeMinutes expected ${expectedTime} ±0.01, got ${data.estimatedTravelTimeMinutes}`);
    }

    console.log(`     ✓ Speed fallback chain verified! Segment fallback speed: ${seg.speedKmph} km/h, travelTime: ${data.estimatedTravelTimeMinutes} mins`);
  });

  // 4. Error handling: Route not found (404)
  const nonExistentRouteId = '00000000-0000-0000-0000-000000000000';
  await testEndpoint(`GET /api/routes/${nonExistentRouteId}/travel-time (Non-existent route ID returns 404)`, async () => {
    try {
      await axios.get(`${BASE_URL}/api/routes/${nonExistentRouteId}/travel-time`);
      throw new Error('Expected request to fail with 404, but it succeeded');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.log(`     ✓ Received expected 404 response: "${err.response.data.message}"`);
      } else {
        throw err;
      }
    }
  });

  console.log(`========================================`);
  console.log(`TRAVEL TIME TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

runTravelTimeTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
