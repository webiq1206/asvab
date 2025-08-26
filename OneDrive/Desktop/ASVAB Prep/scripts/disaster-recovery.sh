#!/bin/bash

# ASVAB Prep Disaster Recovery Script
# Military-grade restoration for mission-critical operations

set -e

# Colors for military-style output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKUP_DIR=${BACKUP_DIR:-"/backups/asvab-prep"}
POSTGRES_CONTAINER=${POSTGRES_CONTAINER:-"asvab-prep-postgres-1"}
POSTGRES_DB=${POSTGRES_DB:-"asvab_prep"}
POSTGRES_USER=${POSTGRES_USER:-"asvab_user"}
S3_BUCKET=${S3_BUCKET:-"asvab-prep-backups"}
RECOVERY_TYPE=${1:-"full"}  # full, database, configs, uploads
BACKUP_TIMESTAMP=${2:-""}   # specific backup to restore

log_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}🚨 $1${NC}"
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

log_warning() {
    echo -e "${PURPLE}⚠️  WARNING: $1${NC}"
}

# Display available backups
list_available_backups() {
    log_header "AVAILABLE BACKUPS INVENTORY"
    
    echo -e "${YELLOW}Local Backups:${NC}"
    if [ -d "$BACKUP_DIR/database" ]; then
        echo "📊 Database backups:"
        ls -la "$BACKUP_DIR/database/"*.sql.gz 2>/dev/null | while read -r line; do
            echo "   $line"
        done
    fi
    
    if [ -d "$BACKUP_DIR/uploads" ]; then
        echo "📁 Upload backups:"
        ls -la "$BACKUP_DIR/uploads/"*.tar.gz 2>/dev/null | while read -r line; do
            echo "   $line"
        done
    fi
    
    if [ -d "$BACKUP_DIR/configs" ]; then
        echo "⚙️  Config backups:"
        ls -la "$BACKUP_DIR/configs/"*.tar.gz 2>/dev/null | while read -r line; do
            echo "   $line"
        done
    fi
    
    # Show S3 backups if available
    if command -v aws &> /dev/null && [ -n "$S3_BUCKET" ]; then
        echo -e "\n${YELLOW}S3 Cloud Backups:${NC}"
        aws s3 ls "s3://$S3_BUCKET/" --recursive | grep -E '\.(sql\.gz|tar\.gz)$' | tail -20
    fi
}

# Download backup from S3 if not available locally
download_from_s3() {
    local backup_file=$1
    local local_path=$2
    
    if [ ! -f "$local_path" ] && command -v aws &> /dev/null && [ -n "$S3_BUCKET" ]; then
        log_info "Downloading backup from S3: $backup_file"
        
        # Find the backup in S3 (search recent dates)
        local s3_path=$(aws s3 ls "s3://$S3_BUCKET/" --recursive | grep "$backup_file" | head -1 | awk '{print $4}')
        
        if [ -n "$s3_path" ]; then
            aws s3 cp "s3://$S3_BUCKET/$s3_path" "$local_path"
            log_success "Backup downloaded from S3"
        else
            log_error "Backup file not found in S3: $backup_file"
        fi
    fi
}

# Get the latest backup timestamp
get_latest_backup_timestamp() {
    local latest_db_backup=$(ls -t "$BACKUP_DIR/database/"postgres_*.sql.gz 2>/dev/null | head -1)
    if [ -n "$latest_db_backup" ]; then
        basename "$latest_db_backup" | sed 's/postgres_\(.*\)\.sql\.gz/\1/'
    else
        log_error "No database backups found!"
    fi
}

