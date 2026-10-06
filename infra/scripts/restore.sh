#!/usr/bin/env bash
# ==============================================================================
# restore.sh - Disaster Recovery & Database / Media Restore Script
# ==============================================================================
# Usage:
#   ./infra/scripts/restore.sh [archive_file.tar.gz] [--force]
#
# If no archive file is given, the script automatically picks the newest file
# in the backups/ directory.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"
RESTORE_TMP="${BACKUP_DIR}/restore_tmp_$(date +%s)"
COMPOSE_FILE="${ROOT_DIR}/infra/docker-compose.prod.yml"

log() {
  echo -e "\033[1;34m[RESTORE $(date +'%Y-%m-%d %H:%M:%S')]\033[0m $*"
}

warn() {
  echo -e "\033[1;33m[RESTORE WARNING]\033[0m $*"
}

err() {
  echo -e "\033[1;31m[RESTORE ERROR]\033[0m $*" >&2
}

ARCHIVE_PATH="${1:-}"
FORCE=0

for arg in "$@"; do
  if [ "$arg" == "--force" ] || [ "$arg" == "-y" ]; then
    FORCE=1
  elif [ -f "$arg" ]; then
    ARCHIVE_PATH="$arg"
  fi
done

if [ -z "$ARCHIVE_PATH" ]; then
  # Pick the latest backup archive
  ARCHIVE_PATH=$(find "${BACKUP_DIR}" -name "backup_*.tar.gz" -type f | sort | tail -n 1)
  if [ -z "$ARCHIVE_PATH" ]; then
    err "No backup archive found in ${BACKUP_DIR} and none specified!"
    exit 1
  fi
fi

if [ ! -f "$ARCHIVE_PATH" ]; then
  err "Backup archive does not exist: ${ARCHIVE_PATH}"
  exit 1
fi

log "Selected backup archive: ${ARCHIVE_PATH}"

# Checksum verification
CHECKSUM_FILE="${ARCHIVE_PATH%.tar.gz}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
  log "Verifying SHA256 checksum..."
  (cd "$(dirname "$ARCHIVE_PATH")" && sha256sum -c "$(basename "$CHECKSUM_FILE")")
  log "Checksum verification passed."
else
  warn "SHA256 checksum file not found, proceeding with unverified archive."
fi

if [ $FORCE -ne 1 ]; then
  echo ""
  warn "DANGER: This operation will OVERWRITE existing database data and S3 media storage!"
  read -r -p "Are you sure you want to restore from ${ARCHIVE_PATH}? [y/N]: " confirmation
  if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
    log "Restore cancelled by user."
    exit 0
  fi
fi

mkdir -p "$RESTORE_TMP"
trap 'rm -rf "$RESTORE_TMP"' EXIT

log "Extracting archive to temporary directory..."
tar -xzf "$ARCHIVE_PATH" -C "$RESTORE_TMP"

SQL_FILE=$(find "$RESTORE_TMP" -name "*.sql" -o -name "*.dump" | head -n 1)
if [ -z "$SQL_FILE" ]; then
  err "No SQL dump file found inside archive!"
  exit 1
fi

log "Found SQL dump: $(basename "$SQL_FILE")"

# 1. Restore PostgreSQL
log "Restoring PostgreSQL database..."
if docker compose -f "$COMPOSE_FILE" ps --status running | grep -q postgres; then
  # Terminate active connections before dropping/restoring
  docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U blog -d template1 -c "
    SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'blog' AND pid <> pg_backend_pid();
  " || true

  # Drop and recreate db
  docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U blog -d template1 -c "DROP DATABASE IF EXISTS blog;"
  docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U blog -d template1 -c "CREATE DATABASE blog;"

  # Import dump
  docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U blog -d blog < "$SQL_FILE"
  log "PostgreSQL database restored successfully."
else
  warn "Postgres container is not running in prod compose. Attempting local psql restore..."
  psql -U blog -d blog < "$SQL_FILE"
fi

# 2. Restore S3 Media files if present
S3_BACKUP_DIR="${RESTORE_TMP}/s3_media"
if [ -d "$S3_BACKUP_DIR" ]; then
  log "Restoring S3 media files..."
  # If rustfs container has volume, copy files
  if docker compose -f "$COMPOSE_FILE" ps --status running | grep -q rustfs; then
    docker compose -f "$COMPOSE_FILE" cp "${S3_BACKUP_DIR}/." rustfs:/data/media/
    log "S3 media volume updated."
  fi
fi

log "Disaster recovery restore completed successfully from ${ARCHIVE_PATH}!"
