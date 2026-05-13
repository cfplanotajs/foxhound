# Foxhound systemd examples (optional)

These are **examples only**. Adapt paths, user, and env file location to your server.

## foxhound-web.service

```ini
[Unit]
Description=Foxhound Web Server
After=network.target

[Service]
Type=simple
User=<YOUR_SERVER_USER>
WorkingDirectory=<PATH_TO_FOXHOUND_REPO>
EnvironmentFile=<PATH_TO_FOXHOUND_REPO>/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## foxhound-worker.service

```ini
[Unit]
Description=Foxhound Worker
After=network.target

[Service]
Type=simple
User=<YOUR_SERVER_USER>
WorkingDirectory=<PATH_TO_FOXHOUND_REPO>
EnvironmentFile=<PATH_TO_FOXHOUND_REPO>/.env
ExecStart=/usr/bin/npm run worker
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Notes
- Keep both services running (web + worker).
- Run migrations and build before restarting services:
  - `npm run prisma:generate`
  - `npm run migrate:deploy`
  - `npm run build`
- Then restart services:
  - `sudo systemctl restart foxhound-web`
  - `sudo systemctl restart foxhound-worker`
