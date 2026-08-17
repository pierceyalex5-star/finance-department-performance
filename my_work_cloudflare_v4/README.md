# My Work v4 — conversational AI task & project memory

This version is designed for an environment where Vercel is not permitted and ChatGPT custom MCP write access is unavailable.

## Architecture

Browser (chat-first UI) → Cloudflare Worker → OpenAI Responses API → function calls → Neon Postgres

The AI, not the browser, interprets the conversation. The Worker exposes internal functions for projects, tasks, notes/decisions and durable work memory. Neon is the source of truth.

## What the user can say

- “I need to finish the pricing policy Friday and send it to Jason.”
- “Jason approved the sale-class approach. Keep the discount thresholds unchanged for now.”
- “I finished the D365 costing review.”
- “Push that follow-up to Thursday.”
- “What should I focus on today?”
- “What did we decide about sale classes?”
- “What am I waiting on?”

## Security

No secret is stored in browser code or this repository. The deployed Worker requires:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `APP_PASSWORD`
- `SESSION_SECRET`

The dashboard is protected by an HttpOnly, Secure, SameSite=Strict session cookie signed with `SESSION_SECRET`.

## Database

Apply `schema.sql` to the Neon database. For local initialization:

```bash
npm install
DATABASE_URL='postgresql://...' npm run db:init
```

## Local development

1. Copy `.dev.vars.example` to `.dev.vars` and fill in secrets.
2. `npm install`
3. `npm run dev`
4. Open the local Wrangler URL.

## Cloudflare deployment

Authenticate Wrangler with the Cloudflare account approved by your organization, then set secrets:

```bash
npx wrangler login
npx wrangler secret put DATABASE_URL
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put APP_PASSWORD
npx wrangler secret put SESSION_SECRET
npm run deploy
```

The deployed app uses `gpt-5.6` by default; change `OPENAI_MODEL` in `wrangler.jsonc` if desired.

## Historical memory

The `memory_entries`, `notes`, and `chat_messages` tables are deliberately separate from operational tasks. Prior discussion context can be imported without accidentally creating stale to-dos. `search_memory` allows the model to retrieve prior project rationale and decisions when the user refers to earlier discussions.
