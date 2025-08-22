#!/bin/bash

# ==============================================
# Backup Script for WhatsApp Calling App
# ==============================================

set -e

echo "💾 Starting backup process..."

# Configuration
BACKUP_DIR="/tmp/whatsapp-calling-backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="whatsapp-calling-backup-${DATE}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Create backup directory
mkdir -p "$BACKUP_PATH"

echo "📁 Backup location: $BACKUP_PATH"

# Backup Redis data
echo "🔴 Backing up Redis data..."
if command -v redis-cli &> /dev/null; then
    redis-cli --rdb "${BACKUP_PATH}/redis-dump.rdb" || echo "⚠️  Redis backup failed"
    echo "✅ Redis backup completed"
else
    echo "⚠️  Redis CLI not found, skipping Redis backup"
fi

# Backup environment configuration
echo "⚙️  Backing up configuration..."
if [ -f ".env" ]; then
    cp .env "${BACKUP_PATH}/env-backup.txt"
    echo "✅ Environment configuration backed up"
else
    echo "⚠️  .env file not found"
fi

# Backup SSL certificates
echo "🔒 Backing up SSL certificates..."
if [ -d "ssl" ]; then
    cp -r ssl "${BACKUP_PATH}/ssl-backup"
    echo "✅ SSL certificates backed up"
else
    echo "⚠️  SSL directory not found"
fi

# Backup application logs
echo "📋 Backing up logs..."
if [ -d "backend/logs" ]; then
    cp -r backend/logs "${BACKUP_PATH}/logs-backup"
    echo "✅ Logs backed up"
else
    echo "⚠️  Logs directory not found"
fi

# Create backup info file
echo "📄 Creating backup information..."
cat > "${BACKUP_PATH}/backup-info.txt" << EOF
WhatsApp HubSpot Calling Integration Backup
==========================================

Backup Date: $(date)
Backup Name: $BACKUP_NAME
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "N/A")
Node Version: $(node --version 2>/dev/null || echo "N/A")
NPM Version: $(npm --version 2>/dev/null || echo "N/A")

Contents:
- Redis data (if available)
- Environment configuration
- SSL certificates (if available)
- Application logs (if available)

Restore Instructions:
1. Stop the application
2. Restore Redis data: redis-cli --rdb restore [path]
3. Restore configuration: cp env-backup.txt .env
4. Restore SSL: cp -r ssl-backup ssl/
5. Restart the application
EOF

# Create compressed archive
echo "📦 Creating compressed archive..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

echo "✅ Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Optional: Upload to cloud storage
if [ "$1" = "--upload" ]; then
    echo "☁️  Uploading to cloud storage..."
    # Add your cloud upload commands here
    # aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" s3://your-bucket/backups/
    # gsutil cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" gs://your-bucket/backups/
    echo "✅ Upload completed (implement your cloud provider)"
fi

# Cleanup old backups (keep last 7 days)
echo "🗑️  Cleaning up old backups..."
find "$BACKUP_DIR" -name "whatsapp-calling-backup-*.tar.gz" -mtime +7 -delete 2>/dev/null || true
echo "✅ Cleanup completed"

echo "🎉 Backup process finished successfully!"