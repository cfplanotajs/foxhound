# Foxhound Operator Quick Commands

Copy/paste guide for common local-server operations.

## 1) Start / stop / restart

### Dev mode
```bash
npm run dev
npm run worker
# stop: Ctrl+C in each terminal
```

### PM2 mode
```bash
pm2 start ecosystem.config.cjs
pm2 stop all
pm2 restart all
```

### systemd mode (example service names)
```bash
sudo systemctl start foxhound-web foxhound-worker
sudo systemctl stop foxhound-web foxhound-worker
sudo systemctl restart foxhound-web foxhound-worker
```

## 2) Status checks
```bash
npm run health:check
npm run smoke:check
pm2 status
sudo systemctl status foxhound-web
sudo systemctl status foxhound-worker
```

## 3) Logs

### PM2
```bash
pm2 logs
pm2 logs foxhound-web --lines 200
pm2 logs foxhound-worker --lines 200
```

### systemd
```bash
journalctl -u foxhound-web -f
journalctl -u foxhound-worker -f
journalctl -u foxhound-web --since "1 hour ago"
journalctl -u foxhound-worker --since "1 hour ago"
```

## 4) Update deployment
```bash
git pull
npm ci
npm run prisma:generate
npm run migrate:deploy
npm run build
pm2 restart all
# OR
sudo systemctl restart foxhound-web foxhound-worker
```

## 5) Backup / restore verification
```bash
npm run backup
npm run restore:check
npm run smoke:check
npm run health:check
```

## 6) Common incidents

### Worker not processing
```bash
pm2 status
pm2 logs foxhound-worker --lines 200
npm run health:check
```

### OpenAI key missing
```bash
# confirm OPENAI_API_KEY exists in server .env
npm run smoke:check
```

### Billing/credits issue
```bash
# switch to Demo Mode for continuity
npm run health:check
```

### Database locked
```bash
pm2 logs foxhound-worker --lines 200
pm2 restart all
```

### Missing images
```bash
npm run restore:check
npm run health:check
```

### Approved ZIP empty
```bash
# confirm images were marked Approved in UI
npm run smoke:check
```

### Prisma generate/migrate issue
```bash
npm run prisma:generate
npm run migrate:deploy
pm2 restart all
```

## Placeholders and notes
- Replace service names if your server uses different names.
- Do not paste secrets in terminals captured by shared logs.
- If not using PM2/systemd, run `npm run start` and `npm run worker` directly.