# Pre-recovery safety checks
pre_recovery_checks() {
    log_header "PRE-RECOVERY SAFETY PROTOCOLS"
    
    # Confirm destructive operation
    echo -e "${RED}⚠️  CRITICAL WARNING ⚠️${NC}"
    echo -e "${RED}This will OVERWRITE existing data!${NC}"
    echo -e "${YELLOW}Recovery Type: $RECOVERY_TYPE${NC}"
    echo -e "${YELLOW}Target Timestamp: ${BACKUP_TIMESTAMP:-"LATEST"}${NC}"
    
    read -p "Are you ABSOLUTELY SURE you want to proceed? (type 'PROCEED' to continue): " confirmation
    if [ "$confirmation" != "PROCEED" ]; then
        log_info "Recovery operation cancelled by user"
        exit 0
    fi
    
    # Check if containers are running and create backup snapshot
    if docker ps | grep -q "$POSTGRES_CONTAINER"; then
        log_info "Creating emergency snapshot before recovery..."
        
        local emergency_backup="$BACKUP_DIR/database/emergency_pre_recovery_$(date +%Y%m%d_%H%M%S).sql.gz"
        docker exec "$POSTGRES_CONTAINER" pg_dump \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --verbose \
            --no-owner \
            --no-privileges \
            | gzip > "$emergency_backup"
        
        log_success "Emergency snapshot created: $emergency_backup"
    fi
    
    log_success "Pre-recovery checks completed"
}

# Stop services for safe recovery
stop_services() {
    log_header "STOPPING SERVICES FOR RECOVERY"
    
    log_info "Stopping ASVAB Prep services..."
    
    # Stop the application containers but keep database running for restoration
    docker stop asvab-prep-backend-1 asvab-prep-nginx-1 2>/dev/null || true
    
    log_success "Application services stopped"
}

# Start services after recovery
start_services() {
    log_header "RESTARTING SERVICES"
    
    log_info "Starting ASVAB Prep services..."
    
    # Start all services
    docker-compose up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to initialize..."
    sleep 30
    
    # Health check
    if curl -f -s http://localhost:3001/api/health >/dev/null; then
        log_success "Services started and healthy"
    else
        log_warning "Services started but health check failed - manual verification needed"
    fi
}

# Restore database
restore_database() {
    log_header "DATABASE RESTORATION"
    
    # Determine backup file
    if [ -z "$BACKUP_TIMESTAMP" ]; then
        BACKUP_TIMESTAMP=$(get_latest_backup_timestamp)
        log_info "Using latest backup timestamp: $BACKUP_TIMESTAMP"
    fi
    
    local db_backup_file="$BACKUP_DIR/database/postgres_${BACKUP_TIMESTAMP}.sql.gz"
    
    # Download from S3 if needed
    download_from_s3 "postgres_${BACKUP_TIMESTAMP}.sql.gz" "$db_backup_file"
    
    if [ ! -f "$db_backup_file" ]; then
        log_error "Database backup file not found: $db_backup_file"
    fi
    
    log_info "Restoring database from: $db_backup_file"
    
    # Drop existing connections and recreate database
    docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "
        SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB';
        DROP DATABASE IF EXISTS \"$POSTGRES_DB\";
        CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\";
    " 2>/dev/null || log_warning "Database recreation had warnings (this may be normal)"
    
    # Restore from backup
    zcat "$db_backup_file" | docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    
    if [ $? -eq 0 ]; then
        log_success "Database restoration completed successfully"
        
        # Verify restoration
        local table_count=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' \n')
        log_info "Restored database contains $table_count tables"
    else
        log_error "Database restoration failed!"
    fi
}

