import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgres://neondb_owner:npg_uitam2Spqb9T@ep-divine-glade-adt3sbj8-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to Neon database.');
  try {
    // Add columns safely
    await client.query('ALTER TABLE cheating_flags ADD COLUMN IF NOT EXISTS clip_data TEXT;');
    await client.query('ALTER TABLE cheating_flags ADD COLUMN IF NOT EXISTS detected_at TIMESTAMP DEFAULT now();');
    await client.query('ALTER TABLE cheating_flags ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT \'pending\';');
    await client.query('ALTER TABLE cheating_flags ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;');
    await client.query('ALTER TABLE cheating_flags ADD COLUMN IF NOT EXISTS review_note TEXT;');
    console.log('Added missing columns successfully.');

    // Migrate existing rows
    const resTimestamp = await client.query('UPDATE cheating_flags SET detected_at = timestamp WHERE detected_at IS NULL AND timestamp IS NOT NULL;');
    console.log(`Migrated ${resTimestamp.rowCount} date values from timestamp to detected_at.`);

    const resReviewed = await client.query('UPDATE cheating_flags SET review_status = \'confirmed\' WHERE reviewed = true AND review_status = \'pending\';');
    console.log(`Migrated ${resReviewed.rowCount} review statuses.`);
  } catch (err) {
    console.error('Alter failed:', err.message);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Script error:', err);
});
