#!/bin/bash

# Retirement App Deployment Restore Script
# This script restores a complete deployment from backup

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# USAGE
# ============================================================================
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup-name-or-path>"
    echo ""
    echo "Examples:"
    echo "  $0 retire-deployment-20260206_121500"
    echo "  $0 ~/backups/retire-deployment-20260206_121500.tar.gz"
    echo ""
    echo "Available backups:"
    ls -1 ~/backups/retire-deployment-*.tar.gz 2>/dev/null | tail -5 || echo "  No backups found"
    exit 1
fi

BACKUP_INPUT="$1"
BACKUP_DIR="$HOME/backups"

# Determine backup path
if [ -f "${BACKUP_INPUT}" ]; then
    BACKUP_ARCHIVE="${BACKUP_INPUT}"
elif [ -f "${BACKUP_DIR}/${BACKUP_INPUT}.tar.gz" ]; then
    BACKUP_ARCHIVE="${BACKUP_DIR}/${BACKUP_INPUT}.tar.gz"
elif [ -f "${BACKUP_DIR}/${BACKUP_INPUT}" ]; then
    BACKUP_ARCHIVE="${BACKUP_DIR}/${BACKUP_INPUT}"
else
    echo -e "${RED}Error: Backup not found: ${BACKUP_INPUT}${NC}"
    exit 1
