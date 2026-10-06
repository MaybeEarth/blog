#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups/db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/blog_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "📦 [$(date +'%T')] Starting PostgreSQL backup..."

# Docker container içindeki postgres üzerinden pg_dump al
docker exec -t blog-postgres-1 pg_dump -U blog -d blog | gzip > "${BACKUP_FILE}"

# SHA256 checksum hesapla
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ [$(date +'%T')] Backup completed successfully: ${BACKUP_FILE} (${FILESIZE})"

# 30 günden eski yedekleri temizle
echo "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "blog_backup_*.sql.gz*" -mtime +"${RETENTION_DAYS}" -delete

echo "🎉 All backup operations completed."
