const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = require('../config/db');

async function migrateReportsTable() {
  const sql = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS reports (
        report_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_title    VARCHAR(255) NOT NULL DEFAULT 'Traffic Prediction Report',
        generated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        summary_json    JSONB NOT NULL,
        pdf_filename    VARCHAR(255),
        status          VARCHAR(50) DEFAULT 'completed',
        created_at      TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reports(generated_at DESC);
  `;

  try {
    console.log('Running migration: CREATE TABLE IF NOT EXISTS reports...');
    await pool.query(sql);
    console.log('Migration successful: reports table is ready.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  }
}

if (require.main === module) {
  migrateReportsTable().then(() => process.exit(0));
}

module.exports = migrateReportsTable;
