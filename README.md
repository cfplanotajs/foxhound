# Foxhound Internal Image Dashboard (MVP)

Local internal tool for standardized AI image generation workflows for studio teams.

## MVP workflow
Preset → Prompt composition → Job enqueue → Worker processes queued jobs → Local image save → Gallery → Review → ZIP download.

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma + SQLite
- OpenAI image generation API

## Setup (fresh machine)
1. Install dependencies:
   ```bash
   npm ci
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Configure `.env`:
   - `DATABASE_URL` (required)
   - `OPENAI_API_KEY` (optional for Demo Mode, required for OpenAI mode)
   - `OPENAI_IMAGE_MODEL` (optional model override)
   - `OPENAI_EDIT_ADAPTER` (optional, `responses` or `images_edit`)
   - `FOXHOUND_STORAGE_DIR` (optional; leave blank for default `./generated`)
   - worker tuning envs are optional and have safe defaults
4. Initialize database and presets:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run presets:seed
   ```
5. Validate everything before demoing:
   ```bash
   npm run verify
   ```
   This runs Prisma generation, tests, lint, build, and typecheck in sequence.

## Run locally (development)
Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
npm run worker
```

## Run locally (production-ish server mode)
Terminal 1:
```bash
npm run build
npm run start
```

Terminal 2:
```bash
npm run worker
```

Health check:
```bash
curl http://localhost:3000/api/health
npm run health:check
npm run smoke:check
```

Backup helper:
```bash
npm run backup
npm run restore:check
```
Includes:
- SQLite DB backup
- generated assets folder (or `FOXHOUND_STORAGE_DIR` if set)
- `config/presets.json` when present

Excludes:
- `.env` (back up separately and securely)

When to use:
- `npm run health:check`: quick liveness check.
- `npm run smoke:check`: server/read-endpoint sanity check after start.
- `npm run restore:check`: read-only validation after restoring DB/assets.

## Stakeholder demo script
### One-minute overview
Foxhound helps designers create, edit, review, and export consistent visual assets from studio presets.

### Demo flow
1. Start app + worker (`npm run dev` and `npm run worker`).
2. Select **Start in Demo Mode**.
3. Pick a preset.
4. Generate multiple variations.
5. Mark one result as **Approved** (or **Favorite**).
6. Edit that result with instruction like: `white background, clean artifacts`.
7. Use **Compare** to review original vs edited output.
8. Download **Approved ZIP**.
9. If API key and credits are available, switch provider to **OpenAI Mode** and repeat generate/edit.

## Demo Mode vs OpenAI mode
- **Demo Mode (mock)**
  - no external API calls
  - generates deterministic placeholder images
  - validates end-to-end workflow without usage credits
- **OpenAI mode**
  - requires server-side `OPENAI_API_KEY`
  - never use `NEXT_PUBLIC_OPENAI_API_KEY`
  - model/size/quality are validated server-side
  - if account billing or credits are unavailable, requests may fail safely with actionable error messaging

## Storage and output paths
- Generated images are stored on local disk.
- Default base directory: `./generated` (repo-relative), with per-job subfolders.
- Optional override: set `FOXHOUND_STORAGE_DIR` in `.env` to change the base directory for local server deployments.
- Existing files are not moved automatically when changing storage dir.

## Troubleshooting
- **Jobs stay queued / nothing processes:** ensure `npm run worker` is running in a separate terminal.
- **Prisma client/migrations errors:** run `npm run prisma:generate` and `npm run prisma:migrate`.
- **OpenAI setup error:** set `OPENAI_API_KEY` in `.env` (server-side only).
- **OpenAI billing/credits failures:** use Demo Mode or add credits/enable billing in OpenAI account.
- **Missing image file errors:** output file may have been removed from disk; re-run the job.
- **Approved ZIP returns empty/400:** mark at least one image as Approved before using approved-only download.

## Tests
Run:
```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Current limitations (MVP)
- Single-tenant local app (no auth/permissions).
- Local worker poller only.
- No cloud storage or deployment tooling in-scope.

