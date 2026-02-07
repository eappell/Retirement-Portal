# Docker Storage Management

## Overview

This VPS hosts 14+ Docker containers for the retirement planning platform. Without proper management, Docker images and logs can rapidly consume disk space, leading to system failures.

**Problem Solved:** On Feb 6, 2026, the VPS disk filled to 100%, causing PocketBase corruption. After emergency cleanup and implementing automatic management, **18.77GB was freed** (32GB → 13GB usage, 29% → 11%).

## Automatic Cleanup System ✅

### Scheduled Tasks (Configured)

Two cron jobs run automatically on the VPS:

1. **Daily Cleanup** - 3:00 AM UTC
   - Removes dangling Docker images (unused build layers)
   - Deletes stopped containers older than 24 hours
   - Cleans unused networks
   - Logs to `~/docker-cleanup.log`

2. **Storage Monitoring** - Every 6 hours
   - Checks disk usage and Docker storage
   - Alerts if >10 dangling images exist
   - Alerts if disk usage exceeds 80%
   - Logs to `~/docker-monitor.log`

### Scripts Installed on VPS

- `~/docker-cleanup.sh` - Main cleanup script
- `~/docker-monitor.sh` - Storage monitoring and alerts
- `~/docker-setup-instructions.md` - Full documentation

## Quick Commands (VPS)

### Check Storage Status
```bash
# View Docker storage usage
docker system df

# Check with disk usage
docker system df && df -h | grep /dev/sda2

# Run monitoring script (shows alerts)
~/docker-monitor.sh
```

### Manual Cleanup
```bash
# Safe cleanup - removes dangling images only
docker image prune -f

# Remove old stopped containers
docker container prune -f --filter "until=24h"

# Run full automated cleanup
~/docker-cleanup.sh

# Nuclear option - removes ALL unused images (be careful!)
docker system prune -a -f
```

### View Logs
```bash
# Recent cleanup activity
tail -50 ~/docker-cleanup.log

# Monitoring history
tail -50 ~/docker-monitor.log

# Watch real-time cleanup
tail -f ~/docker-cleanup.log
```

## Bash Aliases (VPS)

These shortcuts are available in your shell:

```bash
docker-check         # Show storage usage + disk space
docker-clean         # Quick cleanup (safe)
docker-status        # Run monitor with alerts
docker-logs-cleanup  # View cleanup history
docker-logs-monitor  # View monitoring history
```

## Container Logging Limits

To prevent container logs from consuming excessive disk space, Docker logging limits should be configured.

### Setup Instructions (One-time)

**On the VPS as root/sudo:**

```bash
# Install Docker daemon configuration
sudo cp ~/daemon.json /etc/docker/daemon.json

# Restart Docker daemon
sudo systemctl restart docker

# Wait for Docker to restart
sleep 30

# Restart all containers (they'll reconnect automatically)
cd ~/retire-portal && docker compose up -d
cd ~/Gifting-Strategy-Planner && docker compose up -d
cd ~/Retirement-Identity-Builder && docker compose up -d
cd ~/Legacy-Flow-Visualizer && docker compose up -d
cd ~/Social-Security-Optimizer && docker compose up -d
cd ~/Digital-Estate-Manager && docker compose up -d
cd ~/Volunteer-Purpose-Matchmaker && docker compose up -d
cd ~/healthcare-cost && docker compose up -d
cd ~/Retire-Abroad-AI && docker compose up -d
cd ~/state-relocate && docker compose up -d
cd ~/tax-impact-analyzer && docker compose up -d
cd ~/Retirement-Planner-AI && docker compose up -d
cd ~/longevity-drawdown-planner && docker compose up -d
cd ~/PocketBase-Proxy && docker compose up -d
```

**Or use this one-liner:**
```bash
for dir in ~/{retire-portal,Gifting-Strategy-Planner,Retirement-Identity-Builder,Legacy-Flow-Visualizer,Social-Security-Optimizer,Digital-Estate-Manager,Volunteer-Purpose-Matchmaker,healthcare-cost,Retire-Abroad-AI,state-relocate,tax-impact-analyzer,Retirement-Planner-AI,longevity-drawdown-planner,PocketBase-Proxy}; do [ -d "$dir" ] && cd "$dir" && docker compose up -d; done
```

### Logging Configuration

The `daemon.json` file configures:
- **Max log size:** 10MB per container
- **Max log files:** 3 rotated files
- **Log driver:** json-file (default)

This keeps logs manageable across all 14+ containers.

## Why Docker Fills Up Disk

### The Problem

When you deploy with `docker compose build`:

1. **Build layers accumulate** - Each `docker compose build` creates new image layers
2. **Old layers remain as "dangling images"** - Shown as `<none>` in `docker images`
3. **Rapid growth** - Each deployment adds 500MB-1GB of dangling images
4. **Multiple apps compound the issue** - 12 apps × multiple deployments = 20GB+ waste

