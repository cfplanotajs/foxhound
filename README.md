# Foxhound Internal Image Dashboard (MVP)

Local internal tool for standardized AI image generation workflows for studio teams.

## MVP workflow
Preset → Prompt composition → Job enqueue → Worker processes queued jobs → Local image save → Gallery → Audit log → ZIP download.

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma + SQLite
- OpenAI image generation API

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Set `OPENAI_API_KEY` in `.env`.
4. Generate Prisma client and run migrations:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```
5. Run the app and worker in separate terminals:
   ```bash
   npm run dev
   npm run worker
   ```

## Environment variables
- `DATABASE_URL` - SQLite database path.
- `OPENAI_API_KEY` - server-side API key for OpenAI.
- `OPENAI_IMAGE_MODEL` - default model override (e.g. `gpt-image-2`).
- `WORKER_POLL_INTERVAL_MS` - worker polling interval in milliseconds.
- `WORKER_MAX_ATTEMPTS` - creation-time default retry attempts per task (sanitized to positive integer, default `3`, clamped `1..25`).
- `WORKER_RETRY_BASE_MS` - base backoff delay in milliseconds.

## Local development flow
1. `npm run dev`
2. `npm run worker`
3. Submit a job from dashboard
4. Worker logs claim/process lifecycle
5. Refresh gallery and download ZIP

## Tests
Run tests with:
```bash
npm test
```
The project uses Node's built-in test runner with `tsx` registration for TypeScript test files.

## Core API routes
- `GET /api/presets`
- `POST /api/jobs` (enqueue)
- `POST /api/jobs/process` (manual process trigger)
- `GET /api/jobs/:jobId`
- `GET /api/jobs/:jobId/images`
- `GET /api/images/:jobId/:taskId`
- `GET /api/jobs/:jobId/download`

## Current limitations (MVP)
- Only OpenAI provider is implemented.
- Worker is simple local poller, not distributed queue infra.
- No auth system, cloud storage, CSV upload, or batch mode yet.

## Roadmap
- Add provider adapters for Gemini/Nano Banana and Fal/Flux.
- Add richer queue observability and admin controls.
- Add OpenAI Batch API mode.


## Phase 3 preset seed

After migrations, presets are auto-seeded from `config/presets.json` when `/api/presets` or job creation endpoints are called.
For local setup run:

```bash
DATABASE_URL=file:./prisma/dev.db npx prisma migrate dev
DATABASE_URL=file:./prisma/dev.db npm run prisma:generate
```
