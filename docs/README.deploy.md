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
The portal uses the Next.js App Router and runs as a Node server (not a static export). Use the provided Dockerfile and `docker-compose.portal.yml`.

1. Copy/pull repo to NAS
   - Recommended: copy the **repo root** so the compose file and scripts are available
     - rsync -av --delete ./ user@NAS:/home/deploy/retire-portal/

2. Build and run on NAS (Docker)
   - ssh user@NAS
   - cd /home/deploy/retire-portal
   - docker build -f apps/portal/Dockerfile -t retire-portal:latest .
   - docker compose -f docker-compose.portal.yml up -d --no-deps --build portal

3. Verify the service is running and healthy
   - docker compose -f docker-compose.portal.yml logs -f portal
   - From the NAS (or locally via SSH port-forward) test: curl -I http://localhost:8020/
   - The deploy script (`scripts/deploy-portal.sh`) performs an automatic healthcheck that polls `http://localhost:8020/` and prints logs on failure.

4. Configure nginx to reverse-proxy a subdomain to the portal (example)
   - Create a site config on the host (e.g. `/etc/nginx/conf.d/portal.conf`) with the following contents, replacing `portal.example.com` with your subdomain:

```nginx
server {
    listen 80;
    server_name portal.example.com;

    location / {
        proxy_pass http://127.0.0.1:8020;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

   - Test and reload nginx:
     - sudo nginx -t && sudo systemctl reload nginx
     - If nginx runs in Docker, exec into the proxy container and reload: docker exec <nginx-container> nginx -s reload or restart the container.

5. (Optional) Enable HTTPS
   - Use Certbot/Let's Encrypt or your existing certificate process to provision TLS for `portal.example.com` and update the nginx config accordingly.

Notes and troubleshooting
- The portal server listens on localhost:8020 inside the NAS; the nginx reverse proxy forwards requests from your public subdomain to that local port.
- If healthcheck fails, check `docker compose -f docker-compose.portal.yml logs --tail 200 portal` and ensure the Node version and build stage match (we use Node 20 in the Dockerfile).
- Do not copy `node_modules` from your dev machine — either let Docker build install deps or run `npm ci` on the NAS before starting the server.

If you'd like, I can add an example `portal.conf` file template to this repo and a one-line command that deploys it to `/etc/nginx/conf.d/` on the NAS (requires sudo on the host).
## Scripts
Two helper scripts are provided in `scripts/`:
- `deploy-ui.sh` — safe rsync deploy for the UI and remote restart of `web`
- `deploy-api.sh` — builds or deploys the API on the NAS

Both scripts are interactive by default and accept `--yes` for non-interactive operation.

## Notes
- Prefer `rsync` to avoid partially updated sites.
- Ensure `index.html` exists and `dist/` files are readable by nginx (use `chmod -R a+rX`).
- If the NAS is x86, you can build images on the NAS; if arm64 use `docker buildx` or build on NAS.
