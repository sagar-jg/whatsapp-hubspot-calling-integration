#!/bin/bash

# ==============================================
# Restore Script for WhatsApp Calling App
# ==============================================

set -e

if [ $# -eq 0 ]; then
    echo "❌ Usage: $0 <backup-file.tar.gz>"
    echo "   Example: $0 whatsapp-calling-backup-20231201_120000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"
RESTORE_DIR="/tmp/restore-$(date +%s)"

echo "🔄 Starting restore process..."
echo "📁 Backup file: $BACKUP_FILE"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Create restore directory
mkdir -p "$RESTORE_DIR"
echo "📁 Restore directory: $RESTORE_DIR"

# Extract backup
echo "📦 Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"
BACKUP_NAME=$(tar -tzf "$BACKUP_FILE" | head -1 | cut -f1 -d"/")
BACKUP_PATH="${RESTORE_DIR}/${BACKUP_NAME}"

echo "✅ Backup extracted to: $BACKUP_PATH"

# Show backup info
if [ -f "${BACKUP_PATH}/backup-info.txt" ]; then
    echo "📄 Backup information:"
    cat "${BACKUP_PATH}/backup-info.txt"
    echo ""
fi

# Confirm restore
read -p "⚠️  This will overwrite existing data. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    rm -rf "$RESTORE_DIR"
    exit 1
fi

# Stop application if running
echo "🛑 Stopping application..."
docker-compose down > /dev/null 2>&1 || echo "⚠️  Docker Compose not running"

# Restore Redis data
if [ -f "${BACKUP_PATH}/redis-dump.rdb" ]; then
    echo "🔴 Restoring Redis data..."
    redis-cli FLUSHALL > /dev/null 2>&1 || echo "⚠️  Redis not running"
    redis-cli --rdb "${BACKUP_PATH}/redis-dump.rdb" > /dev/null 2>&1 || echo "⚠️  Redis restore failed"
    echo "✅ Redis data restored"
else
    echo "⚠️  No Redis backup found"
fi

# Restore environment configuration
if [ -f "${BACKUP_PATH}/env-backup.txt" ]; then
    echo "⚙️  Restoring environment configuration..."
    cp "${BACKUP_PATH}/env-backup.txt" .env
    echo "✅ Environment configuration restored"
else
    echo "⚠️  No environment backup found"
fi

# Restore SSL certificates
if [ -d "${BACKUP_PATH}/ssl-backup" ]; then
    echo "🔒 Restoring SSL certificates..."
    rm -rf ssl/
    cp -r "${BACKUP_PATH}/ssl-backup" ssl/
    echo "✅ SSL certificates restored"
else
    echo "⚠️  No SSL backup found"
fi

# Restore logs
if [ -d "${BACKUP_PATH}/logs-backup" ]; then
    echo "📋 Restoring logs..."
    rm -rf backend/logs/
    cp -r "${BACKUP_PATH}/logs-backup" backend/logs/
    echo "✅ Logs restored"
else
    echo "⚠️  No logs backup found"
fi

# Start application
echo "🚀 Starting application..."
docker-compose up -d

# Wait for health check
echo "⏳ Waiting for application to start..."
sleep 10

# Verify restore
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Application is running and healthy"
else
    echo "⚠️  Application may not be fully started yet"
    echo "   Check status: docker-compose ps"
    echo "   Check logs: docker-compose logs app"
fi

# Cleanup
echo "🗑️  Cleaning up restore directory..."
rm -rf "$RESTORE_DIR"

echo "🎉 Restore completed successfully!"
echo "📋 Post-restore checklist:"
echo "   1. Verify application is running: http://localhost:3000/health"
echo "   2. Check logs: docker-compose logs app"
echo "   3. Test functionality: make a test call"
echo "   4. Verify Redis data: redis-cli ping"
echo "   5. Check SSL certificates: openssl x509 -in ssl/cert.pem -text -noout"