#!/bin/bash

# ASVAB Prep Deployment Script
# Military-grade deployment automation for production excellence

set -e

# Colors for military-themed output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Military-themed logging
log_info() {
    echo -e "${BLUE}🎖️  INFO: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

log_header() {
    echo -e "${PURPLE}============================================${NC}"
    echo -e "${PURPLE}🇺🇸 ASVAB PREP DEPLOYMENT - $1${NC}"
    echo -e "${PURPLE}============================================${NC}"
}

# Configuration
ENVIRONMENT=${1:-staging}
VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/${TIMESTAMP}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    log_error "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

log_header "DEPLOYMENT TO ${ENVIRONMENT^^}"
log_info "Version: $VERSION"
log_info "Timestamp: $TIMESTAMP"

# Pre-deployment checks
log_info "Performing pre-deployment checks..."

# Check if required files exist
required_files=(".env" "docker-compose.yml" "backend/Dockerfile")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Required file not found: $file"
        exit 1
    fi
done

log_success "All required files present"

# Check Docker availability
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed or not available"
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker is not running"
    exit 1
fi

log_success "Docker is available and running"

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    log_info "Loading environment variables from .env.${ENVIRONMENT}"
    export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    log_info "Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    log_warning "No environment file found"
fi

# Create backup directory
log_info "Creating backup directory..."
mkdir -p "$BACKUP_DIR"

# Database backup (if production)
if [ "$ENVIRONMENT" = "production" ]; then
    log_info "Creating database backup..."
    
    if [ -n "$DATABASE_URL" ]; then
        # Extract database connection details
        DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*://.*/.*/\([^?]*\).*|\1|p')
        
        docker exec asvab-postgres pg_dump -U ${POSTGRES_USER:-asvab_user} ${DB_NAME:-asvab_prep} > "${BACKUP_DIR}/database_backup.sql"
        
        if [ $? -eq 0 ]; then
            log_success "Database backup created: ${BACKUP_DIR}/database_backup.sql"
        else
            log_error "Database backup failed"
            exit 1
        fi
    else
        log_warning "DATABASE_URL not set, skipping database backup"
    fi
fi

# Stop existing containers
log_info "Stopping existing containers..."
docker-compose down --remove-orphans || true

# Pull latest images
log_info "Pulling latest images..."
docker-compose pull

# Build application
log_info "Building ASVAB Prep Backend..."
docker-compose build backend

# Run database migrations
log_info "Running database migrations..."
docker-compose run --rm backend npx prisma migrate deploy

# Seed database if specified
if [ "$SEED_DATABASE" = "true" ]; then
    log_info "Seeding database with military content..."
    docker-compose run --rm backend npx prisma db seed
fi

# Start services
log_info "Starting ASVAB Prep services..."
docker-compose up -d

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker-compose ps | grep -q "healthy"; then
        log_success "Services are healthy"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Services failed to become healthy within timeout"
        docker-compose logs
        exit 1
    fi
    
    log_info "Attempt $attempt/$max_attempts - waiting for services..."
    sleep 10
    ((attempt++))
done

# Run health checks
log_info "Running health checks..."
health_check_url="http://localhost:${BACKEND_PORT:-3001}/api/health"

if curl -f -s "$health_check_url" > /dev/null; then
    log_success "Backend health check passed"
else
    log_error "Backend health check failed"
    docker-compose logs backend
    exit 1
fi

# Run smoke tests
log_info "Running smoke tests..."
if [ -f "scripts/smoke-test.sh" ]; then
    bash scripts/smoke-test.sh
else
    log_warning "No smoke tests found"
fi

# Clean up old containers and images
log_info "Cleaning up old containers and images..."
docker image prune -f
docker container prune -f

# Generate deployment report
log_info "Generating deployment report..."
cat > "${BACKUP_DIR}/deployment_report.txt" << EOF
ASVAB Prep Deployment Report
============================
Environment: ${ENVIRONMENT}
Version: ${VERSION}
Timestamp: ${TIMESTAMP}
Deployed By: $(whoami)
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "Unknown")
Git Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "Unknown")

Services Status:
$(docker-compose ps)

Container Health:
$(docker ps --format "table {{.Names}}\t{{.Status}}")

System Resources:
$(docker system df)
EOF

log_success "Deployment report saved: ${BACKUP_DIR}/deployment_report.txt"

# Final success message
log_header "DEPLOYMENT COMPLETE"
log_success "ASVAB Prep ${VERSION} deployed successfully to ${ENVIRONMENT}"
log_success "Backend URL: http://localhost:${BACKEND_PORT:-3001}"
log_success "Health Check: ${health_check_url}"

if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${GREEN}"
    echo "🎖️  MISSION ACCOMPLISHED! 🎖️"
    echo "The ASVAB Prep platform is now serving military personnel"
    echo "with excellence and dedication to their career success!"
    echo "Semper Fi! 🇺🇸"
    echo -e "${NC}"
else
    echo -e "${BLUE}"
    echo "🔧 STAGING DEPLOYMENT COMPLETE 🔧"
    echo "Ready for testing and validation!"
    echo "Hooah! 🎯"
    echo -e "${NC}"
fi

# Show running services
log_info "Running services:"
docker-compose ps