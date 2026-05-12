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

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Configure `.env`:
   - `DATABASE_URL` (required)
   - `OPENAI_API_KEY` (optional for Demo Mode, required for OpenAI mode)
4. Initialize database and presets:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run presets:seed
   ```

## Run locally
Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
npm run worker
```

## Demo script (stakeholder-ready)
1. Open dashboard and choose **Demo Mode (Mock)**.
2. Pick an active preset.
3. Choose aspect ratio, variation count, and quality.
4. Click a sample prompt chip (or type one).
5. Submit job and wait for worker to process.
6. Review outputs in gallery using **Favorite / Approved / Rejected**.
7. Filter gallery with review chips (All/Favorites/Approved/Rejected).
8. Download ZIP from current job summary.
9. In Recent Jobs:
   - **Open** to inspect a job.
   - **Duplicate** to copy settings back to form (does not submit).
   - **Re-run** to immediately create a new job.

## Demo Mode vs OpenAI mode
- **Demo Mode (mock)**
  - no external API calls
  - generates deterministic placeholder images
  - validates end-to-end workflow without usage credits
- **OpenAI mode**
  - requires server-side `OPENAI_API_KEY`
  - never use `NEXT_PUBLIC_OPENAI_API_KEY`
  - model/size/quality are validated server-side

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

## Edit Mode (Stage 1 server core)
- Added server-side edit job foundation via `POST /api/tasks/[taskId]/edit`.
- Edit jobs are linked to source lineage (`mode=edit`, `sourceJobId`, `sourceTaskId`, `editInstruction`).
- Demo/Mock provider supports edit-mode processing end-to-end.
- OpenAI edit mode is intentionally not implemented in Stage 1 and returns a friendly message.
- Stage 1 supports edit-from-existing-completed-output only.
- No edit drawer UI yet (planned for Stage 2).
