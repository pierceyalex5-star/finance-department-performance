import fs from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const sql = neon(url);
const ddl = await fs.readFile(new URL('../schema.sql', import.meta.url), 'utf8');
const statements = ddl.split(/;\s*(?:\n|$)/).map(s=>s.trim()).filter(Boolean);
for (const statement of statements) await sql.query(statement);
console.log(`Applied ${statements.length} schema statements.`);
