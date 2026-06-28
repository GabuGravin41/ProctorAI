import pg from 'pg';
const client = new pg.Client({
  connectionString: 'postgres://neondb_owner:npg_uitam2Spqb9T@ep-divine-glade-adt3sbj8-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
});
await client.connect();
const res = await client.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
);
console.log('\nTables in your Neon database:');
if (res.rows.length === 0) {
  console.log('  ⚠️  No tables found!');
} else {
  res.rows.forEach(row => console.log('  ✅', row.table_name));
}
await client.end();
