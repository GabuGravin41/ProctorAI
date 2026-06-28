import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgres://neondb_owner:npg_uitam2Spqb9T@ep-divine-glade-adt3sbj8-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to Neon database.');
  try {
    const res = await client.query('SELECT id, title, status FROM exams;');
    console.log('All exams in DB:');
    console.log(res.rows);
  } catch (err) {
    console.error('Query failed:', err.message);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Script error:', err);
});
