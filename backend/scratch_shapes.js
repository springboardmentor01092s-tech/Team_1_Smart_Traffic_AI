const http = require('http');

const locId = '11111111-1111-1111-1111-111111111111';
const routeId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const endpoints = [
  { name: 'GET /api/analytics/by-location', path: '/api/analytics/by-location', method: 'GET' },
  { name: 'GET /api/routes', path: '/api/routes', method: 'GET' },
  { name: 'GET /api/routes/:id/analysis', path: `/api/routes/${routeId}/analysis`, method: 'GET' },
  { name: 'GET /api/routes/:id/travel-time', path: `/api/routes/${routeId}/travel-time`, method: 'GET' },
  { name: 'POST /api/predictions/:location_id', path: `/api/predictions/${locId}`, method: 'POST' },
  { name: 'GET /api/predictions/:location_id', path: `/api/predictions/${locId}`, method: 'GET' },
  { name: 'GET /api/alerts', path: '/api/alerts', method: 'GET' },
  { name: 'GET /api/alerts/:location_id', path: `/api/alerts/${locId}`, method: 'GET' },
  { name: 'GET /api/analytics/trends', path: '/api/analytics/trends', method: 'GET' },
  { name: 'GET /api/analytics/busiest-locations', path: '/api/analytics/busiest-locations', method: 'GET' },
  { name: 'GET /api/analytics/most-congested-routes', path: '/api/analytics/most-congested-routes', method: 'GET' },
  { name: 'GET /api/analytics/alert-stats', path: '/api/analytics/alert-stats', method: 'GET' },
  { name: 'GET /api/analytics/dashboard-summary', path: '/api/analytics/dashboard-summary', method: 'GET' }
];

function request(ep) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: ep.path,
      method: ep.method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', (err) => resolve({ error: err.message }));
    req.end();
  });
}

async function main() {
  for (const ep of endpoints) {
    const res = await request(ep);
    console.log(`\n=== ${ep.name} [Status: ${res.status}] ===`);
    if (res.json) {
      if (Array.isArray(res.json)) {
        console.log(`Type: Array (Length: ${res.json.length})`);
        if (res.json.length > 0) {
          console.log('Item [0] Keys:', Object.keys(res.json[0]));
          console.log('Item [0] Sample:', res.json[0]);
        }
      } else {
        console.log('Type: Object | Keys:', Object.keys(res.json));
        console.log('Sample payload:', JSON.stringify(res.json, null, 2));
      }
    } else {
      console.log('Raw response:', res.raw || res.error);
    }
  }
}

main();
