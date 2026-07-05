import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgres://neondb_owner:npg_uitam2Spqb9T@ep-divine-glade-adt3sbj8-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to Neon database.');
  try {
    // Add the new column safely if it doesn't already exist
    await client.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE;');
    console.log('Successfully added access_code column to exams table.');
  } catch (err) {
    console.error('Alter failed:', err.message);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Script error:', err);
});
