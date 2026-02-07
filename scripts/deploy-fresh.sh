#!/bin/bash

# Fresh Retirement App Deployment Script
# Deploys entire stack from git on a fresh server

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
GITHUB_USER="eappell"  # Update with your GitHub username
USE_SSH=true  # Set to false to use HTTPS instead of SSH

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Retirement App Fresh Deployment${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================
echo -e "${YELLOW}Pre-flight checks...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi
echo "  ✓ Docker installed: $(docker --version)"

# Check Docker Compose
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi
echo "  ✓ Docker Compose installed: $(docker compose version)"

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed${NC}"
    exit 1
fi
echo "  ✓ Git installed: $(git --version)"

# Check disk space (need at least 20GB free)
AVAILABLE=$(df ~ | tail -1 | awk '{print $4}')
if [ "${AVAILABLE}" -lt 20971520 ]; then  # 20GB in KB
    echo -e "${RED}Warning: Less than 20GB disk space available${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "  ✓ Sufficient disk space available"
fi

echo ""

# ============================================================================
# 1. CLONE ALL REPOSITORIES
# ============================================================================
echo -e "${YELLOW}[1/7] Cloning Git repositories...${NC}"

cd ~

REPOS=(
    "nginx-proxy-manager"
    "portainer"
    "pocketbase-proxy"
    "retire-common-lib"
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
)

for repo in "${REPOS[@]}"; do
    if [ -d "$HOME/${repo}" ]; then
        echo "  ✓ ${repo} (already exists, pulling latest)"
        cd "$HOME/${repo}"
        git pull 2>/dev/null || true
    else
        echo "  Cloning ${repo}..."
        if [ "${USE_SSH}" = true ]; then
            git clone "git@github.com:${GITHUB_USER}/${repo}.git" "$HOME/${repo}" 2>/dev/null || \
            git clone "https://github.com/${GITHUB_USER}/${repo}.git" "$HOME/${repo}" || \
            echo "    ⚠ Failed to clone ${repo}"
        else
            git clone "https://github.com/${GITHUB_USER}/${repo}.git" "$HOME/${repo}" || \
            echo "    ⚠ Failed to clone ${repo}"
        fi
    fi
done

echo ""

# ============================================================================
# 2. COPY RETIRE-COMMON-LIB TO ALL APPS
# ============================================================================
echo -e "${YELLOW}[2/7] Copying Retire-Common-Lib to apps...${NC}"

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
)

for app in "${APPS[@]}"; do
    if [ -d "$HOME/${app}" ]; then
        rm -rf "$HOME/${app}/Retire-Common-Lib"
        cp -r "$HOME/retire-common-lib" "$HOME/${app}/Retire-Common-Lib"
        echo "  ✓ ${app}"
    fi
done

echo ""

# ============================================================================
# 3. SET UP INFRASTRUCTURE (NPM)
# ============================================================================
echo -e "${YELLOW}[3/7] Setting up Nginx Proxy Manager...${NC}"

if [ -d "$HOME/nginx-proxy-manager" ]; then
    cd "$HOME/nginx-proxy-manager"
    
    # Create docker-compose.yml if it doesn't exist
    if [ ! -f "docker-compose.yml" ]; then
        cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  npm:
    image: 'jc21/nginx-proxy-manager:latest'
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - '80:80'
      - '81:81'
      - '443:443'
    volumes:
      - npm_data:/data
      - npm_letsencrypt:/etc/letsencrypt
    networks:
      - default

networks:
  default:
    name: nginx-proxy-manager_default

volumes:
  npm_data:
  npm_letsencrypt:
EOF
    fi
    
    docker compose up -d
    echo "  ✓ NPM started on ports 80, 81, 443"
    echo "    Default credentials - Email: admin@example.com, Password: changeme"
else
    echo -e "${RED}  ✗ NPM directory not found${NC}"
fi

echo ""

# ============================================================================
# 4. SET UP POCKETBASE-PROXY
# ============================================================================
echo -e "${YELLOW}[4/7] Setting up PocketBase-Proxy...${NC}"

if [ -d "$HOME/pocketbase-proxy" ]; then
    cd "$HOME/pocketbase-proxy"
    
    # Create pb_data directory if it doesn't exist
    mkdir -p pb_data
    
    docker compose up -d
    echo "  ✓ PocketBase-Proxy started on port 3001"
else
    echo -e "${RED}  ✗ PocketBase-Proxy directory not found${NC}"
fi

echo ""

