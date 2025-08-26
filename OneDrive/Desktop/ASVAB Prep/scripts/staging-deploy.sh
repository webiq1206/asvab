#!/bin/bash

# ASVAB Prep Staging Deployment Script
# Military-grade staging environment deployment and management

set -e

# Colors for military-style output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
ENVIRONMENT="staging"
COMPOSE_FILE="docker-compose.staging.yml"
ENV_FILE=".env.staging"
BRANCH=${DEPLOY_BRANCH:-"develop"}
ACTION=${1:-"deploy"}  # deploy, update, rollback, test, cleanup

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

log_warning() {
    echo -e "${PURPLE}⚠️  WARNING: $1${NC}"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_header "STAGING PRE-DEPLOYMENT CHECKS"
    
    # Check if required files exist
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
    fi
    
    # Check Docker availability
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
    fi
    
    # Check disk space (require at least 10GB)
    available_space=$(df . | tail -1 | awk '{print $4}')
    required_space=10485760  # 10GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        log_error "Insufficient disk space! Available: $(($available_space/1024/1024))GB, Required: 10GB"
    fi
    
    # Check if ports are available
    if netstat -tuln | grep -q ":3001 "; then
        log_warning "Port 3001 is already in use - this may cause conflicts"
    fi
    
    # Check Git branch
    if command -v git &> /dev/null; then
        current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
        log_info "Current Git branch: $current_branch"
        log_info "Deploying branch: $BRANCH"
    fi
    
    log_success "Pre-deployment checks completed"
}

# Pull latest code
pull_latest_code() {
    log_header "PULLING LATEST CODE"
    
    if command -v git &> /dev/null && [ -d ".git" ]; then
        log_info "Fetching latest changes from repository..."
        
        git fetch origin
        
        if [ "$BRANCH" != "$(git branch --show-current)" ]; then
            log_info "Switching to branch: $BRANCH"
            git checkout "$BRANCH"
        fi
        
        git pull origin "$BRANCH"
        
        # Show latest commit
        latest_commit=$(git log -1 --pretty=format:"%h - %s (%an)")
        log_info "Latest commit: $latest_commit"
        
        log_success "Code updated successfully"
    else
        log_info "Not a Git repository, skipping code pull"
    fi
}

# Build and start staging environment
deploy_staging() {
    log_header "DEPLOYING STAGING ENVIRONMENT"
    
    log_info "Building staging containers..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
    
    log_info "Starting staging services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    log_info "Waiting for services to initialize..."
    sleep 30
    
    # Wait for backend to be healthy
    log_info "Waiting for backend health check..."
    for i in {1..30}; do
        if curl -f -s http://localhost:3001/api/health >/dev/null; then
            log_success "Backend is healthy"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log_error "Backend failed to become healthy within timeout"
        fi
        
        sleep 10
    done
    
    log_success "Staging environment deployed successfully"
}

# Run database migrations and seeding
setup_database() {
    log_header "SETTING UP STAGING DATABASE"
    
    log_info "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend-staging npx prisma migrate deploy
    
    log_info "Seeding staging database with test data..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend-staging npx prisma db seed
    
    # Generate test data
    log_info "Generating additional test data..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm test-data-generator
    
    log_success "Database setup completed"
}

# Run comprehensive tests
run_tests() {
    log_header "RUNNING STAGING TESTS"
    
    # Unit tests
    log_info "Running unit tests..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend-staging npm run test
    
    # Integration tests
    log_info "Running integration tests..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend-staging npm run test:integration
    
    # API tests
    log_info "Running API tests..."
    ./smoke-test.sh http://localhost:3001
    
    # E2E tests
    log_info "Running end-to-end tests..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm e2e-tests
    
    log_success "All tests completed successfully"
}

# Health check and validation
health_check() {
    log_header "STAGING ENVIRONMENT HEALTH CHECK"
    
    # Service status
    log_info "Checking service status..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    # Application health
    log_info "Checking application health..."
    health_response=$(curl -s http://localhost:3001/api/health)
    echo "Health Response: $health_response"
    
    # Database connectivity
    log_info "Checking database connectivity..."
    db_check=$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres-staging pg_isready -U asvab_staging -d asvab_prep_staging)
    echo "Database Status: $db_check"
    
    # Redis connectivity
    log_info "Checking Redis connectivity..."
    redis_check=$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis-staging redis-cli ping)
    echo "Redis Status: $redis_check"
    
    # Load balancer check
    log_info "Checking load balancer..."
    if curl -f -s http://localhost >/dev/null; then
        log_success "Load balancer is responding"
    else
        log_warning "Load balancer check failed"
    fi
    
    # Resource usage
    log_info "Checking resource usage..."
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
    
    log_success "Health check completed"
}

# Update staging environment
update_staging() {
    log_header "UPDATING STAGING ENVIRONMENT"
    
    pull_latest_code
    
    log_info "Rebuilding containers with latest changes..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
    
    log_info "Restarting services with zero-downtime update..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate
    
    sleep 20
    health_check
    
    log_success "Staging environment updated successfully"
}

# Rollback to previous version
rollback_staging() {
    log_header "ROLLING BACK STAGING ENVIRONMENT"
    
    if command -v git &> /dev/null && [ -d ".git" ]; then
        log_info "Rolling back to previous commit..."
        git reset --hard HEAD~1
        
        update_staging
        
        log_success "Rollback completed successfully"
    else
        log_error "Cannot rollback - not a Git repository"
    fi
}

