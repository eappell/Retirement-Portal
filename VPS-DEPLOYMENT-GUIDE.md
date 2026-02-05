# VPS Deployment Guide - Complete Setup
**Updated**: February 2026  
**VPS**: 203.161.56.128

Complete deployment instructions for all Retirement Planner applications with common library integration.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Deployment Order](#deployment-order)
4. [Component Deployments](#component-deployments)
5. [Updates & Maintenance](#updates--maintenance)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### VPS Requirements
- Ubuntu 22.04 or later
- Docker 20.10+
- Docker Compose 2.0+
- Git
- Nginx Proxy Manager (or nginx)
- Minimum 4GB RAM, 2 CPU cores
- 40GB disk space

### Network Setup
- Nginx Proxy Manager Docker network: `nginx-proxy-manager_default`
- Ports: 80, 443 (for Nginx), 3001 (PocketBase Proxy), 5002-5007 (Apps)
- Domain names configured with SSL certificates

### Access Requirements
```bash
ssh eappell@203.161.56.128
```

---

## Architecture Overview

```
Internet
    ↓
Nginx Proxy Manager (SSL Termination + Routing)
    ↓
┌─────────────────────────────────────────────────────────────┐
│  Docker Network: nginx-proxy-manager_default                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  PocketBase Proxy (Port 3001)                               │
│    ↓ Validates Firebase tokens                              │
│    ↓ Forwards to PocketBase                                 │
│                                                               │
│  Portal (Port 3000)                                          │
│    ↓ Main application hub                                   │
│    ↓ Embeds all tools via iframe                            │
│    ↓ Handles authentication                                 │
│                                                               │
│  Individual Apps (Ports 5002-5007)                          │
│    ├─ Tax-Impact-Analyzer (5002)                            │
│    ├─ State-Relocate (5003)                                 │
│    ├─ Social-Security-Optimizer (5004)                      │
│    ├─ Retire-Abroad-AI (5005)                               │
│    ├─ Longevity-Drawdown (5006)                             │
│    └─ Retirement-Planner-AI (5007)                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘

All apps depend on:
  - Retire-Common-Lib (LoadingOverlay, ToolDataManager)
  - PocketBase Proxy (data persistence)
```

---

## Deployment Order

**Critical**: Deploy in this exact order to satisfy dependencies:

1. **PocketBase Proxy** - Required for data persistence
2. **Retire-Common-Lib** - Required by all apps
3. **Portal** - Main application hub
4. **Individual Apps** - Can deploy in parallel after 1-3 complete

---

## Component Deployments

### 1. PocketBase Proxy

The proxy validates Firebase auth tokens and forwards requests to PocketBase.

#### 1.1 Clone and Setup
```bash
ssh eappell@203.161.56.128

# Create project directory
mkdir -p ~/retirement-planner
cd ~/retirement-planner

# Clone repository
git clone https://github.com/eappell/PocketBase-Proxy.git
cd PocketBase-Proxy
```

#### 1.2 Create Environment File
```bash
cat > .env << 'EOF'
PORT=3001
NODE_ENV=production
POCKETBASE_URL=http://localhost:8090
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
ALLOWED_ORIGINS=https://portal.retirewise.com,https://tax-analyzer.retirewise.com,https://state-relocate.retirewise.com,https://ss-optimizer.retirewise.com,https://retire-abroad.retirewise.com,https://longevity.retirewise.com,https://retirement-planner.retirewise.com
EOF
```

**Important**: Replace the Firebase credentials with your actual values from Firebase Console → Project Settings → Service Accounts → Generate New Private Key.

#### 1.3 Build and Deploy
```bash
# Start the proxy
docker-compose up -d --build

# Verify it's running
docker logs pocketbase-proxy -f

# Test health endpoint
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-02-05T..."}
```

#### 1.4 Configure in Nginx Proxy Manager
- **Domain**: `api.retirewise.com` (or your chosen subdomain)
- **Scheme**: `http`
- **Forward Hostname/IP**: `pocketbase-proxy`
- **Forward Port**: `3001`
- **Cache Assets**: No
- **Block Common Exploits**: Yes
- **Websockets Support**: Yes
- **SSL**: Force SSL, HTTP/2 Support

**Custom Locations** (Optional - for specific CORS if needed):
```nginx
location / {
    add_header Access-Control-Allow-Origin "$http_origin" always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
}
```

---

### 2. Retire-Common-Lib (Shared Library)

All apps depend on this library for LoadingOverlay and ToolDataManager.

#### 2.1 Clone and Build
```bash
cd ~/retirement-planner
git clone https://github.com/eappell/Retire-Common-Lib.git
cd Retire-Common-Lib

# Install dependencies
npm install

# Build the library
npm run build

# Verify dist/ folder was created
ls -la dist/
```

Expected output: `index.js`, `index.d.ts`, `ToolDataManager.js`, `ToolDataManager.d.ts`, etc.

#### 2.2 Make Available to Apps
The library will be linked during each app's build process via the parent directory structure.

---

### 3. Portal Deployment

The portal is the main application hub that embeds all tools.

#### 3.1 Clone Repository
```bash
cd ~/retirement-planner
git clone https://github.com/eappell/Retire-Portal.git
cd Retire-Portal
```

#### 3.2 Create Production Environment
```bash
cat > apps/portal/.env.production << 'EOF'
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Application URLs
NEXT_PUBLIC_PORTAL_URL=https://portal.retirewise.com
NEXT_PUBLIC_API_URL=https://api.retirewise.com

# Embedded App URLs
NEXT_PUBLIC_TAX_IMPACT_URL=https://tax-analyzer.retirewise.com
NEXT_PUBLIC_STATE_RELOCATE_URL=https://state-relocate.retirewise.com
NEXT_PUBLIC_SOCIAL_SECURITY_URL=https://ss-optimizer.retirewise.com
NEXT_PUBLIC_RETIRE_ABROAD_URL=https://retire-abroad.retirewise.com
NEXT_PUBLIC_LONGEVITY_URL=https://longevity.retirewise.com
NEXT_PUBLIC_RETIREMENT_PLANNER_URL=https://retirement-planner.retirewise.com

# Feature Flags
NEXT_PUBLIC_ENABLE_PREMIUM=true
NEXT_PUBLIC_ENABLE_AI_INSIGHTS=true
EOF
```

#### 3.3 Build and Deploy
```bash
# Build and start
docker-compose -f docker-compose.portal.yml up -d --build

# Monitor logs
docker logs retire-portal -f
```

Look for: `✓ Ready on http://0.0.0.0:3000`

#### 3.4 Configure in Nginx Proxy Manager
- **Domain**: `portal.retirewise.com`
- **Scheme**: `http`
- **Forward Hostname/IP**: `retain-portal`
- **Forward Port**: `3000`
- **Cache Assets**: Yes
- **Block Common Exploits**: Yes
- **Websockets Support**: No
- **SSL**: Force SSL, HTTP/2

---

### 4. Individual Apps

Each app follows the same deployment pattern with different ports.

#### App Configuration Matrix

| App Name | Container Port | External Port | Domain |
|----------|---------------|---------------|---------|
| Tax-Impact-Analyzer | 3000 | 5002 | tax-analyzer.retirewise.com |
| State-Relocate | 3000 | 5003 | state-relocate.retirewise.com |
| Social-Security-Optimizer | 3000 | 5004 | ss-optimizer.retirewise.com |
| Retire-Abroad-AI | 3000 | 5005 | retire-abroad.retirewise.com |
| Longevity-Drawdown | 3000 | 5006 | longevity.retirewise.com |
| Retirement-Planner-AI | 3000 | 5007 | retirement-planner.retirewise.com |

#### Generic App Deployment Procedure

Replace `[APP_NAME]`, `[REPO]`, `[PORT]`, and `[DOMAIN]` with values from the matrix above.

```bash
cd ~/retirement-planner

# Clone app repository
git clone https://github.com/eappell/[REPO].git
cd [REPO]

# Ensure common library is accessible (should already be cloned)
ls -la ../Retire-Common-Lib/dist
```

#### Per-App docker-compose.yml

Each app needs a slightly different `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: [APP_NAME]
    restart: unless-stopped
    ports:
      - "[PORT]:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_POCKETBASE_PROXY_URL=https://api.retirewise.com
    networks:
      - nginx-proxy-manager_default

networks:
  nginx-proxy-manager_default:
    external: true
```

#### Build and Deploy
```bash
# Update the docker-compose.yml with correct port
nano docker-compose.yml  # or use vim/vi

# Build and start
docker-compose up -d --build

# Monitor logs
docker logs [APP_NAME] -f
```

#### Configure in Nginx Proxy Manager
For each app, create a proxy host:
- **Domain**: `[DOMAIN]`
- **Scheme**: `http`
- **Forward Hostname/IP**: `[APP_NAME]` (container name)
- **Forward Port**: `3000`
- **Cache Assets**: Yes
- **Block Common Exploits**: Yes
- **Websockets Support**: No
- **SSL**: Force SSL, HTTP/2

**Custom Headers** (Advanced tab):
```nginx
# Allow iframe embedding from portal
add_header X-Frame-Options "ALLOW-FROM https://portal.retirewise.com";
add_header Content-Security-Policy "frame-ancestors 'self' https://portal.retirewise.com";
```

---

### 4.1 Tax-Impact-Analyzer

```bash
cd ~/retirement-planner
git clone https://github.com/eappell/Tax-Impact-Analyzer.git
cd Tax-Impact-Analyzer

# Verify common library link
ls -la ../Retire-Common-Lib/dist

# Edit docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  tax-analyzer:
    build: .
    container_name: tax-analyzer
    restart: unless-stopped
    ports:
      - "5002:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_POCKETBASE_PROXY_URL=https://api.retirewise.com
    networks:
      - nginx-proxy-manager_default

networks:
  nginx-proxy-manager_default:
    external: true
EOF

# Build and deploy
docker-compose up -d --build
docker logs tax-analyzer -f
```

---

### 4.2 State-Relocate

```bash
cd ~/retirement-planner
git clone https://github.com/eappell/State-Relocate.git
cd State-Relocate

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  state-relocate:
    build: .
    container_name: state-relocate
    restart: unless-stopped
    ports:
      - "5003:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_POCKETBASE_PROXY_URL=https://api.retirewise.com
    networks:
      - nginx-proxy-manager_default

networks:
  nginx-proxy-manager_default:
    external: true
EOF

docker-compose up -d --build
docker logs state-relocate -f
```

---

### 4.3 Social-Security-Optimizer

```bash
cd ~/retirement-planner
git clone https://github.com/eappell/Social-Security-Optimizer.git
cd Social-Security-Optimizer

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  ss-optimizer:
    build: .
    container_name: ss-optimizer
    restart: unless-stopped
    ports:
      - "5004:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_POCKETBASE_PROXY_URL=https://api.retirewise.com
    networks:
      - nginx-proxy-manager_default

networks:
  nginx-proxy-manager_default:
    external: true
EOF

docker-compose up -d --build
docker logs ss-optimizer -f
```

---

### 4.4 Retire-Abroad-AI

```bash
cd ~/retirement-planner
git clone https://github.com/eappell/Retire-Abroad-AI.git
cd Retire-Abroad-AI

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  retire-abroad:
    build: .
    container_name: retire-abroad
    restart: unless-stopped
    ports:
      - "5005:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_POCKETBASE_PROXY_URL=https://api.retirewise.com
    networks:
      - nginx-proxy-manager_default

networks:
  nginx-proxy-manager_default:
    external: true
EOF

docker-compose up -d --build
docker logs retire-abroad -f
```

---

### 4.5 Longevity and Drawdown Planner

```bash
cd ~/retirement-planner
git clone https://github.com/eappell/Longevity-Drawdown-Planner.git
cd "Longevity and Drawdown Planner"

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  longevity:
    build: .
    container_name: longevity
    restart: unless-stopped
    ports:
      - "5006:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_POCKETBASE_PROXY_URL=https://api.retirewise.com
    networks:
      - nginx-proxy-manager_default

networks:
  nginx-proxy-manager_default:
    external: true
EOF

docker-compose up -d --build
docker logs longevity -f
```

---

### 4.6 Retirement-Planner-AI

**Note**: This app uses Vite instead of Next.js, so the Dockerfile may differ.

```bash
cd ~/retirement-planner
git clone https://github.com/eappell/Retirement-Planner-AI.git
cd Retirement-Planner-AI

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  retirement-planner:
    build: .
    container_name: retirement-planner
    restart: unless-stopped
    ports:
      - "5007:3000"
    environment:
      - NODE_ENV=production
      - VITE_POCKETBASE_PROXY_URL=https://api.retirewise.com
    networks:
      - nginx-proxy-manager_default

networks:
  nginx-proxy-manager_default:
    external: true
EOF

docker-compose up -d --build
docker logs retirement-planner -f
```

---

## Updates & Maintenance

### Updating Common Library

When the common library is updated, **all apps** must be rebuilt:

```bash
ssh eappell@203.161.56.128

# Update common library
cd ~/retirement-planner/Retire-Common-Lib
git pull origin main
npm install
npm run build

# Rebuild all apps
cd ~/retirement-planner

for app in Tax-Impact-Analyzer State-Relocate Social-Security-Optimizer Retire-Abroad-AI "Longevity and Drawdown Planner" Retirement-Planner-AI; do
  echo "Rebuilding $app..."
  cd ~/retirement-planner/"$app"
  docker-compose down
  docker-compose up -d --build --force-recreate
  echo "✓ $app rebuilt"
done

# Also rebuild portal
cd ~/retirement-planner/Retire-Portal
docker-compose -f docker-compose.portal.yml down
docker-compose -f docker-compose.portal.yml up -d --build --force-recreate
```

### Updating Individual App

```bash
cd ~/retirement-planner/[APP_NAME]
git pull origin main
docker-compose down
docker-compose up -d --build
docker logs [container-name] -f
```

### Updating Portal

```bash
cd ~/retirement-planner/Retire-Portal
git pull origin main
docker-compose -f docker-compose.portal.yml down
docker-compose -f docker-compose.portal.yml up -d --build
docker logs retire-portal -f
```

### Updating PocketBase Proxy

```bash
cd ~/retirement-planner/PocketBase-Proxy
git pull origin main
docker-compose down
docker-compose up -d --build
docker logs pocketbase-proxy -f
```

### Bulk Update All Services

```bash
#!/bin/bash
cd ~/retirement-planner

# Update repos
for repo in Retire-Common-Lib PocketBase-Proxy Retire-Portal Tax-Impact-Analyzer State-Relocate Social-Security-Optimizer Retire-Abroad-AI "Longevity and Drawdown Planner" Retirement-Planner-AI; do
  echo "Updating $repo..."
  cd ~/retirement-planner/"$repo"
  git pull origin main
done

# Rebuild common library
cd ~/retirement-planner/Retire-Common-Lib
npm install
npm run build

# Rebuild proxy
cd ~/retirement-planner/PocketBase-Proxy
docker-compose down
docker-compose up -d --build

# Rebuild portal
cd ~/retirement-planner/Retire-Portal
docker-compose -f docker-compose.portal.yml down
docker-compose -f docker-compose.portal.yml up -d --build

# Rebuild apps
for app in Tax-Impact-Analyzer State-Relocate Social-Security-Optimizer Retire-Abroad-AI "Longevity and Drawdown Planner" Retirement-Planner-AI; do
  cd ~/retirement-planner/"$app"
  docker-compose down
  docker-compose up -d --build
done

echo "✓ All services updated!"
```

---

## Monitoring

### View All Running Containers
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected output:
```
NAMES                    STATUS              PORTS
pocketbase-proxy         Up 2 hours          0.0.0.0:3001->3001/tcp
retire-portal            Up 2 hours          0.0.0.0:3000->3000/tcp
tax-analyzer             Up 2 hours          0.0.0.0:5002->3000/tcp
state-relocate           Up 2 hours          0.0.0.0:5003->3000/tcp
ss-optimizer             Up 2 hours          0.0.0.0:5004->3000/tcp
retire-abroad            Up 2 hours          0.0.0.0:5005->3000/tcp
longevity                Up 2 hours          0.0.0.0:5006->3000/tcp
retirement-planner       Up 2 hours          0.0.0.0:5007->3000/tcp
```

### View Logs

```bash
# Real-time logs for specific container
docker logs [container-name] -f

# Last 100 lines
docker logs [container-name] --tail 100

# All containers
docker-compose logs -f

# With timestamps
docker logs [container-name] --timestamps
```

### Resource Usage
```bash
docker stats
```

### Health Checks

```bash
# Check proxy
curl https://api.retirewise.com/health

# Check each app (through nginx)
curl -I https://tax-analyzer.retirewise.com
curl -I https://state-relocate.retirewise.com
curl -I https://ss-optimizer.retirewise.com
curl -I https://retire-abroad.retirewise.com
curl -I https://longevity.retirewise.com
curl -I https://retirement-planner.retirewise.com
curl -I https://portal.retirewise.com
```

---

## Troubleshooting

### App Won't Start

**Check logs:**
```bash
docker logs [container-name] --tail 100
```

**Common issues:**
- Port already in use: `netstat -tulpn | grep [PORT]`
- Missing environment variables: Check `.env` files
- Build errors: Rebuild with `--no-cache`

**Solution:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Common Library Not Found During Build

**Error**: `Module not found: Can't resolve '@retirewise/integration'`

**Solution:**
```bash
# Verify common library is built
cd ~/retirement-planner/Retire-Common-Lib
npm run build
ls -la dist/

# Rebuild app
cd ~/retirement-planner/[APP_NAME]
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### CORS Errors

**Symptom**: Apps can't communicate with PocketBase Proxy

**Solution**: Verify Nginx Proxy Manager CORS headers and `ALLOWED_ORIGINS` in proxy `.env`:
```bash
cd ~/retirement-planner/PocketBase-Proxy
cat .env | grep ALLOWED_ORIGINS
```

Should include all app domains.

### SSL Certificate Issues

**Renew certificates** in Nginx Proxy Manager:
- SSL Certificates → [certificate] → Renew Now
- Or regenerate Let's Encrypt certificates

### Portal Can't Embed Apps

**Check iframe policies:**

Each app needs proper headers in Nginx Proxy Manager:
```nginx
add_header X-Frame-Options "ALLOW-FROM https://portal.retirewise.com";
add_header Content-Security-Policy "frame-ancestors 'self' https://portal.retirewise.com";
```

### Data Not Persisting

**Check PocketBase Proxy:**
```bash
# Verify proxy is running
docker logs pocketbase-proxy --tail 50

# Test health endpoint
curl https://api.retirewise.com/health

# Check PocketBase is accessible
curl http://localhost:8090/_health
```

### Out of Disk Space

**Clean up Docker:**
```bash
# Remove unused images
docker image prune -a

# Remove stopped containers
docker container prune

# Full cleanup (careful!)
docker system prune -a --volumes
```

### Container Crashes on Startup

**Check resource limits:**
```bash
docker stats

# Check system resources
free -h
df -h
```

**Increase Docker memory limits** if needed.

---

## Production Checklist

Before declaring the deployment complete:

- [ ] All containers running: `docker ps`
- [ ] All apps accessible via HTTPS domains
- [ ] Portal loads and displays all apps correctly
- [ ] Apps can embed in portal (iframe loads)
- [ ] PocketBase proxy health check passes
- [ ] SSL certificates valid on all domains (green padlock)
- [ ] Firebase authentication works in portal
- [ ] Data persistence works (test save/load in each app)
- [ ] No errors in logs: `docker-compose logs | grep -i error`
- [ ] CORS working between apps and proxy
- [ ] All apps show LoadingOverlay on initial load
- [ ] Nginx Proxy Manager configured for all domains
- [ ] Firewall allows ports 80, 443
- [ ] DNS records point to VPS IP

---

## Quick Reference Commands

```bash
# SSH to VPS
ssh eappell@203.161.56.128

# View all containers
docker ps

# View logs
docker logs [container] -f

# Restart service
docker-compose restart

# Rebuild service
docker-compose up -d --build

# Stop service
docker-compose down

# Clean everything
docker system prune -a

# Check disk space
df -h

# Check network
docker network ls
docker network inspect nginx-proxy-manager_default

# Health checks
curl https://api.retirewise.com/health
curl -I https://portal.retirewise.com
```

---

## Support Resources

- **Portal Repository**: https://github.com/eappell/Retire-Portal
- **Common Library**: https://github.com/eappell/Retire-Common-Lib
- **Proxy Repository**: https://github.com/eappell/PocketBase-Proxy
- **Docker Docs**: https://docs.docker.com/
- **Nginx Proxy Manager**: https://nginxproxymanager.com/

---

## Network Diagram

```
                         Internet
                            |
                    Nginx Proxy Manager
                    (SSL Termination)
                            |
        +-------------------+-------------------+
        |                   |                   |
   Portal (3000)    PocketBase Proxy (3001)  Apps (5002-5007)
        |                   |                   |
        |                   |                   |
    Next.js App       Express Server       Next.js/Vite Apps
        |                   |                   |
        +-------------------+-------------------+
                            |
                Docker Network: nginx-proxy-manager_default
```

All services connect via the shared Docker network `nginx-proxy-manager_default`.

---

**End of Guide**
