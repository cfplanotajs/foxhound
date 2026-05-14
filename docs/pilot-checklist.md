# Foxhound Pilot Readiness Checklist

Use this checklist for first local-cloud pilot rollout and designer-PC validation.

## 1) Preflight
- [ ] Machine name / IP:
- [ ] Node version (`node -v`):
- [ ] npm version (`npm -v`):
- [ ] Repo path:
- [ ] Storage path (`FOXHOUND_STORAGE_DIR` or default `generated`):
- [ ] Database path (`DATABASE_URL`):
- [ ] OpenAI key present? yes / no
- [ ] Testers (names):

## 2) Install/update
Run from repo root:

```bash
npm ci
npm run prisma:generate
npm run migrate:deploy
npm run presets:seed
npm run build
```

## 3) Start services

```bash
pm2 start ecosystem.config.cjs
pm2 status
npm run health:check
npm run smoke:check
```

If not using PM2, run `npm run start` and `npm run worker` in separate terminals.

## 4) Network access
- [ ] Open app locally on server machine.
- [ ] Open app from a second PC on LAN.
- [ ] Confirm designer can access the shared URL.
- [ ] Confirm no browser/network blocks prevent access.

## 5) Demo Mode test
- [ ] Generate one image.
- [ ] Edit that image.
- [ ] Mark result Approved.
- [ ] Download Approved ZIP.

## 6) OpenAI test
- [ ] Generate one image in OpenAI mode.
- [ ] Edit one image in OpenAI mode.
- [ ] Confirm usage appears in OpenAI dashboard.
- [ ] If key/credits missing, confirm error messages are clear and safe.

## 7) Backup test

```bash
npm run backup
```

- [ ] Confirm backup folder exists under `backups/`.
- [ ] Confirm DB backup exists.
- [ ] Confirm generated-assets backup exists (if directory exists).
- [ ] Confirm `.env` is **not** included.

## 8) Restore test (optional but recommended)
- [ ] Stop web + worker.
- [ ] Restore DB + generated assets from backup copy.
- [ ] Start services again.

```bash
npm run restore:check
npm run smoke:check
```

- [ ] Open UI and confirm latest jobs/images are visible.

## 9) Sign-off
- Tester name:
- Date/time:
- Issues found:
- Blockers:
- Go / No-Go decision:
