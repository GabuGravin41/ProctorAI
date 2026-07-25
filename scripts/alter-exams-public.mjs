import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

function loadEnv() {
  try {
    const env = readFileSync('.env', 'utf8');
    for (const line of env.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {
    // Rely on env variables
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://neondb_owner:npg_uitam2Spqb9T@ep-divine-glade-adt3sbj8-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to Neon database.');
  try {
    await client.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS topic TEXT;');
    console.log('Successfully added topic column to exams table.');
    await client.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT \'[]\'::jsonb;');
    console.log('Successfully added tags column to exams table.');
  } catch (err) {
    console.error('Alter failed:', err.message);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Script error:', err);
});