## Projects & Folders (Phase 5A)
- Use Projects to group related studio workstreams.
- Use Folders inside a project for optional sub-grouping.
- New jobs can be submitted as Unassigned, Project-only, or Project+Folder.
- Recent Jobs respects selected Project/Folder filters.
- Existing legacy jobs remain valid as Unassigned.

### Migration
Run:
```bash
npm run prisma:generate
# then apply the new migration in your normal Prisma workflow
```

## Edit Mode
- Added server-side edit job foundation via `POST /api/tasks/[taskId]/edit`.
- Edit jobs are linked to source lineage (`mode=edit`, `sourceJobId`, `sourceTaskId`, `editInstruction`).
- Demo/Mock provider supports edit-mode processing end-to-end.
- OpenAI edit mode prefers the OpenAI **Responses API** image-generation tool adapter when available, and falls back to **Images Edit**.
- Source image is loaded server-side from completed task output; source files are never exposed to client DTOs.
- Completed image cards now expose an Edit action.
- Edit drawer supports source preview, instruction, quick chips, and submit to `/api/tasks/[taskId]/edit`.
- Source image is never overwritten; edit always creates a new job.

### Demo script
1. Generate an image.
2. Click **Edit** on a completed task.
3. Choose **OpenAI** (live key required) or **Demo Mode**.
4. Enter edit instruction.
5. Submit edit.
6. Review output in gallery and optionally download ZIP.

### Live smoke-test checklist
1. Generate a Demo/Mock image.
2. Edit the Demo/Mock image and confirm a new output is created.
3. Generate an OpenAI image (with key/credits configured).
4. Edit that OpenAI image.
5. Confirm both original and edited outputs appear in dashboard/gallery.
6. Download ZIP and confirm edited output is included.
7. Confirm source image file remains unchanged.
8. Use gallery compare cues (source thumbnail + edit instruction) to review before/after.
9. Use Continue editing on an edited card to chain another edit job.
10. Use Download Approved ZIP to export only approved results.

### Known limitations
- No mask/canvas controls yet.
- No multi-source reference editing.
- No conversational multi-turn edit workflow.
- Tests use mocked SDK clients only; no live OpenAI calls are made.

## Verification note for Next.js route types
- In this Next 15.2 setup, `npm run typecheck` expects `.next/types` files.
- Run `npm run build` once before standalone `npm run typecheck` in a clean workspace.
- `next typegen` is not available as a stable CLI command in this project setup, so use:
  - `npm run verify`
  - or `npm run prisma:generate && npm test && npm run lint && npm run build && npm run typecheck`

## Migration / deployment notes
- Local dev migration flow uses `prisma migrate dev` (provided via `npm run prisma:migrate`).
- Server/staging/production should use `prisma migrate deploy`.
- Prisma migrations are committed in `prisma/migrations`.
- Run the worker alongside the web server in all environments.
- If concurrency grows beyond light internal usage, SQLite may become a bottleneck and PostgreSQL should be evaluated later.

### Optional PM2 process management
```bash
npm run build
npm run migrate:deploy
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs
pm2 restart all
pm2 restart foxhound-web foxhound-worker
pm2 stop foxhound-web foxhound-worker
```

## Operations runbook
- For installation, update/restart flow, backup/restore, and incident response, use:
  - `docs/local-server-runbook.md`
  - `docs/pilot-checklist.md`
  - `docs/operator-quick-commands.md`
  - `docs/incident-handoff-template.md`
  - `docs/systemd-examples.md` (optional Linux service examples)

## Demo readiness checklist
- `npm run verify` passes.
- App starts (`npm run dev` or `npm run start` after build).
- Worker starts (`npm run worker`).
- Demo Mode generate works.
- Demo Mode edit works.
- ZIP download works (including approved-only ZIP with approved images).
- OpenAI generate/edit works when key and credits are available.
