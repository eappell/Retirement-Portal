# VPS & Server Deployment Guide

This document collects deployment instructions for the AI proxy and the apps (Retire-Portal, Retirement-Planner-AI, Retire-Abroad-AI). It covers options, a recommended workflow, and example configs for running everything on a VPS (Namecheap or other), plus notes for running the proxy as Vercel Serverless functions.

Use this guide later as a checklist when you're ready to provision infrastructure.

---

## Overview / Goals

- Run the centralized AI proxy (the `server/index.js` Node app) in a production environment.
- Host frontends (static builds) and apps on the same VPS or another service.
- Use Nginx as the TLS terminator and reverse proxy per-domain/subdomain.
- Keep API keys and secrets out of source control and in environment variables or a secrets manager.
- Provide resilient, observable deployment (service manager, logs, TLS auto-renewal).

---

## Why keep the proxy server

- Protects API keys (Anthropic, Google) from exposure to browsers.
- Avoids CORS and provider compatibility issues (Messages vs Complete APIs).
- Centralizes analytics reporting to your `Retire-Portal` cloud endpoint.
- Allows normalization, caching, rate-limiting, and sanitization of AI responses.

If you need lower operational burden, deploy the proxy as serverless functions (Vercel, Render, Cloud Run) — see the "Vercel notes" section.

---

## High-level deployment options

- Option A — Managed / Serverless (recommended for ease):
  - Deploy proxy as Vercel Serverless API routes (`/api/insights`, `/api/report`).
  - Pros: automatic TLS, scaling, no server maintenance.
  - Cons: function timeouts may apply; careful with long-running streaming.

- Option B — VPS (full control):
  - Provision a VPS (Ubuntu 22.04+ recommended) and run the proxy and apps:
    - Approach 1: Docker + docker-compose for each app and proxy.
    - Approach 2: Run Node apps directly with PM2 or `systemd` unit files.
  - Use Nginx on the host to reverse-proxy to local services or container ports.
  - Pros: full control, easier access to logs/inspection, flexible.
  - Cons: you must manage OS/security/updates.

---

## Recommended stack for VPS

- Ubuntu 22.04 LTS
- Docker + docker-compose (recommended)
- Nginx as host reverse-proxy + certbot for Let's Encrypt
- Git (or CI to push docker images)
- `ufw` firewall and SSH key-based auth

---

## Example: Docker-based deployment (recommended)

1. Build a Docker image for the proxy (in `Retirement-Planner-AI` repo).
2. Run all services via `docker-compose` on the VPS.
3. Use host Nginx (outside containers) to reverse-proxy public domains to container ports bound on `127.0.0.1`.

Example `Dockerfile` for the proxy:

```dockerfile
# Dockerfile (server/proxy)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server/index.js"]
```

Example `docker-compose.yml` (root of deployment repo):

```yaml
version: '3.8'
services:
  ai-proxy:
    build: ./retirement-planner-ai
    restart: unless-stopped
    env_file: ./retirement-planner-ai/.env.production
    ports:
      - "127.0.0.1:4000:3000"   # host 127.0.0.1:4000 -> container 3000

  retirement-frontend:
    image: nginx:alpine
    volumes:
      - ./retirement-planner-ai/frontend-dist:/usr/share/nginx/html:ro
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"

  retire-abroad-frontend:
    image: nginx:alpine
    volumes:
      - ./retire-abroad-ai/dist:/usr/share/nginx/html:ro
    restart: unless-stopped
    ports:
      - "127.0.0.1:8081:80"
```

Notes:
- Keep ports bound to `127.0.0.1` so only the host Nginx (local) can reach them.
- Use an `.env.production` file with `CLAUDE_API_KEY`, `AI_PROVIDER`, `PORTAL_TRACK_URL`, etc.

---

## Example: systemd + Node (non-Docker)

If you prefer no Docker, install Node on the VPS and manage the proxy with `systemd`.

Example `systemd` unit file for the proxy:

```ini
# /etc/systemd/system/ai-proxy.service
[Unit]
Description=AI Proxy
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy/retirement-proxy
EnvironmentFile=/home/deploy/retirement-proxy/.env.production
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=5
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
```

