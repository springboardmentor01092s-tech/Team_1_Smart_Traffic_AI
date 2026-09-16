const axios = require('axios');
const pool = require('./config/db');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

async function runNotificationWorkflowTests() {
  console.log(`Starting Congestion & Accident Notification Workflow & Edge Case Tests against: ${BASE_URL}\n`);
  let passed = 0;
  let failed = 0;

  async function testStep(name, fn) {
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

  const sampleLocationId = '11111111-1111-1111-1111-111111111111';
  let createdAlertId = null;

  try {
    // Clean up any lingering test alerts/traffic data first
    await pool.query(`DELETE FROM alerts WHERE message LIKE '%[Simulated Incident]%'`);
    await pool.query(`DELETE FROM traffic_data WHERE source = 'simulated_test_incident'`);

    // 1. Insert simulated traffic incident with severe congestion
    await testStep('Insert simulated traffic incident data into DB', async () => {
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const time = new Date(now.getTime() - i * 60 * 1000);
        await pool.query(
          `INSERT INTO traffic_data 
            (data_id, location_id, recorded_at, average_speed_kmph, current_speed, free_flow_speed, congestion_level, source)
           VALUES (gen_random_uuid(), $1, $2, 8.50, 8.50, 60.00, 'severe', 'simulated_test_incident')`,
          [sampleLocationId, time]
        );
      }
      console.log(`     Simulated 5 severe congestion traffic readings inserted for location ${sampleLocationId}`);
    });

    // 2. Generate prediction and alert
    await testStep('Trigger prediction endpoint & create alert (POST /api/predictions/:location_id)', async () => {
      const res = await axios.post(`${BASE_URL}/api/predictions/${sampleLocationId}`);
      if (res.status !== 201) throw new Error(`Unexpected status ${res.status}`);
      console.log(`     Prediction generated: ${res.data.prediction.predicted_congestion} congestion`);

      const alertsRes = await axios.get(`${BASE_URL}/api/alerts/${sampleLocationId}`);
      if (!Array.isArray(alertsRes.data) || alertsRes.data.length === 0) {
        throw new Error('No alert was generated for severe prediction');
      }

      const alert = alertsRes.data[0];
      createdAlertId = alert.alert_id;
      console.log(`     Alert created with ID: ${createdAlertId}, status: "${alert.status}"`);
    });

    // 3. Verify newly created alert starts at 'Active'
    await testStep('Verify newly created alert initial status is "Active"', async () => {
      if (!createdAlertId) throw new Error('No created alert ID available');
      const alertsRes = await axios.get(`${BASE_URL}/api/alerts`);
      const alert = alertsRes.data.find(a => a.alert_id === createdAlertId);
      if (!alert) throw new Error(`Alert ${createdAlertId} not found in GET /api/alerts`);

      if (alert.status !== 'Active') {
        throw new Error(`Expected status to be "Active", got "${alert.status}"`);
      }
      console.log(`     Confirmed alert status is "${alert.status}"`);
    });

    // 4. Edge Case 1: Concurrent Race Condition Test
    await testStep('Edge Case 1: Concurrent near-simultaneous PATCH updates for same alert', async () => {
      // Alert is currently at 'Active'.
      // Send two concurrent PATCH requests: Req A -> Notified, Req B -> Resolved (invalid jump if status becomes Notified)
      const reqA = axios.patch(`${BASE_URL}/api/alerts/${createdAlertId}/status`, { status: 'Notified' });
      const reqB = axios.patch(`${BASE_URL}/api/alerts/${createdAlertId}/status`, { status: 'Resolved' });

      const results = await Promise.allSettled([reqA, reqB]);

      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');

      if (fulfilled.length !== 1 || rejected.length !== 1) {
        throw new Error(`Expected exactly 1 success and 1 rejection under race conditions. Fulfilled: ${fulfilled.length}, Rejected: ${rejected.length}`);
      }

      const rejectedReason = rejected[0].reason;
      if (!rejectedReason.response || rejectedReason.response.status !== 409) {
        throw new Error(`Expected 409 Conflict response for race condition failure, got ${rejectedReason.response ? rejectedReason.response.status : rejectedReason.message}`);
      }

      console.log(`     Race condition handled safely: 1 succeeded (200 OK), 1 rejected with 409 Conflict ("${rejectedReason.response.data.error}")`);
    });

    // 5. Verify current status after race condition test
    await testStep('Verify alert status after concurrent update is "Notified"', async () => {
      const alertsRes = await axios.get(`${BASE_URL}/api/alerts/${sampleLocationId}`);
      const alert = alertsRes.data.find(a => a.alert_id === createdAlertId);
      if (alert.status !== 'Notified') {
        throw new Error(`Expected status to be "Notified", got "${alert.status}"`);
      }
      console.log(`     Confirmed alert status is "${alert.status}"`);
    });

    // 6. Valid transition: Notified -> Acknowledged
    await testStep('Transition Alert: Notified -> Acknowledged (PATCH /api/alerts/:id/status)', async () => {
      const res = await axios.patch(`${BASE_URL}/api/alerts/${createdAlertId}/status`, { status: 'Acknowledged' });
      if (res.status !== 200 || res.data.status !== 'Acknowledged') {
        throw new Error(`Expected status "Acknowledged", got "${res.data.status}"`);
      }
      console.log(`     Updated status successfully to "${res.data.status}"`);
    });

    // 7. Valid transition: Acknowledged -> Resolved
    await testStep('Transition Alert: Acknowledged -> Resolved (PATCH /api/alerts/:id/status)', async () => {
      const res = await axios.patch(`${BASE_URL}/api/alerts/${createdAlertId}/status`, { status: 'Resolved' });
      if (res.status !== 200 || res.data.status !== 'Resolved') {
        throw new Error(`Expected status "Resolved", got "${res.data.status}"`);
      }
      if (!res.data.resolved_at) {
        throw new Error('Expected resolved_at timestamp to be populated when alert is Resolved');
      }
      console.log(`     Updated status successfully to "${res.data.status}", resolved_at: ${res.data.resolved_at}`);
    });

    // 8. Edge Case 3: Reopen & resolved_at clearing test
    await testStep('Edge Case 3: Reopen alert & verify resolved_at gets cleared (NULL)', async () => {
      // 8a. Verify normal transition from Resolved -> Active without bypass is blocked (409 Conflict)
      try {
        await axios.patch(`${BASE_URL}/api/alerts/${createdAlertId}/status`, { status: 'Active' });
        throw new Error('Server allowed reopening Resolved alert without bypassValidation');
      } catch (err) {
        if (!err.response || (err.response.status !== 409 && err.response.status !== 400)) {
          throw err;
        }
        console.log(`     Normal reopen correctly rejected with ${err.response.status}`);
      }

      // 8b. Reopen with bypassValidation: true and verify resolved_at is cleared to null
      const resBypass = await axios.patch(`${BASE_URL}/api/alerts/${createdAlertId}/status`, {
        status: 'Active',
        bypassValidation: true
      });
      if (resBypass.status !== 200 || resBypass.data.status !== 'Active') {
        throw new Error('Bypass reopen failed');
      }
      if (resBypass.data.resolved_at !== null) {
        throw new Error(`Expected resolved_at to be NULL after reopening, got ${resBypass.data.resolved_at}`);
      }
      console.log(`     Reopened alert to "Active" via admin override and confirmed resolved_at is NULL`);
    });

    // 9. Filter Alerts by Status
    await testStep('Filter Alerts by Status (GET /api/alerts?status=Active)', async () => {
      const resActive = await axios.get(`${BASE_URL}/api/alerts?status=Active`);
      const foundActive = resActive.data.some(a => a.alert_id === createdAlertId);
      if (!foundActive) {
        throw new Error('Reopened Active alert not found in GET /api/alerts?status=Active');
      }
      console.log(`     Status filtering verified for reopened alert`);
    });

  } finally {
    // 10. Teardown / Cleanup
    await testStep('Cleanup simulated test incident data & alerts from DB', async () => {
      if (createdAlertId) {
        await pool.query(`DELETE FROM alerts WHERE alert_id = $1`, [createdAlertId]);
      }
      await pool.query(`DELETE FROM traffic_data WHERE source = 'simulated_test_incident'`);
      console.log(`     Cleaned up test alert and simulated traffic data successfully.`);
    });
  }

  console.log(`========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

runNotificationWorkflowTests().catch(err => {
  console.error('Workflow test script execution error:', err);
  process.exit(1);
});
