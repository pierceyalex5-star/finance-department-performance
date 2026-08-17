# My Work v4 — deployment checklist

## Completed
- Neon Postgres project created
- Core tables created: projects, tasks, notes, memory_entries, activity_log
- Persistent chat history table created and committed to the main Neon branch
- Chat-first UI built
- OpenAI Responses API function-calling orchestration built
- Password/session protection built
- Cloudflare Worker configuration built

## Required credentials before production deployment
1. An organization-approved Cloudflare account/session for Wrangler.
2. An OpenAI API key with API billing/credits available.

## Cloudflare secrets
Set these as Worker secrets; never commit them to the repository:
- DATABASE_URL
- OPENAI_API_KEY
- APP_PASSWORD
- SESSION_SECRET

## Deployment commands
From this folder:

npm install
npx wrangler login
npx wrangler secret put DATABASE_URL
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put APP_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler deploy

After deployment, open the generated workers.dev URL and log in with APP_PASSWORD.

## Important
The database URL and API key are intentionally not stored in this package.
