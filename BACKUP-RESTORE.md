# Backup & Restore System

Complete backup and restore system for the Retirement App deployment infrastructure.

## Overview

This system provides comprehensive backup/restore capabilities for:
- **PocketBase** data (user records, application state)
- **NPM** configuration (proxy hosts, SSL certificates)
- **Portainer** configuration
- **Docker Compose** files for all applications
- **Environment variables** and configurations

## Scripts

### 1. `backup-deployment.sh`
Creates a complete backup of the deployment including all data, configurations, and volumes.

**Location**: `~/backup-deployment.sh`

**What it backs up**:
- PocketBase data directory (`~/pocketbase-proxy/pb_data`)
- NPM Docker volume (proxy hosts, SSL certs)
- Portainer Docker volume
- All docker-compose.yml files
- All .env files
- Deployment manifest

**Usage**:
```bash
# Create backup
~/backup-deployment.sh

# Backups stored in ~/backups/
ls ~/backups/
```

**Features**:
- Automatic compression (tar.gz)
- Timestamped backups
- Automatic cleanup (keeps last 7 backups)
- Optional remote upload (Google Drive, S3, SCP)

### 2. `restore-deployment.sh`
Restores a complete deployment from a backup archive.

**Location**: `~/restore-deployment.sh`

**What it restores**:
- All Docker volumes (NPM, Portainer, PocketBase)
- PocketBase data
- Docker Compose configurations
- Environment variables
- Starts all containers

**Usage**:
```bash
# List available backups
~/restore-deployment.sh

# Restore from backup
~/restore-deployment.sh retire-deployment-20260206_121500

# Or specify full path
~/restore-deployment.sh ~/backups/retire-deployment-20260206_121500.tar.gz
```

**Process**:
1. Extracts backup archive
2. Stops all running containers
3. Restores Docker volumes
4. Restores PocketBase data
5. Restores configurations
6. Clones any missing git repos
7. Copies Retire-Common-Lib
8. Starts all infrastructure and apps

### 3. `deploy-fresh.sh`
Deploys the entire stack from git on a fresh server.

**Location**: `~/deploy-fresh.sh`

**Use cases**:
- Brand new VPS setup
- Complete rebuild after disaster
- Setting up development/staging environment

**What it does**:
1. Pre-flight checks (Docker, disk space)
2. Clones all git repositories
3. Copies Retire-Common-Lib to apps
4. Sets up NPM infrastructure
5. Sets up PocketBase-Proxy
6. Builds and deploys all applications
7. Sets up Portainer
8. Configures Docker storage management

**Usage**:
```bash
# Configure GitHub username in script first
nano ~/deploy-fresh.sh
# Set: GITHUB_USER="your-username"

# Run deployment
~/deploy-fresh.sh
```

## Automated Backup Schedule

**Cron Configuration**:
```bash
# Daily backup at 3 AM
0 3 * * * ~/backup-deployment.sh >> ~/backup.log 2>&1
```

**Setup**:
```bash
# Add to crontab
crontab -e

# Add this line:
0 3 * * * ~/backup-deployment.sh >> ~/backup.log 2>&1
```

**Check backup logs**:
```bash
tail -20 ~/backup.log
```

## Backup to Remote Storage

### Option 1: Google Drive (using rclone)

**Install rclone**:
```bash
sudo apt install rclone
rclone config  # Follow prompts to configure Google Drive
```

**Edit backup script**:
```bash
nano ~/backup-deployment.sh
# Uncomment the Google Drive section (around line 200):
# rclone copy "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" gdrive:Backups/retirement-app/
```

### Option 2: AWS S3

**Install AWS CLI**:
```bash
sudo apt install awscli
aws configure  # Enter credentials
```

**Edit backup script**:
```bash
nano ~/backup-deployment.sh
# Uncomment the AWS S3 section:
# aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" s3://your-bucket/backups/
```

### Option 3: SCP to Another Server

**Edit backup script**:
```bash
nano ~/backup-deployment.sh
# Uncomment and configure the SCP section:
# SCP_SERVER="backup@backup-server.com"
# SCP_PATH="/backups/retirement-app/"
# scp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "${SCP_SERVER}:${SCP_PATH}"
```

## Disaster Recovery Procedures

### Scenario 1: Disk Space Crisis

**Symptoms**:
- Containers failing to start
- PocketBase SQLite errors
- 100% disk usage

**Recovery**:
```bash
# 1. Emergency cleanup
docker system prune -a --volumes -f

# 2. Verify PocketBase data integrity
sqlite3 ~/pocketbase-proxy/pb_data/data.db "PRAGMA integrity_check;"

# 3. Restore from backup if needed
~/restore-deployment.sh <latest-backup>
```

### Scenario 2: Data Corruption

**Recovery**:
```bash
# 1. Stop affected services
cd ~/pocketbase-proxy
docker compose down

# 2. Restore from backup
~/restore-deployment.sh <backup-before-corruption>

# 3. Verify data
sqlite3 ~/pocketbase-proxy/pb_data/data.db "SELECT COUNT(*) FROM users;"
```

