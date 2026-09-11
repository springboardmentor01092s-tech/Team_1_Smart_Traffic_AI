const pool = require('../config/db');

async function runMigration() {
  console.log('Running migration: recommendations table & plain_summary column...');
  try {
    // 1. Add plain_summary column to reports table if not exists
    await pool.query(`
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS plain_summary JSONB;
    `);
    console.log('✓ Added plain_summary column to reports table (if not existing).');

    // 2. Create recommendations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recommendations (
        recommendation_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_route_id            UUID REFERENCES routes(route_id) ON DELETE CASCADE,
        recommended_route_id         UUID REFERENCES routes(route_id) ON DELETE CASCADE,
        original_congestion_score    DECIMAL(4,2),
        recommended_congestion_score DECIMAL(4,2),
        original_eta_mins            DECIMAL(6,2),
        recommended_eta_mins         DECIMAL(6,2),
        minutes_saved                DECIMAL(6,2),
        reason                       TEXT,
        created_at                   TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC);
    `);
    console.log('✓ Created recommendations table (if not existing).');

    console.log('Migration finished successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
