const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 5001; // Use 5001 for test instance to avoid collision
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess;

function makeRequest(method, pathName) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${pathName}`;
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function runTests() {
  console.log('Starting TrafficVision AI backend test instance...');

  const env = { ...process.env, PORT: PORT };
  serverProcess = spawn('node', ['server.js'], { cwd: __dirname, env: env });

  serverProcess.stdout.on('data', (data) => {
    // console.log(`Server stdout: ${data}`);
  });
  serverProcess.stderr.on('data', (data) => {
    // console.error(`Server stderr: ${data}`);
  });

  // Wait 2 seconds for server to start listening
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    console.log('\n--- 1. Testing GET /api/reports/traffic-prediction ---');
    const res1 = await makeRequest('GET', '/api/reports/traffic-prediction');
    console.log(`Status Code: ${res1.statusCode}`);
    const json1 = JSON.parse(res1.body);
    console.log(`Report Title: ${json1.report_title}`);
    console.log(`Total Locations: ${json1.summary.total_locations}`);
    console.log(`PDF Filename: ${json1.pdf_filename}`);
    if (res1.statusCode !== 200) throw new Error('GET /api/reports/traffic-prediction failed');

    console.log('\n--- 2. Testing GET /api/reports/traffic-prediction/history?limit=5 ---');
    const res2 = await makeRequest('GET', '/api/reports/traffic-prediction/history?limit=5');
    console.log(`Status Code: ${res2.statusCode}`);
    const json2 = JSON.parse(res2.body);
    console.log(`History Count: ${json2.count}, Limit: ${json2.limit}`);
    if (res2.statusCode !== 200 || !Array.isArray(json2.reports)) throw new Error('GET history failed');

    console.log('\n--- 3. Testing GET /api/reports/traffic-prediction/pdf/:filename ---');
    const pdfFilename = json1.pdf_filename;
    const res3 = await makeRequest('GET', `/api/reports/traffic-prediction/pdf/${pdfFilename}`);
    console.log(`Status Code: ${res3.statusCode}`);
    console.log(`Content-Type: ${res3.headers['content-type']}`);
    console.log(`Byte Length: ${res3.body.length}`);
    if (res3.statusCode !== 200 || res3.headers['content-type'] !== 'application/pdf') {
      throw new Error('GET pdf download failed');
    }

    console.log('\n--- 4. Testing POST /api/reports/traffic-prediction/generate ---');
    const res4 = await makeRequest('POST', '/api/reports/traffic-prediction/generate');
    console.log(`Status Code: ${res4.statusCode}`);
    const json4 = JSON.parse(res4.body);
    console.log(`Generate Result Message: ${json4.message}`);
    console.log(`New PDF Filename: ${json4.report ? json4.report.pdf_filename : json4.scriptResult.pdf_filename}`);
    if (res4.statusCode !== 201) throw new Error('POST generate failed');

    console.log('\nALL 4 ENDPOINT TESTS PASSED SUCCESSFULLY! SUCCESS!');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runTests();
