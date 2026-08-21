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
    server.kill();
    console.log(`\nFull suite test process exited with code ${code}`);
    process.exit(code);
  });
}

runFullSuite();
