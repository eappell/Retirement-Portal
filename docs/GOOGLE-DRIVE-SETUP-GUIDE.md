# Google Drive Backup Setup - Quick Guide

## Overview
Your backup system is now configured to automatically upload backups to Google Drive. All scripts are ready on your Mac and need to be uploaded to the VPS.

## Step-by-Step Setup

### 1. Upload Scripts to VPS

```bash
# From your Mac terminal:
scp ~/backup-deployment.sh ~/setup-google-drive-backup.sh ~/restore-deployment.sh ~/deploy-fresh.sh eappell@203.161.56.128:~/

# Make them executable:
ssh eappell@203.161.56.128 "chmod +x ~/*.sh"
```

### 2. Run Google Drive Setup on VPS

```bash
# SSH into your VPS
ssh eappell@203.161.56.128

# Run the setup script
~/setup-google-drive-backup.sh
```

The script will:
- Install rclone
- Guide you through Google Drive authorization
- Create backup folders
- Test the connection

### 3. Authorize Google Drive

When prompted during `rclone config`:

1. Choose `n` for New remote
2. Name it: `gdrive`
3. Storage type: `15` (Google Drive)
4. Leave client_id/secret blank (press Enter)
5. Scope: `1` (Full access)
6. Leave other options blank (press Enter)
7. Auto config: `N` (headless server)

**IMPORTANT**: You'll get a URL like:
```
https://accounts.google.com/o/oauth2/auth?client_id=...
```

1. **Copy the entire URL from your SSH terminal**
2. **Open it in your local browser** (on your Mac)
3. Sign in and authorize access
4. **Copy the verification code** from the browser
5. **Paste it back in the SSH terminal**

### 4. Test the Setup

```bash
# Verify Google Drive is accessible
rclone lsd gdrive:

# You should see your folders including:
# Backups/

# Run a test backup
~/backup-deployment.sh
```

The backup will:
- Create local backup in `~/backups/`
- Automatically upload to `gdrive:Backups/retirement-app/`
- Clean up old backups (keeps last 14 on Google Drive)

### 5. Verify Google Drive Upload

```bash
# List backups on Google Drive
rclone ls gdrive:Backups/retirement-app/

# Check your Google Drive space usage
rclone about gdrive:
```

## What Happens Now

✅ **Automatic Daily Backups**:
- Runs every day at 3 AM (via cron)
- Creates local backup
- Uploads to Google Drive
- Keeps last 7 local backups
- Keeps last 14 Google Drive backups

✅ **Disaster Recovery**:
- Even if VPS is completely destroyed
- Download backup from Google Drive
- Run `restore-deployment.sh`
- Everything restored!

## Useful Commands

```bash
# Manual backup anytime
~/backup-deployment.sh

# List local backups
ls -lh ~/backups/

# List Google Drive backups
rclone ls gdrive:Backups/retirement-app/

# Download backup from Google Drive
rclone copy gdrive:Backups/retirement-app/<backup-name>.tar.gz ~/backups/

# Check Google Drive space
rclone about gdrive:

# View backup logs
tail -50 ~/backup.log
```

## Troubleshooting

### "rclone not found"
```bash
curl https://rclone.org/install.sh | sudo bash
```

### "Failed to configure token"
Make sure you:
1. Copy the ENTIRE URL (it's very long)
2. Open in a browser where you're logged into Google
3. Authorize the app
4. Copy the entire verification code back

### "Failed to upload to Google Drive"
```bash
# Test connection
rclone lsd gdrive:

# Re-configure if needed
rclone config

# Check rclone errors
rclone check ~/backups/ gdrive:Backups/retirement-app/ -v
```

## Storage Capacity

- **Google Drive Free**: 15 GB
- **Typical Backup Size**: 15-65 MB
- **Capacity**: 230-1000 backups
- **Retention**: 14 backups = ~210-910 MB

You'll have plenty of space for years of backups!

## Next Steps After Setup

1. ✅ Verify first backup uploaded successfully
2. ✅ Schedule is already configured (cron job)
3. ✅ Test restore process (optional but recommended):
   ```bash
   # On a test server or local Docker
   ~/restore-deployment.sh retire-deployment-<timestamp>
   ```
4. ✅ Document your Google account email (for disaster recovery)

## Files Updated

On your Mac:
- ✅ `~/backup-deployment.sh` - Now uploads to Google Drive
- ✅ `~/setup-google-drive-backup.sh` - Automated setup script
- ✅ Retire-Portal/docs/BACKUP-RESTORE.md - Full documentation

These need to be uploaded to VPS to take effect!