# Wait for infrastructure to stabilize
echo "  Waiting for infrastructure to stabilize..."
sleep 10

# ============================================================================
# 5. BUILD AND START ALL APPLICATIONS
# ============================================================================
echo -e "${YELLOW}[5/7] Building and deploying applications...${NC}"
echo "  This will take several minutes..."
echo ""

for app in "${APPS[@]}"; do
    if [ -d "$HOME/${app}" ] && [ -f "$HOME/${app}/docker-compose.yml" ]; then
        echo "  Deploying ${app}..."
        cd "$HOME/${app}"
        
        # Pull latest changes
        git pull 2>/dev/null || true
        
        # Ensure Retire-Common-Lib is present
        if [ ! -d "Retire-Common-Lib" ]; then
            cp -r "$HOME/retire-common-lib" ./Retire-Common-Lib
        fi
        
        # Build and start
        docker compose build --no-cache 2>/dev/null || docker compose build
        docker compose up -d
        
        echo "    ✓ ${app} deployed"
    fi
done

echo ""

# ============================================================================
# 6. SET UP PORTAINER (OPTIONAL)
# ============================================================================
echo -e "${YELLOW}[6/7] Setting up Portainer (optional)...${NC}"

if [ -d "$HOME/portainer" ]; then
    cd "$HOME/portainer"
    
    if [ ! -f "docker-compose.yml" ]; then
        cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - nginx-proxy-manager_default

networks:
  nginx-proxy-manager_default:
    external: true

volumes:
  portainer_data:
EOF
    fi
    
    docker compose up -d
    echo "  ✓ Portainer started on ports 9000, 9443"
else
    echo "  ⚠ Portainer directory not found (skipped)"
fi

echo ""

# ============================================================================
# 7. CONFIGURE DOCKER STORAGE MANAGEMENT
# ============================================================================
echo -e "${YELLOW}[7/7] Setting up Docker storage management...${NC}"

# Download cleanup script from repo if available
if [ -f "$HOME/retire-portal/docker-cleanup.sh" ]; then
    cp "$HOME/retire-portal/docker-cleanup.sh" "$HOME/"
    chmod +x "$HOME/docker-cleanup.sh"
    echo "  ✓ Cleanup script installed"
fi

# Download monitor script from repo if available
if [ -f "$HOME/retire-portal/docker-monitor.sh" ]; then
    cp "$HOME/retire-portal/docker-monitor.sh" "$HOME/"
    chmod +x "$HOME/docker-monitor.sh"
    echo "  ✓ Monitor script installed"
fi

# Set up cron jobs
(crontab -l 2>/dev/null | grep -v "docker-cleanup\|docker-monitor"; \
 echo "0 3 * * * $HOME/docker-cleanup.sh >> $HOME/docker-cleanup.log 2>&1"; \
 echo "0 */6 * * * $HOME/docker-monitor.sh >> $HOME/docker-monitor.log 2>&1") | crontab -

echo "  ✓ Cron jobs configured"

# Add bash aliases if not already present
if ! grep -q "docker-check" ~/.bashrc 2>/dev/null; then
    cat >> ~/.bashrc << 'EOF'

# Docker storage management aliases
alias docker-check='docker system df && echo "" && docker images -f "dangling=true"'
alias docker-clean='docker image prune -f && docker container prune -f'
alias docker-status='df -h / && echo "" && docker ps --format "table {{.Names}}\t{{.Status}}"'
alias docker-logs-cleanup='find /var/lib/docker/containers -name "*.log" -exec truncate -s 0 {} \;'
alias docker-logs-monitor='find /var/lib/docker/containers -name "*.log" -exec ls -lh {} \; | awk "{sum+=\$5} END {print sum/1024/1024\" MB total log size\"}"'
EOF
    echo "  ✓ Bash aliases added"
fi

echo ""

# ============================================================================
# DEPLOYMENT SUMMARY
# ============================================================================
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -16
echo ""
echo "Total containers: $(docker ps -q | wc -l)"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo "  NPM Admin: http://$(hostname -I | awk '{print $1}'):81"
echo "  Portainer: http://$(hostname -I | awk '{print $1}'):9000"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Configure NPM proxy hosts for all applications"
echo "  2. Set up SSL certificates in NPM"
echo "  3. Configure PocketBase authentication"
echo "  4. Test all applications"
echo "  5. Run first backup: ~/backup-deployment.sh"
echo ""
echo -e "${GREEN}Deployment successful!${NC}"
