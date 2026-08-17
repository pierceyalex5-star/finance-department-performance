import fs from 'fs';
import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
const state = JSON.parse(fs.readFileSync('state.json','utf8'));
const sql = neon(process.env.DATABASE_URL);
await sql`UPDATE dashboard_state SET state=${JSON.stringify(state)}::jsonb, updated_at=now() WHERE id=1`;
console.log('Seeded Neon with state version', state.version, state.updatedAt);
