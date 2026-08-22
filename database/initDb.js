const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initDatabase() {
  const isCloud = !!process.env.DATABASE_URL;
  let clientConfig;

  if (isCloud) {
    clientConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    };
  } else {
    clientConfig = {
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: 'postgres'
    };
  }

  console.log(`Connecting to database (${isCloud ? 'Cloud DATABASE_URL' : 'Local Host'})...`);

  if (!isCloud) {
    const rootClient = new Client(clientConfig);
    await rootClient.connect();

    const dbName = process.env.DB_NAME || 'trafficvision_ai';
    const res = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rows.length === 0) {
      console.log(`Creating database ${dbName}...`);
      await rootClient.query(`CREATE DATABASE ${dbName}`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
    await rootClient.end();

    clientConfig.database = dbName;
  }

  const dbClient = new Client(clientConfig);
  await dbClient.connect();

  console.log('Applying schema trafficvision_schema.sql...');
  const schemaSql = fs.readFileSync(path.join(__dirname, 'trafficvision_schema.sql'), 'utf8');
  await dbClient.query(schemaSql);

  console.log('Applying seed data seed.sql...');
  const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  await dbClient.query(seedSql);

  console.log('Database initialization complete!');
  await dbClient.end();
}

initDatabase().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
