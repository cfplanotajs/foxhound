# Foxhound Internal Image Dashboard (MVP)

Local internal tool for standardized AI image generation workflows for studio teams.

## MVP workflow
Preset → Prompt composition → OpenAI image generation → Local image save → Gallery → Audit log → ZIP download.

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
5. Run dev server:
   ```bash
   npm run dev
   ```

## Environment variables
- `DATABASE_URL` - SQLite database path.
- `OPENAI_API_KEY` - server-side API key for OpenAI.
- `OPENAI_IMAGE_MODEL` - default model override (e.g. `gpt-image-2`).

## Core API routes
- `GET /api/presets`
- `POST /api/jobs`
- `GET /api/jobs/:jobId`
- `GET /api/jobs/:jobId/images`
- `GET /api/jobs/:jobId/download`

## Current limitations (MVP)
- Only OpenAI provider is implemented.
- Jobs are processed sequentially in request lifecycle.
- No auth, cloud storage, queues, CSV upload, or batch mode yet.

## Roadmap
- Add provider adapters for Gemini/Nano Banana and Fal/Flux.
- Add queued background processing and retries.
- Add OpenAI Batch API mode.
- Add richer filters/search in gallery.
