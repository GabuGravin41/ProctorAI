const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:Colossus123!@localhost:5432/proctor_ai' });

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name IN ('users', 'exams', 'questions', 'exam_sessions', 'cheating_flags', 'waitlist', 'answers')
    ORDER BY table_name, ordinal_position
  `);
  
  const tables = {};
  for (const row of res.rows) {
    if (!tables[row.table_name]) tables[row.table_name] = [];
    tables[row.table_name].push(row.column_name);
  }
  
  console.log(JSON.stringify(tables, null, 2));
  await client.end();
}
run();
