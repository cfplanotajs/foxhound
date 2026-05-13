# Foxhound Local Server Operations Runbook

## 1) Overview
- Foxhound runs as two processes:
  1. Next.js web server (`npm run start`)
  2. Worker process (`npm run worker`)
- **Both processes must be running** for queued jobs to process.
- Generated images are stored on disk (default `./generated`, or `FOXHOUND_STORAGE_DIR` if set).
- SQLite stores jobs, tasks, presets, projects/folders, and metadata.

## 2) Recommended server directory layout
Example (Linux/macOS):

```txt
/opt/foxhound/
  app/                      # git checkout (repo root)
  app/.env                  # runtime env file (server only)
  app/prisma/dev.db         # SQLite file when DATABASE_URL=file:./prisma/dev.db
  app/generated/            # default output root if FOXHOUND_STORAGE_DIR is empty
  data/generated/           # optional external output root if FOXHOUND_STORAGE_DIR points here
  backups/                  # timestamped DB + asset backups
  logs/                     # optional app/worker logs (if using shell redirect/system service)
```

Windows example:

```txt
C:\foxhound\
  app\
  backups\
  logs\
```

## 3) First-time setup
From repo root:

```bash
npm ci
cp .env.example .env
```

Configure `.env`:
- `DATABASE_URL` (required)
- `FOXHOUND_STORAGE_DIR` (recommended for persistent server storage)
- `OPENAI_API_KEY` (optional; server-side only)
- Optional tuning: `OPENAI_IMAGE_MODEL`, `OPENAI_EDIT_ADAPTER`, worker envs

Then run:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run presets:seed
npm run verify
```

## 4) Server update flow
When deploying a new app version:

```bash
git pull
npm ci
npm run prisma:generate
npm run migrate:deploy
npm run build
```

Then restart both processes:
- web server (`npm run start`)
- worker (`npm run worker`)

## 5) Runtime commands
Production-ish local server:

```bash
npm run start
npm run worker
```

Verification:

```bash
npm run verify
```

Live demo mode:

```bash
npm run dev
npm run worker
```

## 6) Backup and restore

### What to back up
Back up these together for a full restore:
1. SQLite database file (`prisma/dev.db` or path from `DATABASE_URL`)
2. Generated image directory (default `./generated` or `FOXHOUND_STORAGE_DIR`)
3. `.env`
4. Optional: `config/presets.json` (if customized locally)

### Safe SQLite backup guidance
Prefer SQLite-native backup approaches instead of copying the DB during active writes.

Examples (if `sqlite3` is available):

```bash
# online backup API
sqlite3 prisma/dev.db ".backup './backups/dev-$(date +%F-%H%M).db'"

# alternative
sqlite3 prisma/dev.db "VACUUM INTO './backups/dev-vacuum-$(date +%F-%H%M).db'"
```

Also back up generated assets:

```bash
mkdir -p backups
cp -R generated "./backups/generated-$(date +%F-%H%M)"
cp .env "./backups/.env-$(date +%F-%H%M)"
```

Windows (PowerShell) example:

```powershell
New-Item -ItemType Directory -Force backups | Out-Null
Copy-Item .\prisma\dev.db .\backups\dev.db
Copy-Item .\generated .\backups\generated -Recurse -Force
Copy-Item .\.env .\backups\.env
```

### Restore procedure
1. Stop web server and worker.
2. Restore database file.
3. Restore generated image directory.
4. Restore `.env` if needed.
5. Start web server and worker.
6. Smoke test:
   - open dashboard
   - load recent jobs
   - open a completed image
   - run one Demo Mode generation
   - download ZIP

## 7) Incident checklist

### App does not start
- Run `npm ci`.
- Run `npm run build` and check errors.
- Confirm `.env` exists and `DATABASE_URL` is valid.

### Worker not processing jobs
- Confirm worker process is running (`npm run worker`).
- Check worker env tuning (`WORKER_POLL_INTERVAL_MS`, etc.).
- Confirm jobs are queued and not blocked by DB errors.

### Images missing from gallery
- Check task status is `completed`.
- Confirm output file exists under storage directory.
- If using `FOXHOUND_STORAGE_DIR`, verify path and permissions.

### ZIP download fails
- Ensure completed images exist for selected job.
- For approved-only ZIP, ensure at least one task is approved.
- Verify files still exist on disk.

### OpenAI key missing
- Set `OPENAI_API_KEY` in `.env`.
- Never use `NEXT_PUBLIC_OPENAI_API_KEY`.

### OpenAI billing/credits issue
- Use Demo Mode to continue internal work.
- Check OpenAI account billing/credit status.

### Prisma generate/migrate errors
- Run `npm run prisma:generate`.
- For server updates, run `npm run migrate:deploy`.
- Ensure migrations exist in `prisma/migrations`.

### Database locked
- Ensure only expected processes access SQLite.
- Avoid long-running external DB tools holding locks.
- Retry after stopping duplicate worker/server instances.

### Storage folder permissions
- Confirm app user can create/read/write under storage dir.
- On Linux/macOS, check ownership/permissions of `generated` or `FOXHOUND_STORAGE_DIR`.

### OPENAI_EDIT_ADAPTER issues
- `responses` is preferred when available.
- `images_edit` forces Images Edit adapter path.
- If responses path fails for SDK/environment reasons, set `OPENAI_EDIT_ADAPTER=images_edit` and retry.

## 8) Designer quick start
1. Open the Foxhound URL.
2. Choose Demo Mode or OpenAI mode.
3. Pick a project/folder (or leave unassigned).
4. Pick a preset.
5. Generate variations.
6. Edit the best result.
7. Mark results as approved/favorite/rejected.
8. Download approved ZIP.
