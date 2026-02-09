#!/bin/bash

# Retirement App Deployment Backup Script
# This script backs up all critical deployment data

set -e

# Configuration
BACKUP_DIR="$HOME/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="retire-deployment-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Retirement App Deployment Backup${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Backup location: ${BACKUP_PATH}"
echo "Timestamp: ${TIMESTAMP}"
echo ""

# Create backup directory structure
mkdir -p "${BACKUP_PATH}"/{data,configs,volumes}

# ============================================================================
# 1. BACKUP APPLICATION DATA
# ============================================================================
echo -e "${YELLOW}[1/6] Backing up PocketBase data...${NC}"
if [ -d "$HOME/pocketbase-proxy/pb_data" ]; then
    cp -r "$HOME/pocketbase-proxy/pb_data" "${BACKUP_PATH}/data/pb_data"
    DB_SIZE=$(du -sh "$HOME/pocketbase-proxy/pb_data" | cut -f1)
    RECORD_COUNT=$(sqlite3 "$HOME/pocketbase-proxy/pb_data/data.db" "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "N/A")
    echo "  ✓ PocketBase backed up: ${DB_SIZE} (${RECORD_COUNT} user records)"
else
    echo -e "${RED}  ✗ PocketBase data not found${NC}"
fi

# ============================================================================
# 2. BACKUP DOCKER VOLUMES
# ============================================================================
echo -e "${YELLOW}[2/6] Backing up Docker volumes...${NC}"

# NPM Data
if docker volume inspect npm_data &>/dev/null; then
    docker run --rm -v npm_data:/data -v "${BACKUP_PATH}/volumes":/backup alpine \
        tar czf /backup/npm_data.tar.gz -C /data .
    echo "  ✓ NPM volume backed up"
else
    echo -e "${RED}  ✗ NPM volume not found${NC}"
fi

# Portainer Data
if docker volume inspect portainer_data &>/dev/null; then
    docker run --rm -v portainer_data:/data -v "${BACKUP_PATH}/volumes":/backup alpine \
        tar czf /backup/portainer_data.tar.gz -C /data .
    echo "  ✓ Portainer volume backed up"
else
    echo "  ⚠ Portainer volume not found (can be recreated)"
fi

# PocketBase volumes (if using Docker volume instead of bind mount)
if docker volume inspect pocketbase_data &>/dev/null; then
    docker run --rm -v pocketbase_data:/data -v "${BACKUP_PATH}/volumes":/backup alpine \
        tar czf /backup/pocketbase_data.tar.gz -C /data .
    echo "  ✓ PocketBase Docker volume backed up"
fi

# ============================================================================
# 3. BACKUP DOCKER COMPOSE FILES
# ============================================================================
echo -e "${YELLOW}[3/6] Backing up Docker Compose files...${NC}"

APPS=(
    "retire-portal"
    "gifting-strategy-planner"
    "retirement-identity-builder"
    "legacy-flow-visualizer"
    "social-security-optimizer"
    "digital-estate-manager"
    "volunteer-purpose-matchmaker"
    "healthcare-cost"
    "retire-abroad-ai"
    "state-relocate"
    "tax-impact-analyzer"
    "retirement-planner-ai"
    "longevity-drawdown-planner"
    "pocketbase-proxy"
)

for app in "${APPS[@]}"; do
    if [ -f "$HOME/${app}/docker-compose.yml" ]; then
        mkdir -p "${BACKUP_PATH}/configs/${app}"
        cp "$HOME/${app}/docker-compose.yml" "${BACKUP_PATH}/configs/${app}/"
        
        # Also backup .env files if they exist
        if [ -f "$HOME/${app}/.env" ]; then
            cp "$HOME/${app}/.env" "${BACKUP_PATH}/configs/${app}/"
        fi
        
        echo "  ✓ ${app}"
    fi
done

# ============================================================================
# 4. BACKUP NPM AND PORTAINER CONFIGS
# ============================================================================
echo -e "${YELLOW}[4/6] Backing up infrastructure configs...${NC}"

# NPM docker-compose
if [ -f "$HOME/nginx-proxy-manager/docker-compose.yml" ]; then
    mkdir -p "${BACKUP_PATH}/configs/nginx-proxy-manager"
    cp "$HOME/nginx-proxy-manager/docker-compose.yml" "${BACKUP_PATH}/configs/nginx-proxy-manager/"
    echo "  ✓ NPM docker-compose.yml"
fi

# Portainer docker-compose
if [ -f "$HOME/portainer/docker-compose.yml" ]; then
    mkdir -p "${BACKUP_PATH}/configs/portainer"
    cp "$HOME/portainer/docker-compose.yml" "${BACKUP_PATH}/configs/portainer/"
    echo "  ✓ Portainer docker-compose.yml"
fi

# ============================================================================
# 5. CREATE DEPLOYMENT MANIFEST
# ============================================================================
echo -e "${YELLOW}[5/6] Creating deployment manifest...${NC}"

cat > "${BACKUP_PATH}/DEPLOYMENT_MANIFEST.md" << 'EOF'
# Retirement App Deployment Manifest

## Infrastructure
- **NPM (Nginx Proxy Manager)**: Ports 80, 81, 443
- **PocketBase-Proxy**: Port 3001
- **Portainer**: Ports 9000, 9443

## Applications
| App Name | Port | Git Repo |
|----------|------|----------|
| Retire Portal | 3000 | retire-portal |
| Gifting Strategy Planner | 5010 | gifting-strategy-planner |
| Retirement Identity Builder | 5007 | retirement-identity-builder |
| Legacy Flow Visualizer | 5009 | legacy-flow-visualizer |
| Social Security Optimizer | 5003 | social-security-optimizer |
| Digital Estate Manager | 5011 | digital-estate-manager |
| Volunteer Purpose Matchmaker | 5008 | volunteer-purpose-matchmaker |
| Healthcare Cost | 5012 | healthcare-cost |
| Retire Abroad AI | 5006 | retire-abroad-ai |
| State Relocate | 5004 | state-relocate |
| Tax Impact Analyzer | 5002 | tax-impact-analyzer |
| Retirement Planner AI | 8030 | retirement-planner-ai |
| Longevity Drawdown Planner | 5005 | longevity-drawdown-planner |

## Git Repositories
All repos are in: `~/` directory on VPS

## Docker Network
- Network: `nginx-proxy-manager_default`
- All containers connected to this network

## Important Notes
- All apps require `Retire-Common-Lib` to be copied into their directory before build
- Apps using @retirewise/integration: Use shared library pattern
- NPM database contains all proxy host configurations and SSL certificates
- PocketBase contains all user data and application state
EOF

# Add backup metadata
cat >> "${BACKUP_PATH}/DEPLOYMENT_MANIFEST.md" << EOF

## Backup Information
- **Backup Date**: $(date)
- **Backup Name**: ${BACKUP_NAME}
- **Server**: $(hostname)
- **Docker Version**: $(docker --version 2>/dev/null || echo "Not available")
- **Running Containers**: $(docker ps --format '{{.Names}}' 2>/dev/null | wc -l || echo "N/A")

## Disk Usage at Backup Time
\`\`\`
$(df -h / | tail -1)
\`\`\`

## Docker Storage
\`\`\`
$(docker system df 2>/dev/null || echo "Not available")
\`\`\`
EOF

echo "  ✓ Manifest created"

# ============================================================================
# 6. CREATE ARCHIVE
# ============================================================================
echo -e "${YELLOW}[6/6] Creating compressed archive...${NC}"

cd "${BACKUP_DIR}"
tar czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
ARCHIVE_SIZE=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)

echo "  ✓ Archive created: ${BACKUP_NAME}.tar.gz (${ARCHIVE_SIZE})"

# Optionally remove uncompressed directory to save space
rm -rf "${BACKUP_NAME}"

# ============================================================================
# BACKUP SUMMARY
# ============================================================================
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Backup Completed Successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "Size: ${ARCHIVE_SIZE}"
echo ""
echo "To restore from this backup:"
echo "  1. Extract: tar xzf ${BACKUP_NAME}.tar.gz"
echo "  2. Run: ./restore-deployment.sh ${BACKUP_NAME}"
echo ""

# ============================================================================
# CLEANUP OLD BACKUPS (Keep last 7 days)
# ============================================================================
echo -e "${YELLOW}Cleaning up old backups (keeping last 7)...${NC}"
cd "${BACKUP_DIR}"
ls -t retire-deployment-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
REMAINING=$(ls -1 retire-deployment-*.tar.gz 2>/dev/null | wc -l)
echo "  ✓ ${REMAINING} backups retained"
echo ""

# ============================================================================
# UPLOAD TO REMOTE STORAGE
# ============================================================================

# Google Drive (using rclone)
if command -v rclone &> /dev/null; then
    echo -e "${YELLOW}Uploading to Google Drive...${NC}"
    if rclone copy "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" gdrive:Backups/retirement-app/; then
        echo "  ✓ Uploaded to Google Drive"
        
        # Clean up old backups on Google Drive (keep last 14)
        echo "  Cleaning up old backups on Google Drive..."
        rclone lsf gdrive:Backups/retirement-app/ | grep "retire-deployment-.*\.tar\.gz" | sort -r | tail -n +15 | while read file; do
            rclone delete "gdrive:Backups/retirement-app/$file" 2>/dev/null || true
        done
        echo "  ✓ Old Google Drive backups cleaned"
    else
        echo -e "${RED}  ✗ Failed to upload to Google Drive${NC}"
    fi
else
    echo "  ⚠ rclone not installed, skipping Google Drive upload"
fi

# AWS S3
# if command -v aws &> /dev/null; then
#     echo -e "${YELLOW}Uploading to AWS S3...${NC}"
#     aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" s3://your-bucket-name/backups/
#     echo "  ✓ Uploaded to S3"
# fi

# SCP to another server
# SCP_SERVER="backup@backup-server.com"
# SCP_PATH="/backups/retirement-app/"
# echo -e "${YELLOW}Uploading to backup server...${NC}"
# scp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "${SCP_SERVER}:${SCP_PATH}"
# echo "  ✓ Uploaded to backup server"

echo -e "${GREEN}All done!${NC}"
