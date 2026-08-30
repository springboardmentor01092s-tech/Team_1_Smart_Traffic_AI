const { spawn } = require('child_process');

async function runFullSuite() {
  console.log('Starting TrafficVision AI backend on test port 5001...');
  const env = { ...process.env, PORT: '5001' };
  const server = spawn('node', ['server.js'], { cwd: __dirname, env: env });

  server.stdout.on('data', (d) => {
    // console.log(`[SERVER] ${d}`);
  });
  server.stderr.on('data', (d) => {
    // console.error(`[SERVER ERR] ${d}`);
  });

  // Wait 2 seconds for server boot
  await new Promise((r) => setTimeout(r, 2000));

  console.log('Running test_all_endpoints.js against http://localhost:5001...');
  const testEnv = { ...process.env, TEST_BASE_URL: 'http://localhost:5001' };
  const tester = spawn('node', ['test_all_endpoints.js'], { cwd: __dirname, env: testEnv });

  tester.stdout.on('data', (d) => process.stdout.write(d));
  tester.stderr.on('data', (d) => process.stderr.write(d));

  tester.on('close', (code) => {
    if (code !== 0) {
      server.kill();
      console.log(`\ntest_all_endpoints.js failed with code ${code}`);
      process.exit(code);
    }

    console.log('Running test_analytics_heatmap.js against http://localhost:5001...');
    const heatmapTester = spawn('node', ['test_analytics_heatmap.js'], { cwd: __dirname, env: testEnv });

    heatmapTester.stdout.on('data', (d) => process.stdout.write(d));
    heatmapTester.stderr.on('data', (d) => process.stderr.write(d));

    heatmapTester.on('close', (heatmapCode) => {
      if (heatmapCode !== 0) {
        server.kill();
        console.log(`\ntest_analytics_heatmap.js failed with code ${heatmapCode}`);
        process.exit(heatmapCode);
      }

      console.log('Running test_recommendations.js against http://localhost:5001...');
      const recTester = spawn('node', ['test_recommendations.js'], { cwd: __dirname, env: testEnv });

      recTester.stdout.on('data', (d) => process.stdout.write(d));
      recTester.stderr.on('data', (d) => process.stderr.write(d));

      recTester.on('close', (recCode) => {
        server.kill();
        console.log(`\nFull suite test process completed with code ${recCode}`);
        process.exit(recCode);
      });
    });
  });
}

runFullSuite();
