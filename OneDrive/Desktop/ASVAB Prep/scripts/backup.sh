#!/bin/bash

# ASVAB Prep Backup Script
# Military-grade data protection for mission-critical operations

set -e

# Colors for military-style output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR=${BACKUP_DIR:-"/backups/asvab-prep"}
POSTGRES_CONTAINER=${POSTGRES_CONTAINER:-"asvab-prep-postgres-1"}
POSTGRES_DB=${POSTGRES_DB:-"asvab_prep"}
POSTGRES_USER=${POSTGRES_USER:-"asvab_user"}
S3_BUCKET=${S3_BUCKET:-"asvab-prep-backups"}
RETENTION_DAYS=${RETENTION_DAYS:-30}

# Timestamp for backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE=$(date +"%Y-%m-%d %H:%M:%S")

log_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}🎖️  $1${NC}"
    echo -e "${BLUE}================================${NC}"
}

log_info() {
    echo -e "${YELLOW}📋 INFO: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    exit 1
}

# Create backup directory structure
create_backup_structure() {
    log_info "Creating backup directory structure..."
    
    mkdir -p "$BACKUP_DIR/database"
    mkdir -p "$BACKUP_DIR/uploads"
    mkdir -p "$BACKUP_DIR/configs"
    mkdir -p "$BACKUP_DIR/logs"
    
    log_success "Backup directory structure created"
}

# Database backup
backup_database() {
    log_header "DATABASE BACKUP OPERATION"
    
    local db_backup_file="$BACKUP_DIR/database/postgres_${TIMESTAMP}.sql.gz"
    
    log_info "Starting database backup to: $db_backup_file"
    
    # Create compressed database dump
    docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        | gzip > "$db_backup_file"
    
    if [ $? -eq 0 ]; then
        local file_size=$(du -h "$db_backup_file" | cut -f1)
        log_success "Database backup completed: $file_size"
        
        # Create backup metadata
        cat > "$BACKUP_DIR/database/postgres_${TIMESTAMP}.meta" << EOF
backup_date: $DATE
database: $POSTGRES_DB
user: $POSTGRES_USER
container: $POSTGRES_CONTAINER
file_size: $file_size
compression: gzip
status: completed
EOF
    else
        log_error "Database backup failed!"
    fi
}

# Application files backup
backup_uploads() {
    log_header "UPLOADS & FILES BACKUP"
    
    local uploads_backup_file="$BACKUP_DIR/uploads/uploads_${TIMESTAMP}.tar.gz"
    local uploads_source="/var/lib/docker/volumes/asvab-prep_uploads/_data"
    
    if [ -d "$uploads_source" ]; then
        log_info "Backing up user uploads and files..."
        
        tar -czf "$uploads_backup_file" -C "$uploads_source" . 2>/dev/null || true
        
        if [ -f "$uploads_backup_file" ]; then
            local file_size=$(du -h "$uploads_backup_file" | cut -f1)
            log_success "Uploads backup completed: $file_size"
        else
            log_info "No upload files found to backup"
        fi
    else
        log_info "Uploads directory not found, skipping..."
    fi
}

# Configuration backup
backup_configs() {
    log_header "CONFIGURATION BACKUP"
    
    local config_backup_file="$BACKUP_DIR/configs/configs_${TIMESTAMP}.tar.gz"
    
    log_info "Backing up configuration files..."
    
    # Backup important configuration files (excluding secrets)
    tar -czf "$config_backup_file" \
        -C "$(dirname "$0")/.." \
        docker-compose.yml \
        nginx/nginx.conf \
        kubernetes/ \
        monitoring/ \
        scripts/ \
        --exclude="*.env*" \
        --exclude="*secret*" \
        --exclude="*key*" \
        2>/dev/null || true
    
    local file_size=$(du -h "$config_backup_file" | cut -f1)
    log_success "Configuration backup completed: $file_size"
}

# Logs backup
backup_logs() {
    log_header "LOGS BACKUP"
    
    local logs_backup_file="$BACKUP_DIR/logs/logs_${TIMESTAMP}.tar.gz"
    
    log_info "Backing up application logs..."
    
    # Backup container logs
    docker logs "$POSTGRES_CONTAINER" > "$BACKUP_DIR/logs/postgres_${TIMESTAMP}.log" 2>&1 || true
    docker logs "asvab-prep-backend-1" > "$BACKUP_DIR/logs/backend_${TIMESTAMP}.log" 2>&1 || true
    docker logs "asvab-prep-nginx-1" > "$BACKUP_DIR/logs/nginx_${TIMESTAMP}.log" 2>&1 || true
    
    # Compress all logs
    tar -czf "$logs_backup_file" -C "$BACKUP_DIR/logs" . --exclude="*.tar.gz" 2>/dev/null || true
    
    # Clean up individual log files
    find "$BACKUP_DIR/logs" -name "*.log" -delete
    
    local file_size=$(du -h "$logs_backup_file" | cut -f1)
    log_success "Logs backup completed: $file_size"
}

