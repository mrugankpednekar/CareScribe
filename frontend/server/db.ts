import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not set. Using in-memory storage.");
}

export const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
export const db = pool ? drizzle(pool, { schema }) : undefined;

/**
 * Ensure the Postgres schema has the columns the app expects.
 * Useful when the database was created before newer fields (e.g., labs/type).
 */
export async function ensureDbSchema() {
    if (!pool) return;

    // Add optional columns that may be missing on older databases.
    await pool.query(`
        ALTER TABLE IF EXISTS appointments
            ADD COLUMN IF NOT EXISTS type text,
            ADD COLUMN IF NOT EXISTS lab_type text,
            ADD COLUMN IF NOT EXISTS attached_provider_id varchar,
            ADD COLUMN IF NOT EXISTS diagnosis text[],
            ADD COLUMN IF NOT EXISTS instructions text[];
    `);
}