fi

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Retirement App Deployment Restore${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Backup: ${BACKUP_ARCHIVE}"
echo ""

# Confirm before proceeding
read -p "This will stop all containers and restore from backup. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 1
fi

# ============================================================================
# 1. EXTRACT BACKUP
# ============================================================================
echo -e "${YELLOW}[1/8] Extracting backup...${NC}"

RESTORE_TEMP="/tmp/restore-$(date +%s)"
mkdir -p "${RESTORE_TEMP}"
tar xzf "${BACKUP_ARCHIVE}" -C "${RESTORE_TEMP}"

# Find extracted directory
BACKUP_NAME=$(ls "${RESTORE_TEMP}")
BACKUP_PATH="${RESTORE_TEMP}/${BACKUP_NAME}"

if [ ! -d "${BACKUP_PATH}" ]; then
    echo -e "${RED}Error: Invalid backup structure${NC}"
    exit 1
fi

echo "  ✓ Backup extracted to ${RESTORE_TEMP}"

# ============================================================================
# 2. STOP ALL CONTAINERS
# ============================================================================
echo -e "${YELLOW}[2/8] Stopping all containers...${NC}"

RUNNING_CONTAINERS=$(docker ps -q)
if [ -n "${RUNNING_CONTAINERS}" ]; then
    docker stop $(docker ps -q) 2>/dev/null || true
    echo "  ✓ All containers stopped"
else
    echo "  ⚠ No running containers"
fi

# ============================================================================
# 3. RESTORE DOCKER VOLUMES
# ============================================================================
echo -e "${YELLOW}[3/8] Restoring Docker volumes...${NC}"

# NPM Data
if [ -f "${BACKUP_PATH}/volumes/npm_data.tar.gz" ]; then
    docker volume rm npm_data 2>/dev/null || true
    docker volume create npm_data
    docker run --rm -v npm_data:/data -v "${BACKUP_PATH}/volumes":/backup alpine \
        tar xzf /backup/npm_data.tar.gz -C /data
    echo "  ✓ NPM volume restored"
fi

# Portainer Data
if [ -f "${BACKUP_PATH}/volumes/portainer_data.tar.gz" ]; then
    docker volume rm portainer_data 2>/dev/null || true
    docker volume create portainer_data
    docker run --rm -v portainer_data:/data -v "${BACKUP_PATH}/volumes":/backup alpine \
        tar xzf /backup/portainer_data.tar.gz -C /data
    echo "  ✓ Portainer volume restored"
fi

# PocketBase volumes
if [ -f "${BACKUP_PATH}/volumes/pocketbase_data.tar.gz" ]; then
    docker volume rm pocketbase_data 2>/dev/null || true
    docker volume create pocketbase_data
    docker run --rm -v pocketbase_data:/data -v "${BACKUP_PATH}/volumes":/backup alpine \
        tar xzf /backup/pocketbase_data.tar.gz -C /data
    echo "  ✓ PocketBase volume restored"
fi

# ============================================================================
# 4. RESTORE POCKETBASE DATA
# ============================================================================
echo -e "${YELLOW}[4/8] Restoring PocketBase data...${NC}"

if [ -d "${BACKUP_PATH}/data/pb_data" ]; then
    rm -rf "$HOME/pocketbase-proxy/pb_data"
    cp -r "${BACKUP_PATH}/data/pb_data" "$HOME/pocketbase-proxy/pb_data"
    RECORD_COUNT=$(sqlite3 "$HOME/pocketbase-proxy/pb_data/data.db" "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "N/A")
    echo "  ✓ PocketBase data restored (${RECORD_COUNT} user records)"
else
    echo -e "${RED}  ✗ PocketBase data not found in backup${NC}"
fi

# ============================================================================
# 5. RESTORE DOCKER COMPOSE FILES
# ============================================================================
echo -e "${YELLOW}[5/8] Restoring Docker Compose configurations...${NC}"

if [ -d "${BACKUP_PATH}/configs" ]; then
    for config_dir in "${BACKUP_PATH}/configs"/*; do
        if [ -d "${config_dir}" ]; then
            APP_NAME=$(basename "${config_dir}")
            
            # Skip if app directory doesn't exist (needs git clone first)
            if [ ! -d "$HOME/${APP_NAME}" ]; then
                echo "  ⚠ ${APP_NAME} - directory not found (will clone in next step)"
                continue
            fi
            
            # Restore docker-compose.yml
            if [ -f "${config_dir}/docker-compose.yml" ]; then
                cp "${config_dir}/docker-compose.yml" "$HOME/${APP_NAME}/"
            fi
            
            # Restore .env if it exists
            if [ -f "${config_dir}/.env" ]; then
                cp "${config_dir}/.env" "$HOME/${APP_NAME}/"
            fi
            
            echo "  ✓ ${APP_NAME}"
        fi
    done
fi

# ============================================================================
# 6. CLONE MISSING GIT REPOSITORIES
# ============================================================================
echo -e "${YELLOW}[6/8] Cloning any missing Git repositories...${NC}"

GITHUB_USER="eappell"  # Update with your GitHub username
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
    "retire-common-lib"
)

for app in "${APPS[@]}"; do
    if [ ! -d "$HOME/${app}" ]; then
        echo "  Cloning ${app}..."
        git clone "git@github.com:${GITHUB_USER}/${app}.git" "$HOME/${app}" 2>/dev/null || \
        git clone "https://github.com/${GITHUB_USER}/${app}.git" "$HOME/${app}" || \
        echo "    ⚠ Failed to clone ${app} - may need manual clone"
    else
        echo "  ✓ ${app} already exists"
    fi
done

# ============================================================================
# 7. COPY RETIRE-COMMON-LIB TO ALL APPS
# ============================================================================
echo -e "${YELLOW}[7/8] Copying Retire-Common-Lib to all apps...${NC}"

if [ -d "$HOME/retire-common-lib" ]; then
    for app in "${APPS[@]}"; do
        if [ -d "$HOME/${app}" ] && [ "${app}" != "retire-common-lib" ] && [ "${app}" != "pocketbase-proxy" ]; then
            rm -rf "$HOME/${app}/Retire-Common-Lib"
            cp -r "$HOME/retire-common-lib" "$HOME/${app}/Retire-Common-Lib"
            echo "  ✓ ${app}"
        fi
    done
else
    echo -e "${RED}  ✗ Retire-Common-Lib not found${NC}"
fi

# ============================================================================
# 8. START INFRASTRUCTURE AND APPS
# ============================================================================
echo -e "${YELLOW}[8/8] Starting containers...${NC}"

# Start NPM first
if [ -d "$HOME/nginx-proxy-manager" ] && [ -f "$HOME/nginx-proxy-manager/docker-compose.yml" ]; then
    echo "  Starting NPM..."
    cd "$HOME/nginx-proxy-manager"
    docker compose up -d
    echo "  ✓ NPM started"
fi

# Start PocketBase-Proxy
if [ -d "$HOME/pocketbase-proxy" ] && [ -f "$HOME/pocketbase-proxy/docker-compose.yml" ]; then
    echo "  Starting PocketBase-Proxy..."
    cd "$HOME/pocketbase-proxy"
    docker compose up -d
    echo "  ✓ PocketBase-Proxy started"
fi

# Wait for infrastructure to be ready
sleep 5

# Start all apps
echo ""
echo "  Starting applications..."
for app in retire-portal gifting-strategy-planner retirement-identity-builder \
           legacy-flow-visualizer social-security-optimizer digital-estate-manager \
           volunteer-purpose-matchmaker healthcare-cost retire-abroad-ai \
           state-relocate tax-impact-analyzer retirement-planner-ai \
           longevity-drawdown-planner; do
    
    if [ -d "$HOME/${app}" ] && [ -f "$HOME/${app}/docker-compose.yml" ]; then
        cd "$HOME/${app}"
        docker compose up -d 2>/dev/null || echo "    ⚠ Failed to start ${app}"
        echo "  ✓ ${app}"
    fi
done

# Start Portainer (optional)
if [ -d "$HOME/portainer" ] && [ -f "$HOME/portainer/docker-compose.yml" ]; then
    echo "  Starting Portainer..."
    cd "$HOME/portainer"
    docker compose up -d
    echo "  ✓ Portainer started"
fi

# ============================================================================
# CLEANUP
# ============================================================================
rm -rf "${RESTORE_TEMP}"

# ============================================================================
# RESTORE SUMMARY
# ============================================================================
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Restore Completed!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -15
echo ""
echo "Total containers: $(docker ps -q | wc -l)"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Verify NPM is accessible: http://$(hostname -I | awk '{print $1}'):81"
echo "  2. Check PocketBase data: $(sqlite3 ~/pocketbase-proxy/pb_data/data.db 'SELECT COUNT(*) FROM users;' 2>/dev/null || echo 'N/A') users"
echo "  3. Test applications through NPM proxy"
echo "  4. Review deployment manifest: cat ${BACKUP_PATH}/DEPLOYMENT_MANIFEST.md"
echo ""
echo -e "${GREEN}Deployment restored successfully!${NC}"