### Scenario 3: Complete Server Failure

**Recovery on new VPS**:
```bash
# 1. Install Docker and dependencies
sudo apt update
sudo apt install docker.io docker-compose-v2 git sqlite3

# 2. Download backup from remote storage
# (Google Drive, S3, or backup server)
mkdir -p ~/backups
# Copy backup to ~/backups/

# 3. Upload scripts
# Copy backup-deployment.sh, restore-deployment.sh, deploy-fresh.sh to ~
chmod +x ~/*.sh

# 4. Run restore
~/restore-deployment.sh <backup-name>

# 5. Update DNS/NPM if IP changed
```

## Manual Backup Commands

### Quick PocketBase Backup
```bash
# Backup PocketBase data only
tar czf ~/pb-backup-$(date +%Y%m%d).tar.gz -C ~/pocketbase-proxy pb_data
```

### Quick NPM Backup
```bash
# Backup NPM volume
docker run --rm -v npm_data:/data -v ~/backups:/backup alpine \
  tar czf /backup/npm-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### Backup Single App
```bash
# Backup specific app configuration
APP_NAME="retire-portal"
tar czf ~/${APP_NAME}-backup-$(date +%Y%m%d).tar.gz \
  -C ~ ${APP_NAME}/docker-compose.yml ${APP_NAME}/.env
```

## Verification

### After Backup
```bash
# Verify backup was created
ls -lh ~/backups/retire-deployment-*.tar.gz | tail -1

# Check backup contents
tar tzf ~/backups/<backup-name>.tar.gz | head -20

# View manifest
tar xzf ~/backups/<backup-name>.tar.gz <backup-name>/DEPLOYMENT_MANIFEST.md -O
```

### After Restore
```bash
# Check running containers
docker ps

# Verify PocketBase data
sqlite3 ~/pocketbase-proxy/pb_data/data.db "SELECT COUNT(*) FROM users;"

# Check NPM
curl -I http://localhost:81

# Check disk usage
df -h /
docker system df
```

## Best Practices

1. **Regular Backups**: Run daily at minimum
2. **Test Restores**: Verify backups work (quarterly)
3. **Remote Storage**: Always keep off-site backups
4. **Monitor Size**: Track backup growth trends
5. **Document Changes**: Update manifest after infrastructure changes
6. **Version Control**: Keep scripts in git
7. **Rotation Policy**: Keep last 7 daily, 4 weekly, 12 monthly

## Troubleshooting

### Backup Fails
```bash
# Check disk space
df -h ~
docker system df

# Check permissions
ls -la ~/pocketbase-proxy/pb_data
docker volume inspect npm_data

# Check logs
~/backup-deployment.sh 2>&1 | tee backup-debug.log
```

### Restore Fails
```bash
# Check backup integrity
tar tzf ~/backups/<backup-name>.tar.gz > /dev/null
echo $?  # Should be 0

# Verify Docker is running
docker ps

# Check volumes
docker volume ls

# Manual extraction
mkdir /tmp/test-restore
tar xzf ~/backups/<backup-name>.tar.gz -C /tmp/test-restore
ls -la /tmp/test-restore
```

### Container Won't Start After Restore
```bash
# Check logs
docker compose logs <service-name>

# Verify volumes
docker volume inspect <volume-name>

# Rebuild container
cd ~/<app-name>
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Backup Size Estimates

| Component | Typical Size |
|-----------|-------------|
| PocketBase data | 1-5 MB |
| NPM volume | 10-50 MB |
| Portainer volume | 5-10 MB |
| Config files | < 1 MB |
| **Total (compressed)** | **15-65 MB** |

*Size grows with user data and SSL certificates*

## Security Notes

- **Encryption**: Consider encrypting backups for sensitive data
- **Access Control**: Restrict backup directory permissions (700)
- **Remote Storage**: Use encrypted connections (HTTPS, SFTP)
- **Credentials**: Never commit .env files with secrets to git
- **Database**: PocketBase includes user data - handle securely

## Quick Reference

```bash
# Create backup now
~/backup-deployment.sh

# List backups
ls -lh ~/backups/

# Restore latest backup
~/restore-deployment.sh $(ls ~/backups/retire-deployment-*.tar.gz | tail -1)

# Fresh deployment on new server
~/deploy-fresh.sh

# View backup logs
tail -f ~/backup.log

# Check automated backup schedule
crontab -l | grep backup

# Disk usage before/after backup
du -sh ~/backups/
df -h /
```

## Related Documentation

- [DOCKER-STORAGE-MANAGEMENT.md](./DOCKER-STORAGE-MANAGEMENT.md) - Docker cleanup and monitoring
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Application deployment procedures
- [README.md](./README.md) - Main project documentation

---

**Last Updated**: February 6, 2026
**Maintained By**: Development Team
**Version**: 1.0
