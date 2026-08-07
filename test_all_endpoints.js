const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

async function runTests() {
  console.log(`Starting API Verification Tests against: ${BASE_URL}\n`);
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

  // 1. Root
  await testEndpoint('GET / (Root status)', async () => {
    const res = await axios.get(`${BASE_URL}/`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    console.log(`     Response: "${res.data}"`);
  });

  // 2. Test DB
  await testEndpoint('GET /test-db (Database timestamp)', async () => {
    const res = await axios.get(`${BASE_URL}/test-db`);
    if (res.status !== 200 || !res.data.now) throw new Error('Invalid db test response');
    console.log(`     DB NOW(): ${res.data.now}`);
  });

  // 3. Signup
  const testEmail = `testuser_${Date.now()}@trafficvision.ai`;
  let authToken = null;

  await testEndpoint('POST /api/auth/signup (User registration)', async () => {
    const res = await axios.post(`${BASE_URL}/api/auth/signup`, {
      name: 'Test Analyst',
      email: testEmail,
      password: 'SecurePassword123!',
      role: 'analyst'
    });
    if (res.status !== 201) throw new Error('Failed user signup');
    console.log(`     User created: ${res.data.user.email} (${res.data.user.role})`);
  });

  // 4. Login
  await testEndpoint('POST /api/auth/login (User authentication)', async () => {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testEmail,
      password: 'SecurePassword123!'
    });
    if (res.status !== 200 || !res.data.token) throw new Error('Failed user login');
    authToken = res.data.token;
    console.log(`     Token received for ${res.data.user.name}`);
  });

  // 5. Traffic Data Fetch
  await testEndpoint('GET /api/traffic/fetch (Fetch & process live traffic data)', async () => {
    const res = await axios.get(`${BASE_URL}/api/traffic/fetch`);
    if (res.status !== 200) throw new Error('Failed to fetch traffic data');
    console.log(`     Updated ${res.data.data ? res.data.data.length : 0} traffic readings`);
  });

  // 6. Generate Prediction
  const sampleLocationId = '11111111-1111-1111-1111-111111111111';
  await testEndpoint(`POST /api/predictions/${sampleLocationId} (AI Prediction generation)`, async () => {
    const res = await axios.post(`${BASE_URL}/api/predictions/${sampleLocationId}`);
    if (res.status !== 201) throw new Error('Failed to generate prediction');
    console.log(`     Predicted Congestion: ${res.data.prediction.predicted_congestion} (avg speed: ${res.data.basedOnAvgSpeed} km/h)`);
  });

  // 7. Get Latest Prediction
  await testEndpoint(`GET /api/predictions/${sampleLocationId} (Retrieve prediction)`, async () => {
    const res = await axios.get(`${BASE_URL}/api/predictions/${sampleLocationId}`);
    if (res.status !== 200 || !res.data.predicted_congestion) throw new Error('Failed to fetch latest prediction');
    console.log(`     Latest Prediction: ${res.data.predicted_congestion} @ ${res.data.predicted_for}`);
  });

  // 8. Route Analysis
  const sampleRouteId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  await testEndpoint(`GET /api/routes/${sampleRouteId}/analysis (Route Congestion Analysis)`, async () => {
    const res = await axios.get(`${BASE_URL}/api/routes/${sampleRouteId}/analysis`);
    if (res.status !== 200) throw new Error('Failed route analysis');
    console.log(`     Route Score: ${res.data.congestionScore} (Level: ${res.data.level})`);
  });

  // 9. Get All Alerts
  await testEndpoint('GET /api/alerts (All system alerts)', async () => {
    const res = await axios.get(`${BASE_URL}/api/alerts`);
    if (res.status !== 200) throw new Error('Failed to fetch alerts');
    console.log(`     Total Alerts Count: ${res.data.length}`);
  });

  // 10. Get Alerts By Location
  await testEndpoint(`GET /api/alerts/${sampleLocationId} (Location alerts filter)`, async () => {
    const res = await axios.get(`${BASE_URL}/api/alerts/${sampleLocationId}`);
    if (res.status !== 200) throw new Error('Failed location alerts');
    console.log(`     Location Alerts Count: ${res.data.length}`);
  });

  // 11. Analytics: By Location
  await testEndpoint('GET /api/analytics/by-location (Location congestion analytics)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/by-location`);
    if (res.status !== 200) throw new Error('Failed analytics by location');
    console.log(`     Locations Analyzed: ${res.data.length}`);
  });

  // 12. Analytics: Alerts Summary
  await testEndpoint('GET /api/analytics/alerts (Alerts breakdown analytics)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/alerts`);
    if (res.status !== 200) throw new Error('Failed alerts summary');
    console.log(`     Summary Groups: ${JSON.stringify(res.data.summary)}`);
  });

  // 13. Analytics: Overall Summary
  await testEndpoint('GET /api/analytics/summary (Network traffic summary)', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics/summary`);
    if (res.status !== 200) throw new Error('Failed overall summary');
    console.log(`     Network Status Breakdown: ${JSON.stringify(res.data)}`);
  });

  console.log(`========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