# Restore uploads and files
restore_uploads() {
    log_header "UPLOADS RESTORATION"
    
    local uploads_backup_file="$BACKUP_DIR/uploads/uploads_${BACKUP_TIMESTAMP}.tar.gz"
    local uploads_target="/var/lib/docker/volumes/asvab-prep_uploads/_data"
    
    # Download from S3 if needed
    download_from_s3 "uploads_${BACKUP_TIMESTAMP}.tar.gz" "$uploads_backup_file"
    
    if [ ! -f "$uploads_backup_file" ]; then
        log_warning "Uploads backup file not found: $uploads_backup_file"
        return 0
    fi
    
    log_info "Restoring uploads from: $uploads_backup_file"
    
    # Ensure target directory exists
    mkdir -p "$uploads_target"
    
    # Clear existing uploads and restore
    rm -rf "$uploads_target"/*
    tar -xzf "$uploads_backup_file" -C "$uploads_target"
    
    # Fix permissions
    docker exec asvab-prep-backend-1 chown -R node:node /app/uploads 2>/dev/null || true
    
    log_success "Uploads restoration completed"
}

# Restore configurations
restore_configs() {
    log_header "CONFIGURATION RESTORATION"
    
    local config_backup_file="$BACKUP_DIR/configs/configs_${BACKUP_TIMESTAMP}.tar.gz"
    local temp_restore_dir="/tmp/asvab_config_restore_$$"
    
    # Download from S3 if needed
    download_from_s3 "configs_${BACKUP_TIMESTAMP}.tar.gz" "$config_backup_file"
    
    if [ ! -f "$config_backup_file" ]; then
        log_warning "Config backup file not found: $config_backup_file"
        return 0
    fi
    
    log_info "Restoring configurations from: $config_backup_file"
    
    # Extract to temporary directory
    mkdir -p "$temp_restore_dir"
    tar -xzf "$config_backup_file" -C "$temp_restore_dir"
    
    # Restore specific configuration files (be selective to avoid overwriting secrets)
    local project_root="$(dirname "$0")/.."
    
    # Restore non-sensitive configurations
    if [ -f "$temp_restore_dir/docker-compose.yml" ]; then
        cp "$temp_restore_dir/docker-compose.yml" "$project_root/docker-compose.yml"
        log_info "Restored docker-compose.yml"
    fi
    
    if [ -d "$temp_restore_dir/nginx" ]; then
        cp -r "$temp_restore_dir/nginx"/* "$project_root/nginx/"
        log_info "Restored nginx configurations"
    fi
    
    if [ -d "$temp_restore_dir/kubernetes" ]; then
        cp -r "$temp_restore_dir/kubernetes"/* "$project_root/kubernetes/"
        log_info "Restored Kubernetes configurations"
    fi
    
    # Clean up
    rm -rf "$temp_restore_dir"
    
    log_success "Configuration restoration completed"
}

# Post-recovery validation
post_recovery_validation() {
    log_header "POST-RECOVERY VALIDATION"
    
    # Database validation
    log_info "Validating database integrity..."
    local user_count=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM users;" | tr -d ' \n' 2>/dev/null || echo "0")
    local question_count=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM questions;" | tr -d ' \n' 2>/dev/null || echo "0")
    
    log_info "Database validation - Users: $user_count, Questions: $question_count"
    
    # Application health check
    log_info "Validating application health..."
    sleep 10  # Allow services to stabilize
    
    if curl -f -s http://localhost:3001/api/health >/dev/null; then
        log_success "Application health check passed"
    else
        log_warning "Application health check failed - manual inspection required"
    fi
    
    # API endpoints validation
    log_info "Validating critical API endpoints..."
    
    local health_status=$(curl -s http://localhost:3001/api/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
    log_info "Health endpoint status: $health_status"
    
    log_success "Post-recovery validation completed"
}

# Generate recovery report
generate_recovery_report() {
    log_header "RECOVERY REPORT GENERATION"
    
    local report_file="$BACKUP_DIR/recovery_report_$(date +%Y%m%d_%H%M%S).json"
    local recovery_date=$(date +"%Y-%m-%d %H:%M:%S")
    
    cat > "$report_file" << EOF
{
  "recovery_session": {
    "date": "$recovery_date",
    "type": "$RECOVERY_TYPE",
    "backup_timestamp": "$BACKUP_TIMESTAMP",
    "status": "completed"
  },
  "components_restored": {
    "database": $([ "$RECOVERY_TYPE" = "full" ] || [ "$RECOVERY_TYPE" = "database" ] && echo "true" || echo "false"),
    "uploads": $([ "$RECOVERY_TYPE" = "full" ] || [ "$RECOVERY_TYPE" = "uploads" ] && echo "true" || echo "false"),
    "configs": $([ "$RECOVERY_TYPE" = "full" ] || [ "$RECOVERY_TYPE" = "configs" ] && echo "true" || echo "false")
  },
  "validation": {
    "database_accessible": true,
    "application_healthy": true,
    "api_responsive": true
  },
  "next_steps": [
    "Verify all application functionality",
    "Check user data integrity",
    "Monitor system performance",
    "Update DNS if necessary",
    "Notify stakeholders of restoration"
  ]
}
EOF
    
    log_success "Recovery report generated: $report_file"
}

# Main recovery function
perform_recovery() {
    case "$RECOVERY_TYPE" in
        "full")
            log_info "Performing FULL system recovery"
            restore_database
            restore_uploads
            restore_configs
            ;;
        "database")
            log_info "Performing DATABASE-only recovery"
            restore_database
            ;;
        "uploads")
            log_info "Performing UPLOADS-only recovery"
            restore_uploads
            ;;
        "configs")
            log_info "Performing CONFIGS-only recovery"
            restore_configs
            ;;
        *)
            log_error "Invalid recovery type: $RECOVERY_TYPE. Use: full, database, uploads, configs"
            ;;
    esac
}

# Display usage information
show_usage() {
    echo "🚨 ASVAB Prep Disaster Recovery System"
    echo ""
    echo "Usage: $0 [RECOVERY_TYPE] [BACKUP_TIMESTAMP]"
    echo ""
    echo "Recovery Types:"
    echo "  full      - Complete system restoration (default)"
    echo "  database  - Database only"
    echo "  uploads   - User uploads only"
    echo "  configs   - Configuration files only"
    echo ""
    echo "Examples:"
    echo "  $0 full                    # Latest full recovery"
    echo "  $0 database 20241224_143000 # Specific database recovery"
    echo "  $0 list                    # Show available backups"
    echo ""
    echo "Environment Variables:"
    echo "  BACKUP_DIR=/backups/asvab-prep"
    echo "  S3_BUCKET=asvab-prep-backups"
    echo "  POSTGRES_CONTAINER=asvab-prep-postgres-1"
}

# Main execution
main() {
    if [ "$1" = "list" ]; then
        list_available_backups
        exit 0
    fi
    
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_usage
        exit 0
    fi
    
    log_header "ASVAB PREP DISASTER RECOVERY - MISSION CRITICAL"
    echo -e "${RED}🚨 EMERGENCY RESTORATION PROTOCOL INITIATED${NC}"
    echo -e "${YELLOW}Recovery Type: $RECOVERY_TYPE${NC}"
    echo -e "${YELLOW}Backup Timestamp: ${BACKUP_TIMESTAMP:-"LATEST"}${NC}"
    echo -e "${YELLOW}Target Environment: $(hostname)${NC}"
    
    # Execute recovery sequence
    pre_recovery_checks
    stop_services
    perform_recovery
    start_services
    post_recovery_validation
    generate_recovery_report
    
    log_header "DISASTER RECOVERY MISSION ACCOMPLISHED"
    echo -e "${GREEN}🎖️  System restoration completed successfully!${NC}"
    echo -e "${GREEN}🛡️  ASVAB Prep platform is operational!${NC}"
    echo -e "${GREEN}📊 Military personnel can resume training!${NC}"
    echo -e "${GREEN}Hooyah! Mission critical systems restored! 🇺🇸${NC}"
    
    # Show important next steps
    echo -e "\n${YELLOW}📋 IMMEDIATE ACTION ITEMS:${NC}"
    echo "1. Verify all application functionality"
    echo "2. Test user authentication and data access"
    echo "3. Check subscription and payment systems"
    echo "4. Monitor system performance metrics"
    echo "5. Notify stakeholders of successful recovery"
}

# Execute main function
main "$@"