### Example
```bash
$ docker images
REPOSITORY                    TAG      IMAGE ID       SIZE
gifting-planner              latest   abc123         206MB
<none>                       <none>   def456         780MB  ← Dangling!
<none>                       <none>   ghi789         850MB  ← Dangling!
retirement-identity-builder  latest   jkl012         807MB
<none>                       <none>   mno345         880MB  ← Dangling!
```

### The Solution

✅ **Automatic daily cleanup** removes these safely  
✅ **Monitoring alerts** before disk fills up  
✅ **Logging limits** prevent log file bloat  

## Ghost Containers

**"Ghost containers"** are stopped containers with cryptic names that accumulate over time.

### Causes
- Build failures leaving intermediate containers
- Running `docker run` without `--rm` flag
- Interrupted deployments

### Prevention (Already Implemented)
- ✅ Daily auto-cleanup removes stopped containers
- ✅ Using `docker-compose` for all deployments (handles cleanup)
- ✅ Container naming in docker-compose.yml files

### Manual Cleanup
```bash
# List all containers (including stopped)
docker ps -a

# Remove all stopped containers
docker container prune -f

# Remove specific container
docker rm <container-id>
```

## Best Practices

### Deployment
```bash
# Always pull latest code first
cd ~/app-name && git pull

# Build and deploy
docker compose down
docker compose build
docker compose up -d

# Remove orphans if docker-compose.yml changed
docker compose up -d --remove-orphans
```

### Regular Monitoring
```bash
# Check weekly (automation handles daily)
ssh user@vps
docker-check

# Review logs monthly
tail -100 ~/docker-cleanup.log
```

### Emergency Disk Full
```bash
# If disk hits 90%+
docker system prune -a -f           # Removes ALL unused images
docker volume prune -f               # Removes unused volumes
docker builder prune -a -f           # Clears build cache

# Restart critical services
cd ~/PocketBase-Proxy && docker compose up -d
cd ~/nginx-proxy-manager && docker compose up -d
```

## Storage Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Disk Usage | 70% | 85% | Run manual cleanup |
| Dangling Images | 10 | 20 | Run `docker image prune -f` |
| Docker Storage | 15GB | 25GB | Run `docker system prune -a -f` |
| Log Files | 5MB/container | 10MB/container | Check logging config |

## Monitoring Alerts

The `docker-monitor.sh` script alerts when:

```bash
WARNING: More than 10 dangling images detected!
Run: docker image prune -f

CRITICAL: Disk usage is at 85%!
Consider running: docker system prune -a -f
```

Check alerts:
```bash
~/docker-monitor.sh
```

## Troubleshooting

### Cron Jobs Not Running
```bash
# Check crontab
crontab -l

# Verify cron service
sudo systemctl status cron

# Check logs
grep CRON /var/log/syslog | tail -20
```

### Scripts Not Executable
```bash
chmod +x ~/docker-cleanup.sh
chmod +x ~/docker-monitor.sh
```

### Disk Still Filling Up
```bash
# Find large files
du -h / | sort -rh | head -20

# Check Docker volumes
docker volume ls
docker system df -v

# Check container logs
docker logs <container-name> | wc -l
```

## Deployment History

- **Feb 6, 2026** - Disk reached 100%, PocketBase corrupted
- **Feb 6, 2026** - Emergency cleanup freed 102GB
- **Feb 6, 2026** - Implemented automatic cleanup system
- **Feb 6, 2026** - Second cleanup freed 18.77GB of dangling images
- **Feb 6, 2026** - Configured cron jobs and monitoring

## Current Infrastructure

**VPS Details:**
- Total Storage: 118GB
- Current Usage: ~13GB (11% after cleanup)
- Free Space: ~105GB

**Deployed Applications:** 14 containers
- Retire Portal (port 3000)
- 12 Retirement Planning Apps (ports 5002-5012, 8030)
- PocketBase Proxy (port 3001)
- Nginx Proxy Manager (ports 80, 81, 443)
- Portainer (ports 9000, 9443)

**Storage Breakdown:**
- Docker Images: ~4GB (active)
- Container Runtime: ~6MB
- PocketBase Data: ~2MB (671 records)
- Nginx Config: ~124KB
- Logs: Minimal (with rotation)

## Support

For issues or questions:
1. Check logs: `~/docker-cleanup.log` and `~/docker-monitor.log`
2. Run manual monitoring: `~/docker-monitor.sh`
3. Review this documentation: `~/docker-setup-instructions.md`
4. Check Docker status: `docker ps` and `docker system df`

---

**Last Updated:** February 6, 2026  
**Maintained by:** Automated cron jobs + manual oversight
