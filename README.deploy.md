# Portal Deployment (UI + API)

Quick reference for deploying the portal to a remote NAS when you cannot use a direct network mount.

## UI (fast path)
1. Build locally
   - npm ci
   - npm run build
2. Copy built files to NAS
   - scp -r dist/ user@nas:/path/to/portal/dist/
   or
   - rsync -av --delete ./dist/ user@nas:/path/to/portal/dist/
3. Set permissions on NAS
   - ssh user@nas "chmod -R a+rX /path/to/portal/dist"
4. Restart web container on NAS
   - ssh user@nas "cd /path/to/portal && docker compose restart web"
5. Hard-refresh browser (Cmd/Ctrl+Shift+R)

## API (build on NAS recommended)
1. Copy repository or pull on NAS
   - git clone ... or scp repo to NAS
2. Build & run
   - ssh user@nas "cd /path/to/portal && docker compose build api && docker compose up -d --no-deps --build api"

## Run the Portal Next server on NAS (Docker, port 8020)
The portal uses the Next.js App Router and should run as a Node server (not a static export). Use the provided Dockerfile and docker-compose.portal.yml.

1. Copy/pull repo to NAS
   - git clone ... or rsync / scp
2. Build and run on NAS
   - ssh user@nas "cd /path/to/portal && docker build -f apps/portal/Dockerfile -t retire-portal:latest . && docker compose -f docker-compose.portal.yml up -d --no-deps --build portal"
3. Verify
   - Open http://<NAS_IP>:8020 and check logs: docker compose -f docker-compose.portal.yml logs -f portal

Note: The dockerized Next server listens on port 8020 inside the container and the compose file maps host 8020 -> container 8020.
## Scripts
Two helper scripts are provided in `scripts/`:
- `deploy-ui.sh` — safe rsync deploy for the UI and remote restart of `web`
- `deploy-api.sh` — builds or deploys the API on the NAS

Both scripts are interactive by default and accept `--yes` for non-interactive operation.

## Notes
- Prefer `rsync` to avoid partially updated sites.
- Ensure `index.html` exists and `dist/` files are readable by nginx (use `chmod -R a+rX`).
- If the NAS is x86, you can build images on the NAS; if arm64 use `docker buildx` or build on NAS.
