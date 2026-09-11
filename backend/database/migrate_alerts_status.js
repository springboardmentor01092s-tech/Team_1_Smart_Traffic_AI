const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

async function migrateAlertsStatus() {
  try {
    console.log('Running migration: Adding status column lifecycle to alerts table...');

    // 1. Ensure status column exists with VARCHAR(20) default 'Active'
    await pool.query(`
      ALTER TABLE alerts
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Active';
    `);

    // 2. Drop existing check constraints on status if present
    await pool.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT constraint_name
          FROM information_schema.constraint_column_usage
          WHERE table_name = 'alerts' AND column_name = 'status'
        ) LOOP
          EXECUTE 'ALTER TABLE alerts DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `);

    // 3. Normalize any existing legacy status values
    const distinctBefore = await pool.query(`SELECT DISTINCT status FROM alerts`);
    console.log('Existing distinct status values before migration:', distinctBefore.rows.map(r => r.status));

    await pool.query(`
      UPDATE alerts
      SET status = CASE
        WHEN status ILIKE 'active' THEN 'Active'
        WHEN status ILIKE 'notified' THEN 'Notified'
        WHEN status ILIKE 'acknowledged' THEN 'Acknowledged'
        WHEN status ILIKE 'resolved' THEN 'Resolved'
        ELSE 'Active'
      END;
    `);

    const distinctAfter = await pool.query(`SELECT DISTINCT status FROM alerts`);
    console.log('Normalized status values:', distinctAfter.rows.map(r => r.status));

    // 4. Set default to 'Active'
    await pool.query(`
      ALTER TABLE alerts
      ALTER COLUMN status SET DEFAULT 'Active';
    `);

    // 5. Add new CHECK constraint for four allowed values
    await pool.query(`
      ALTER TABLE alerts
      ADD CONSTRAINT alerts_status_check
      CHECK (status IN ('Active', 'Notified', 'Acknowledged', 'Resolved'));
    `);

    console.log('Migration successful: alerts table status column updated with allowed values (Active, Notified, Acknowledged, Resolved).');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  }
}

if (require.main === module) {
  migrateAlertsStatus()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateAlertsStatus;