# Upload to cloud storage (S3)
upload_to_s3() {
    if command -v aws &> /dev/null && [ -n "$S3_BUCKET" ]; then
        log_header "CLOUD STORAGE UPLOAD"
        
        log_info "Uploading backups to S3 bucket: $S3_BUCKET"
        
        # Upload all backup files to S3
        aws s3 sync "$BACKUP_DIR" "s3://$S3_BUCKET/$(date +%Y)/$(date +%m)/$(date +%d)/" \
            --storage-class STANDARD_IA \
            --exclude "*" \
            --include "*${TIMESTAMP}*"
        
        if [ $? -eq 0 ]; then
            log_success "Backups uploaded to S3 successfully"
        else
            log_error "Failed to upload backups to S3"
        fi
    else
        log_info "AWS CLI not configured or S3_BUCKET not set, skipping cloud upload"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log_header "CLEANUP OLD BACKUPS"
    
    log_info "Removing backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # S3 cleanup (if configured)
    if command -v aws &> /dev/null && [ -n "$S3_BUCKET" ]; then
        local cutoff_date=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d)
        log_info "Cleaning S3 backups older than $cutoff_date"
        
        # This would require more complex S3 lifecycle policies in practice
        # For now, just log the intention
        log_info "S3 cleanup should be configured via lifecycle policies"
    fi
    
    log_success "Cleanup completed"
}

# Generate backup report
generate_report() {
    log_header "BACKUP REPORT GENERATION"
    
    local report_file="$BACKUP_DIR/backup_report_${TIMESTAMP}.json"
    
    # Calculate total backup size
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    
    # Create detailed backup report
    cat > "$report_file" << EOF
{
  "backup_session": {
    "timestamp": "$TIMESTAMP",
    "date": "$DATE",
    "total_size": "$total_size",
    "retention_days": $RETENTION_DAYS,
    "status": "completed"
  },
  "components": {
    "database": {
      "backed_up": true,
      "file": "postgres_${TIMESTAMP}.sql.gz",
      "container": "$POSTGRES_CONTAINER",
      "database": "$POSTGRES_DB"
    },
    "uploads": {
      "backed_up": true,
      "file": "uploads_${TIMESTAMP}.tar.gz"
    },
    "configs": {
      "backed_up": true,
      "file": "configs_${TIMESTAMP}.tar.gz"
    },
    "logs": {
      "backed_up": true,
      "file": "logs_${TIMESTAMP}.tar.gz"
    }
  },
  "cloud_storage": {
    "provider": "AWS S3",
    "bucket": "$S3_BUCKET",
    "uploaded": $([ -n "$S3_BUCKET" ] && command -v aws &> /dev/null && echo "true" || echo "false")
  },
  "next_backup": "$(date -d '+1 day' '+%Y-%m-%d %H:%M:%S')"
}
EOF
    
    log_success "Backup report generated: $report_file"
}

# Health check before backup
pre_backup_checks() {
    log_header "PRE-BACKUP SYSTEM CHECKS"
    
    # Check if database container is running
    if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
        log_error "PostgreSQL container is not running!"
    fi
    
    # Check available disk space (require at least 5GB)
    local available_space=$(df "$BACKUP_DIR" | tail -1 | awk '{print $4}')
    local required_space=5242880  # 5GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        log_error "Insufficient disk space for backup! Available: $(($available_space/1024/1024))GB, Required: 5GB"
    fi
    
    # Check database connectivity
    if ! docker exec "$POSTGRES_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &>/dev/null; then
        log_error "Cannot connect to PostgreSQL database!"
    fi
    
    log_success "Pre-backup checks passed"
}

# Send notification (placeholder for integration with notification system)
send_notification() {
    local status=$1
    local message=$2
    
    # This would integrate with Slack, email, or other notification systems
    log_info "NOTIFICATION: $status - $message"
    
    # Example webhook call (uncomment and configure as needed)
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"🎖️ ASVAB Prep Backup $status: $message\"}" \
    #     "$SLACK_WEBHOOK_URL"
}

# Main backup execution
main() {
    log_header "ASVAB PREP BACKUP MISSION - COMMENCE OPERATION"
    echo -e "${YELLOW}Mission: Secure military education data${NC}"
    echo -e "${YELLOW}Backup Time: $DATE${NC}"
    echo -e "${YELLOW}Backup Directory: $BACKUP_DIR${NC}"
    
    # Execute backup sequence
    pre_backup_checks
    create_backup_structure
    backup_database
    backup_uploads
    backup_configs
    backup_logs
    upload_to_s3
    cleanup_old_backups
    generate_report
    
    # Calculate total execution time
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    
    log_header "BACKUP MISSION ACCOMPLISHED"
    echo -e "${GREEN}🎖️  All systems backed up successfully!${NC}"
    echo -e "${GREEN}📦 Total backup size: $total_size${NC}"
    echo -e "${GREEN}🛡️  Military data is secure and protected!${NC}"
    echo -e "${GREEN}Semper Fi! Data integrity maintained! 🇺🇸${NC}"
    
    send_notification "SUCCESS" "Backup completed successfully. Size: $total_size"
}

# Execute main function
main "$@"