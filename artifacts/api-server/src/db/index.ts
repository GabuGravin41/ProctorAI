import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL_POSTGRES_URL ||
  process.env.DATABASE_URL_POSTGRES_USER ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
export * from './schema';
