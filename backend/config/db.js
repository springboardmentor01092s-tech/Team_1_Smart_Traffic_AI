const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

const poolConfig = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

const connectionConfig = process.env.DATABASE_URL
  ? {
      ...poolConfig,
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    }
  : {
      ...poolConfig,
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

const pool = new Pool(connectionConfig);

module.exports = pool;