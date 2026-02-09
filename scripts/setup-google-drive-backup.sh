#!/bin/bash

# Google Drive Backup Setup Script
# This script installs and configures rclone for Google Drive backups

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Google Drive Backup Setup${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# ============================================================================
# 1. INSTALL RCLONE
# ============================================================================
echo -e "${YELLOW}[1/3] Installing rclone...${NC}"

if command -v rclone &> /dev/null; then
    echo "  ✓ rclone already installed: $(rclone --version | head -1)"
else
    echo "  Installing rclone..."
    curl https://rclone.org/install.sh | sudo bash
    echo "  ✓ rclone installed"
fi

echo ""

# ============================================================================
# 2. CONFIGURE GOOGLE DRIVE
# ============================================================================
echo -e "${YELLOW}[2/3] Configuring Google Drive...${NC}"
echo ""
echo -e "${BLUE}Important: You'll need to configure rclone interactively.${NC}"
echo ""
echo "When prompted:"
echo "  1. Choose 'n' for New remote"
echo "  2. Name it: gdrive"
echo "  3. Choose storage type: Google Drive (usually option 15)"
echo "  4. Leave client_id and client_secret blank (press Enter)"
echo "  5. Choose scope: 1 (Full access)"
echo "  6. Leave root_folder_id blank (press Enter)"
echo "  7. Leave service_account_file blank (press Enter)"
echo "  8. Edit advanced config? N"
echo "  9. Use auto config? N (because you're on a headless server)"
echo ""
echo "You'll get a URL to visit in your browser:"
echo "  - Copy the URL"
echo "  - Open it in a browser on your local machine"
echo "  - Authorize access"
echo "  - Copy the verification code back"
echo ""
read -p "Ready to configure? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rclone config
else
    echo "  Skipped configuration. Run 'rclone config' manually later."
fi

echo ""

# ============================================================================
# 3. CREATE BACKUP DIRECTORY ON GOOGLE DRIVE
# ============================================================================
echo -e "${YELLOW}[3/3] Creating backup directory on Google Drive...${NC}"

if rclone lsd gdrive: &> /dev/null; then
    # Create backup directory structure
    rclone mkdir gdrive:Backups 2>/dev/null || true
    rclone mkdir gdrive:Backups/retirement-app 2>/dev/null || true
    echo "  ✓ Backup directory created: gdrive:Backups/retirement-app/"
    
    # Test upload
    echo "Testing upload..." > /tmp/test-backup.txt
    if rclone copy /tmp/test-backup.txt gdrive:Backups/retirement-app/ 2>/dev/null; then
        echo "  ✓ Test upload successful"
        rclone delete gdrive:Backups/retirement-app/test-backup.txt 2>/dev/null || true
    else
        echo -e "${RED}  ✗ Test upload failed${NC}"
    fi
    rm /tmp/test-backup.txt
else
    echo -e "${RED}  ✗ Google Drive not configured properly${NC}"
    echo "  Run 'rclone config' to set it up"
fi

echo ""

# ============================================================================
# NEXT STEPS
# ============================================================================
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Verify configuration: rclone lsd gdrive:"
echo "  2. List backup folder: rclone ls gdrive:Backups/retirement-app/"
echo "  3. The backup script will now automatically upload to Google Drive"
echo "  4. Run a test backup: ~/backup-deployment.sh"
echo ""
echo -e "${BLUE}Useful rclone commands:${NC}"
echo "  - List Google Drive: rclone lsd gdrive:"
echo "  - List backups: rclone ls gdrive:Backups/retirement-app/"
echo "  - Download backup: rclone copy gdrive:Backups/retirement-app/<file> ~/backups/"
echo "  - Check space: rclone about gdrive:"
echo "  - Remove old backups: rclone delete gdrive:Backups/retirement-app/<file>"
echo ""