# Clean up staging environment
cleanup_staging() {
    log_header "CLEANING UP STAGING ENVIRONMENT"
    
    log_info "Stopping all staging services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    
    log_info "Removing staging volumes..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v
    
    log_info "Removing staging images..."
    docker images --filter "reference=*staging*" -q | xargs -r docker rmi -f
    
    log_info "Cleaning up Docker system..."
    docker system prune -f
    
    log_success "Staging environment cleaned up"
}

# Show staging status
show_status() {
    log_header "STAGING ENVIRONMENT STATUS"
    
    echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Branch: $BRANCH${NC}"
    echo -e "${YELLOW}Compose File: $COMPOSE_FILE${NC}"
    echo -e "${YELLOW}Environment File: $ENV_FILE${NC}"
    
    if command -v git &> /dev/null; then
        echo -e "${YELLOW}Current Commit: $(git log -1 --pretty=format:"%h - %s")${NC}"
    fi
    
    echo -e "\n${YELLOW}Service Status:${NC}"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    echo -e "\n${YELLOW}Resource Usage:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep staging
    
    echo -e "\n${YELLOW}Available Endpoints:${NC}"
    echo "🌐 Backend API: http://localhost:3001"
    echo "📊 Grafana: http://localhost:3000"
    echo "📈 Prometheus: http://localhost:9090"
    echo "🗄️  Database: localhost:5433"
    echo "🔄 Redis: localhost:6380"
}

# Generate staging report
generate_report() {
    log_header "GENERATING STAGING DEPLOYMENT REPORT"
    
    local report_file="reports/staging_deployment_$(date +%Y%m%d_%H%M%S).json"
    local deployment_date=$(date +"%Y-%m-%d %H:%M:%S")
    
    mkdir -p reports
    
    # Get service status
    local services_status=$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format json 2>/dev/null || echo "[]")
    
    # Get Git info
    local git_commit="unknown"
    local git_branch="unknown"
    if command -v git &> /dev/null && [ -d ".git" ]; then
        git_commit=$(git log -1 --pretty=format:"%H")
        git_branch=$(git branch --show-current)
    fi
    
    cat > "$report_file" << EOF
{
  "deployment_session": {
    "date": "$deployment_date",
    "environment": "$ENVIRONMENT",
    "action": "$ACTION",
    "git_branch": "$git_branch",
    "git_commit": "$git_commit",
    "status": "completed"
  },
  "services": $services_status,
  "endpoints": {
    "backend_api": "http://localhost:3001",
    "grafana": "http://localhost:3000",
    "prometheus": "http://localhost:9090",
    "database": "localhost:5433",
    "redis": "localhost:6380"
  },
  "next_steps": [
    "Run comprehensive test suite",
    "Validate all API endpoints",
    "Test mobile app integration",
    "Perform security testing",
    "Monitor performance metrics",
    "Prepare for production deployment"
  ]
}
EOF
    
    log_success "Deployment report generated: $report_file"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL_STAGING" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🎖️ ASVAB Prep Staging $status: $message\"}" \
            "$SLACK_WEBHOOK_URL_STAGING" || true
    fi
    
    log_info "NOTIFICATION: $status - $message"
}

# Show usage information
show_usage() {
    echo "🎖️ ASVAB Prep Staging Deployment System"
    echo ""
    echo "Usage: $0 [ACTION]"
    echo ""
    echo "Actions:"
    echo "  deploy   - Full staging deployment (default)"
    echo "  update   - Update existing staging environment"
    echo "  rollback - Rollback to previous version"
    echo "  test     - Run test suite only"
    echo "  health   - Health check only"
    echo "  status   - Show current status"
    echo "  cleanup  - Clean up staging environment"
    echo ""
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 update"
    echo "  $0 test"
    echo "  $0 status"
    echo ""
    echo "Environment Variables:"
    echo "  DEPLOY_BRANCH - Git branch to deploy (default: develop)"
    echo "  SLACK_WEBHOOK_URL_STAGING - Slack notification webhook"
}

# Main function
main() {
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_usage
        exit 0
    fi
    
    log_header "ASVAB PREP STAGING DEPLOYMENT - MISSION COMMENCE"
    echo -e "${YELLOW}🎖️  Staging Environment Military Operations${NC}"
    echo -e "${YELLOW}Action: $ACTION${NC}"
    echo -e "${YELLOW}Branch: $BRANCH${NC}"
    echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
    
    case "$ACTION" in
        "deploy")
            pre_deployment_checks
            pull_latest_code
            deploy_staging
            setup_database
            health_check
            generate_report
            ;;
        "update")
            update_staging
            generate_report
            ;;
        "rollback")
            rollback_staging
            generate_report
            ;;
        "test")
            run_tests
            ;;
        "health")
            health_check
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup_staging
            ;;
        *)
            log_error "Invalid action: $ACTION. Use --help for usage information."
            ;;
    esac
    
    log_header "STAGING DEPLOYMENT MISSION ACCOMPLISHED"
    echo -e "${GREEN}🎖️  Staging environment ready for testing!${NC}"
    echo -e "${GREEN}🧪 Military personnel can test new features safely!${NC}"
    echo -e "${GREEN}Semper Fi! Staging mission complete! 🇺🇸${NC}"
    
    show_status
    
    send_notification "SUCCESS" "Staging deployment completed - Action: $ACTION"
    
    echo -e "\n${YELLOW}📋 STAGING TESTING CHECKLIST:${NC}"
    echo "1. Test user registration and authentication"
    echo "2. Validate all API endpoints"
    echo "3. Test mobile app integration"
    echo "4. Verify subscription flows"
    echo "5. Test military branch filtering"
    echo "6. Validate premium features"
    echo "7. Check notification system"
    echo "8. Monitor performance metrics"
}

# Execute main function
main "$@"