Commands to enable (on VPS):

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ai-proxy
sudo journalctl -u ai-proxy -f
```

If you prefer PM2 (process manager):

```bash
npm ci --production
npm install -g pm2
pm2 start server/index.js --name ai-proxy --env production
pm2 save
pm2 startup systemd
```

---

## Nginx host configuration examples

Create separate server blocks for each domain/subdomain.

Example `proxy` host (reverse-proxy to the proxy service):

```nginx
# /etc/nginx/sites-available/proxy.yourdomain.com
server {
  listen 80;
  server_name proxy.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Example `frontend` host (serve static build):

```nginx
server {
  listen 80;
  server_name planner.yourdomain.com;

  root /var/www/retirement-planner/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

Then enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/proxy.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Add TLS (Let's Encrypt):

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d proxy.yourdomain.com -d planner.yourdomain.com
```

---

## Environment variables (recommended names)

- `AI_PROVIDER` (claude|google) — fallback global provider
- `CLAUDE_API_KEY`
- `CLAUDE_MODEL` (e.g., `claude-opus-4-5-20251101`)
- `CLAUDE_API_VERSION` (if required)
- `API_KEY` (used by Google GenAI client if you use it)
- `GOOGLE_MODEL` (defaults to `gemini-2.0-flash`)
- `PORTAL_TRACK_URL` (the Retire-Portal cloud function or endpoint for tracking)
- `PORT` (listen port, typically `3000` in container; mapped to host 4000)
- `CORS_ORIGINS` (optional, comma-separated list)

Store these in a file like `.env.production` on the VPS and ensure ownership & permissions limit access.

---

## CI / Deploy workflow suggestions

- Build Docker images in CI (GitHub Actions) and push to a container registry (Docker Hub, GitHub Packages, or private registry).
- On the VPS, pull images and run `docker-compose pull && docker-compose up -d`.
- Alternatively, use an SSH deploy step to `git pull` & restart services (be careful with secrets in repo).

Example GitHub Actions for Docker build/push (outline):
- Build image for `ai-proxy` and push tag `yourrepo/ai-proxy:latest`.
- Trigger VPS to `docker-compose pull && docker-compose up -d` (via SSH action).

---

## Vercel Serverless notes

- If you prefer serverless for the proxy, convert `server/index.js` into API routes:
  - `api/insights.js` → handle POST, call provider, set `X-AI-Provider` header
  - `api/report.js` → forward tracking events to `PORTAL_TRACK_URL`
- Deploy to Vercel and set env vars in the Vercel dashboard (Preview/Production).
- Advantages: no VPS maintenance, automatic TLS, scaling. Disadvantages: function timeouts and cold starts on free tiers.

---

## Operational tips & monitoring

- Firewall: enable `ufw` and allow `OpenSSH`, `http`, `https` only.
- SSH: use key-based auth, consider disabling root login.
- Logging: use `journalctl` for systemd, `docker logs`/logging driver for Docker, and rotate logs.
- Health checks: create a simple `/health` endpoint in the proxy that returns 200 and add remote monitoring.
- Backups: explicit backup for any DB or critical files (not needed for static assets alone).
- Auto-renew certs: `certbot` sets up renewals automatically; test with `certbot renew --dry-run`.

---

## Troubleshooting checklist

- `X-AI-Provider` not matching expected value: ensure the environment variable `AI_PROVIDER` or your request-level `aiProvider` is correctly set. Restart the service after env changes (systemd/pm2/docker) unless using per-request selection.
- 403/401 with Anthropic/Google: confirm keys are set and valid in the environment used by the running process.
- CORS errors in browser: verify host Nginx adds correct headers or call the proxy from same origin.
- Timeouts: serverless functions may time out — move to VPS Docker if you need longer requests.

---

## Example quick checklist for first deploy (VPS + Docker)

1. Provision VPS; set DNS A records for `proxy.yourdomain.com`, `planner.yourdomain.com`, etc.
2. SSH in; install Docker & docker-compose.
3. Clone repo(s) into `/home/deploy/`.
4. Create `.env.production` with required keys (on host only).
5. Place `docker-compose.yml` at deploy root and start `docker-compose up -d`.
6. Install Nginx on host and configure server blocks to proxy hostnames to container ports.
7. Run `certbot --nginx` to obtain certs.
8. Test `curl -i https://proxy.yourdomain.com/api/insights` (POST) and check `X-AI-Provider` header.

---

## Files you may want me to generate for you

If you want, I can scaffold these files in your repo:
- `Dockerfile` for the proxy
- `docker-compose.yml` for all services
- `systemd` unit file for `ai-proxy`
- `nginx` server block examples
- A short `deploy.md` with commands for the VPS

Tell me which set you prefer (Docker or systemd/PM2) and I will create the files under the `Retire-Portal` repo (or `Retirement-Planner-AI`) for you.

---

End of guide.
