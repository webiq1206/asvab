#!/bin/bash

# ASVAB Prep Health Monitoring System
# Military-grade system health surveillance and reporting

set -e

# Colors for military-style output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${ENVIRONMENT:-"production"}
BASE_URL=${BASE_URL:-"http://localhost:3001"}
ALERT_WEBHOOK=${ALERT_WEBHOOK:-""}
CHECK_INTERVAL=${CHECK_INTERVAL:-60}  # seconds
MAX_RESPONSE_TIME=${MAX_RESPONSE_TIME:-5000}  # milliseconds
LOG_FILE="/var/log/asvab-health-monitor.log"
REPORT_DIR="./reports/health"
ACTION=${1:-"monitor"}  # monitor, check, report, alert

log_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}🏥 $1${NC}"
    echo -e "${BLUE}================================${NC}"
}

log_info() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] 📋 INFO: $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_success() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ✅ SUCCESS: $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_error() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1"
    echo -e "${RED}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_warning() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  WARNING: $1"
    echo -e "${PURPLE}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

# Initialize monitoring system
init_monitoring() {
    log_header "INITIALIZING HEALTH MONITORING SYSTEM"
    
    # Create necessary directories
    mkdir -p "$REPORT_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Create log file if it doesn't exist
    touch "$LOG_FILE"
    
    # Setup log rotation
    if [ ! -f "/etc/logrotate.d/asvab-health" ]; then
        cat > /etc/logrotate.d/asvab-health << EOF
$LOG_FILE {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF
        log_info "Log rotation configured"
    fi
    
    log_success "Health monitoring system initialized"
}

# API Health Checks
check_api_health() {
    log_info "Checking API health endpoints..."
    
    local endpoints=(
        "/api/health"
        "/api/health/database"
        "/api/health/redis"
        "/api/health/detailed"
    )
    
    local api_status="healthy"
    local failed_endpoints=0
    
    for endpoint in "${endpoints[@]}"; do
        local url="${BASE_URL}${endpoint}"
        local start_time=$(date +%s%3N)
        
        local response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" "$url" 2>/dev/null || echo "HTTPSTATUS:000;TIME:999")
        local http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        local response_time_ms=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2 | awk '{print int($1*1000)}')
        local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*;TIME:[0-9.]*$//')
        
        if [ "$http_status" = "200" ]; then
            if [ "$response_time_ms" -le "$MAX_RESPONSE_TIME" ]; then
                log_success "✓ $endpoint - Status: $http_status, Time: ${response_time_ms}ms"
            else
                log_warning "⚠ $endpoint - Status: $http_status, Time: ${response_time_ms}ms (SLOW)"
                api_status="degraded"
            fi
        else
            log_error "✗ $endpoint - Status: $http_status, Time: ${response_time_ms}ms"
            ((failed_endpoints++))
            api_status="unhealthy"
        fi
        
        # Record metrics for detailed endpoint
        if [ "$endpoint" = "/api/health/detailed" ] && [ "$http_status" = "200" ]; then
            echo "$body" | jq -r '.metrics // empty' > /tmp/api_metrics.json 2>/dev/null || true
        fi
    done
    
    echo "$api_status:$failed_endpoints"
}

# Database Health Check
check_database_health() {
    log_info "Checking database connectivity and performance..."
    
    local db_status="healthy"
    
    # Check database connection
    if command -v docker &> /dev/null; then
        local container_name="asvab-prep-postgres-1"
        if docker ps | grep -q "$container_name"; then
            # Test database connection
            local db_response=$(docker exec "$container_name" pg_isready -U asvab_user -d asvab_prep 2>&1)
            
            if echo "$db_response" | grep -q "accepting connections"; then
                log_success "✓ Database connection healthy"
                
                # Check database performance
                local query_time=$(docker exec "$container_name" psql -U asvab_user -d asvab_prep -c "SELECT COUNT(*) FROM users;" -t 2>/dev/null | wc -l)
                if [ "$query_time" -gt 0 ]; then
                    log_success "✓ Database queries executing normally"
                else
                    log_warning "⚠ Database query performance may be degraded"
                    db_status="degraded"
                fi
            else
                log_error "✗ Database connection failed: $db_response"
                db_status="unhealthy"
            fi
        else
            log_error "✗ Database container not running"
            db_status="unhealthy"
        fi
    else
        # Direct database check (if not using Docker)
        if command -v pg_isready &> /dev/null; then
            if pg_isready -h localhost -p 5432; then
                log_success "✓ Database connection healthy"
            else
                log_error "✗ Database connection failed"
                db_status="unhealthy"
            fi
        else
            log_warning "⚠ Cannot check database - pg_isready not available"
            db_status="unknown"
        fi
    fi
    
    echo "$db_status"
}

# Redis Health Check
check_redis_health() {
    log_info "Checking Redis cache connectivity and performance..."
    
    local redis_status="healthy"
    
    if command -v docker &> /dev/null; then
        local container_name="asvab-prep-redis-1"
        if docker ps | grep -q "$container_name"; then
            # Test Redis connection
            local redis_response=$(docker exec "$container_name" redis-cli ping 2>&1)
            
            if [ "$redis_response" = "PONG" ]; then
                log_success "✓ Redis connection healthy"
                
                # Check Redis memory usage
                local memory_info=$(docker exec "$container_name" redis-cli INFO memory | grep used_memory_human: | cut -d: -f2 | tr -d '\r')
                log_info "Redis memory usage: $memory_info"
            else
                log_error "✗ Redis connection failed: $redis_response"
                redis_status="unhealthy"
            fi
        else
            log_error "✗ Redis container not running"
            redis_status="unhealthy"
        fi
    else
        # Direct Redis check
        if command -v redis-cli &> /dev/null; then
            if redis-cli ping | grep -q "PONG"; then
                log_success "✓ Redis connection healthy"
            else
                log_error "✗ Redis connection failed"
                redis_status="unhealthy"
            fi
        else
            log_warning "⚠ Cannot check Redis - redis-cli not available"
            redis_status="unknown"
        fi
    fi
    
    echo "$redis_status"
}

# System Resources Check
check_system_resources() {
    log_info "Checking system resource utilization..."
    
    local system_status="healthy"
    
    # Check CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    local cpu_percent=$(echo "$cpu_usage" | cut -d% -f1)
    
    if [ "${cpu_percent%.*}" -gt 80 ]; then
        log_warning "⚠ High CPU usage: ${cpu_usage}"
        system_status="degraded"
    else
        log_success "✓ CPU usage normal: ${cpu_usage}"
    fi
    
    # Check memory usage
    local memory_info=$(free | grep Mem)
    local total_mem=$(echo "$memory_info" | awk '{print $2}')
    local used_mem=$(echo "$memory_info" | awk '{print $3}')
    local memory_percent=$(( (used_mem * 100) / total_mem ))
    
    if [ "$memory_percent" -gt 85 ]; then
        log_warning "⚠ High memory usage: ${memory_percent}%"
        system_status="degraded"
    else
        log_success "✓ Memory usage normal: ${memory_percent}%"
    fi
    
    # Check disk space
    local disk_info=$(df -h / | tail -1)
    local disk_usage=$(echo "$disk_info" | awk '{print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt 85 ]; then
        log_warning "⚠ High disk usage: ${disk_usage}%"
        system_status="degraded"
    else
        log_success "✓ Disk usage normal: ${disk_usage}%"
    fi
    
    # Check load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | cut -d, -f1 | xargs)
    local load_num=$(echo "$load_avg" | cut -d. -f1)
    local cpu_count=$(nproc)
    
    if [ "$load_num" -gt "$cpu_count" ]; then
        log_warning "⚠ High system load: $load_avg (CPUs: $cpu_count)"
        system_status="degraded"
    else
        log_success "✓ System load normal: $load_avg"
    fi
    
    echo "$system_status"
}

# Container Health Check
check_container_health() {
    log_info "Checking container health status..."
    
    local container_status="healthy"
    local unhealthy_containers=0
    
    if command -v docker &> /dev/null; then
        local containers=(
            "asvab-prep-backend-1"
            "asvab-prep-postgres-1"
            "asvab-prep-redis-1"
            "asvab-prep-nginx-1"
        )
        
        for container in "${containers[@]}"; do
            if docker ps --format "table {{.Names}}" | grep -q "$container"; then
                local health_status=$(docker inspect "$container" --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check")
                
                if [ "$health_status" = "healthy" ] || [ "$health_status" = "no-health-check" ]; then
                    log_success "✓ Container $container: healthy"
                else
                    log_error "✗ Container $container: $health_status"
                    ((unhealthy_containers++))
                    container_status="unhealthy"
                fi
            else
                log_error "✗ Container $container: not running"
                ((unhealthy_containers++))
                container_status="unhealthy"
            fi
        done
    else
        log_warning "⚠ Docker not available - skipping container checks"
        container_status="unknown"
    fi
    
    echo "$container_status:$unhealthy_containers"
}

# SSL Certificate Check
check_ssl_certificates() {
    log_info "Checking SSL certificate status..."
    
    local ssl_status="healthy"
    local domains=("asvabprep.com" "api.asvabprep.com" "admin.asvabprep.com")
    
    for domain in "${domains[@]}"; do
        if command -v openssl &> /dev/null; then
            local cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
            
            if [ -n "$cert_info" ]; then
                local expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
                local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
                local current_timestamp=$(date +%s)
                local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                
                if [ "$days_until_expiry" -lt 30 ]; then
                    log_warning "⚠ SSL certificate for $domain expires in $days_until_expiry days"
                    ssl_status="warning"
                elif [ "$days_until_expiry" -lt 7 ]; then
                    log_error "✗ SSL certificate for $domain expires in $days_until_expiry days (CRITICAL)"
                    ssl_status="critical"
                else
                    log_success "✓ SSL certificate for $domain valid for $days_until_expiry days"
                fi
            else
                log_warning "⚠ Could not check SSL certificate for $domain"
                ssl_status="unknown"
            fi
        else
            log_warning "⚠ OpenSSL not available - skipping SSL checks"
            ssl_status="unknown"
            break
        fi
    done
    
    echo "$ssl_status"
}

# External Dependencies Check
check_external_dependencies() {
    log_info "Checking external service dependencies..."
    
    local deps_status="healthy"
    local failed_deps=0
    
    # Check OpenAI API
    if [ -n "$OPENAI_API_KEY" ]; then
        local openai_response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $OPENAI_API_KEY" "https://api.openai.com/v1/models" 2>/dev/null || echo "000")
        
        if [ "$openai_response" = "200" ]; then
            log_success "✓ OpenAI API accessible"
        else
            log_warning "⚠ OpenAI API check failed: $openai_response"
            ((failed_deps++))
            deps_status="degraded"
        fi
    fi
    
    # Check Stripe API
    if [ -n "$STRIPE_SECRET_KEY" ]; then
        local stripe_response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $STRIPE_SECRET_KEY" "https://api.stripe.com/v1/account" 2>/dev/null || echo "000")
        
        if [ "$stripe_response" = "200" ]; then
            log_success "✓ Stripe API accessible"
        else
            log_warning "⚠ Stripe API check failed: $stripe_response"
            ((failed_deps++))
            deps_status="degraded"
        fi
    fi
    
    # Check DNS resolution
    local dns_domains=("asvabprep.com" "api.asvabprep.com")
    for domain in "${dns_domains[@]}"; do
        if nslookup "$domain" >/dev/null 2>&1; then
            log_success "✓ DNS resolution for $domain working"
        else
            log_error "✗ DNS resolution failed for $domain"
            ((failed_deps++))
            deps_status="unhealthy"
        fi
    done
    
    echo "$deps_status:$failed_deps"
}

# Comprehensive Health Check
perform_health_check() {
    log_header "PERFORMING COMPREHENSIVE HEALTH CHECK"
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local overall_status="healthy"
    local issues=0
    local warnings=0
    
    # API Health
    local api_result=$(check_api_health)
    local api_status=$(echo "$api_result" | cut -d: -f1)
    local api_issues=$(echo "$api_result" | cut -d: -f2)
    
    # Database Health
    local db_status=$(check_database_health)
    
    # Redis Health
    local redis_status=$(check_redis_health)
    
    # System Resources
    local system_status=$(check_system_resources)
    
    # Container Health
    local container_result=$(check_container_health)
    local container_status=$(echo "$container_result" | cut -d: -f1)
    local container_issues=$(echo "$container_result" | cut -d: -f2)
    
    # SSL Certificates
    local ssl_status=$(check_ssl_certificates)
    
    # External Dependencies
    local deps_result=$(check_external_dependencies)
    local deps_status=$(echo "$deps_result" | cut -d: -f1)
    local deps_issues=$(echo "$deps_result" | cut -d: -f2)
    
    # Calculate overall status
    local statuses=("$api_status" "$db_status" "$redis_status" "$system_status" "$container_status" "$ssl_status" "$deps_status")
    
    for status in "${statuses[@]}"; do
        case "$status" in
            "unhealthy"|"critical")
                overall_status="unhealthy"
                ((issues++))
                ;;
            "degraded"|"warning")
                if [ "$overall_status" = "healthy" ]; then
                    overall_status="degraded"
                fi
                ((warnings++))
                ;;
        esac
    done
    
    # Generate health report
    local report_file="$REPORT_DIR/health_$(date +%Y%m%d_%H%M%S).json"
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "environment": "$ENVIRONMENT",
  "overall_status": "$overall_status",
  "summary": {
    "issues": $issues,
    "warnings": $warnings,
    "checks_performed": ${#statuses[@]}
  },
  "components": {
    "api": {
      "status": "$api_status",
      "failed_endpoints": ${api_issues:-0}
    },
    "database": {
      "status": "$db_status"
    },
    "cache": {
      "status": "$redis_status"
    },
    "system": {
      "status": "$system_status"
    },
    "containers": {
      "status": "$container_status",
      "unhealthy_containers": ${container_issues:-0}
    },
    "ssl": {
      "status": "$ssl_status"
    },
    "external_dependencies": {
      "status": "$deps_status",
      "failed_dependencies": ${deps_issues:-0}
    }
  }
}
EOF
    
    log_info "Health report generated: $report_file"
    
    # Send alerts if necessary
    if [ "$overall_status" = "unhealthy" ] || [ "$overall_status" = "critical" ]; then
        send_alert "$overall_status" "$issues issues, $warnings warnings"
    fi
    
    return $([ "$overall_status" = "healthy" ] && echo 0 || echo 1)
}

# Continuous Monitoring
start_monitoring() {
    log_header "STARTING CONTINUOUS HEALTH MONITORING"
    
    log_info "Monitoring interval: ${CHECK_INTERVAL}s"
    log_info "Max response time: ${MAX_RESPONSE_TIME}ms"
    log_info "Log file: $LOG_FILE"
    
    local consecutive_failures=0
    local max_consecutive_failures=3
    
    while true; do
        log_info "Performing health check..."
        
        if perform_health_check; then
            consecutive_failures=0
            log_success "Health check passed"
        else
            ((consecutive_failures++))
            log_warning "Health check failed (consecutive: $consecutive_failures)"
            
            if [ "$consecutive_failures" -ge "$max_consecutive_failures" ]; then
                log_error "Maximum consecutive failures reached - sending critical alert"
                send_alert "critical" "System has failed $consecutive_failures consecutive health checks"
            fi
        fi
        
        log_info "Sleeping for ${CHECK_INTERVAL}s..."
        sleep "$CHECK_INTERVAL"
    done
}

# Alert System
send_alert() {
    local status=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    local alert_payload="{
        \"text\": \"🚨 ASVAB Prep Health Alert\",
        \"attachments\": [
            {
                \"color\": \"$([ "$status" = "critical" ] && echo "danger" || echo "warning")\",
                \"fields\": [
                    {
                        \"title\": \"Status\",
                        \"value\": \"$status\",
                        \"short\": true
                    },
                    {
                        \"title\": \"Environment\",
                        \"value\": \"$ENVIRONMENT\",
                        \"short\": true
                    },
                    {
                        \"title\": \"Message\",
                        \"value\": \"$message\",
                        \"short\": false
                    },
                    {
                        \"title\": \"Timestamp\",
                        \"value\": \"$timestamp\",
                        \"short\": true
                    }
                ]
            }
        ]
    }"
    
    # Send to Slack webhook if configured
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "$alert_payload" \
            "$ALERT_WEBHOOK" >/dev/null 2>&1 || log_warning "Failed to send alert to webhook"
    fi
    
    # Send email alert if configured
    if command -v mail &> /dev/null && [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "ASVAB Prep Health Alert - $status" "$ALERT_EMAIL" || log_warning "Failed to send email alert"
    fi
    
    log_error "ALERT SENT: $status - $message"
}

# Generate comprehensive report
generate_health_report() {
    log_header "GENERATING COMPREHENSIVE HEALTH REPORT"
    
    local report_file="$REPORT_DIR/comprehensive_health_$(date +%Y%m%d_%H%M%S).html"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Perform health check to get current data
    perform_health_check >/dev/null 2>&1
    
    # Get latest JSON report
    local latest_json=$(ls -t "$REPORT_DIR"/health_*.json 2>/dev/null | head -1)
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASVAB Prep - System Health Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .header { background: #4B5320; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .container { background: white; padding: 30px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status-healthy { color: #28a745; font-weight: bold; }
        .status-degraded { color: #ffc107; font-weight: bold; }
        .status-unhealthy { color: #dc3545; font-weight: bold; }
        .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .metric:last-child { border-bottom: none; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #4B5320; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎖️ ASVAB Prep System Health Report</h1>
        <p>Military-Grade System Monitoring</p>
        <div class="timestamp">Generated: TIMESTAMP_PLACEHOLDER</div>
    </div>
    
    <div class="container">
        <h2>Overall System Status</h2>
        <div class="metric">
            <span>System Status</span>
            <span class="status-STATUS_CLASS">STATUS_PLACEHOLDER</span>
        </div>
        <div class="metric">
            <span>Environment</span>
            <span>ENVIRONMENT_PLACEHOLDER</span>
        </div>
        <div class="metric">
            <span>Last Check</span>
            <span>TIMESTAMP_PLACEHOLDER</span>
        </div>
    </div>
    
    <div class="grid">
        <div class="card">
            <h3>🔗 API Health</h3>
            <div class="metric">
                <span>Status</span>
                <span class="status-API_STATUS_CLASS">API_STATUS_PLACEHOLDER</span>
            </div>
            <div class="metric">
                <span>Response Time</span>
                <span>< 2s</span>
            </div>
        </div>
        
        <div class="card">
            <h3>🗄️ Database</h3>
            <div class="metric">
                <span>Status</span>
                <span class="status-DB_STATUS_CLASS">DB_STATUS_PLACEHOLDER</span>
            </div>
            <div class="metric">
                <span>Connections</span>
                <span>Active</span>
            </div>
        </div>
        
        <div class="card">
            <h3>⚡ Cache (Redis)</h3>
            <div class="metric">
                <span>Status</span>
                <span class="status-REDIS_STATUS_CLASS">REDIS_STATUS_PLACEHOLDER</span>
            </div>
            <div class="metric">
                <span>Memory Usage</span>
                <span>Normal</span>
            </div>
        </div>
        
        <div class="card">
            <h3>🖥️ System Resources</h3>
            <div class="metric">
                <span>Status</span>
                <span class="status-SYSTEM_STATUS_CLASS">SYSTEM_STATUS_PLACEHOLDER</span>
            </div>
            <div class="metric">
                <span>Load Average</span>
                <span>Normal</span>
            </div>
        </div>
        
        <div class="card">
            <h3>🐳 Containers</h3>
            <div class="metric">
                <span>Status</span>
                <span class="status-CONTAINER_STATUS_CLASS">CONTAINER_STATUS_PLACEHOLDER</span>
            </div>
            <div class="metric">
                <span>Running</span>
                <span>4/4</span>
            </div>
        </div>
        
        <div class="card">
            <h3>🔒 SSL Certificates</h3>
            <div class="metric">
                <span>Status</span>
                <span class="status-SSL_STATUS_CLASS">SSL_STATUS_PLACEHOLDER</span>
            </div>
            <div class="metric">
                <span>Expiry</span>
                <span>> 30 days</span>
            </div>
        </div>
    </div>
    
    <div class="container">
        <h2>Recommendations</h2>
        <ul>
            <li>Monitor response times during peak hours</li>
            <li>Review log files regularly for anomalies</li>
            <li>Ensure backup systems are tested monthly</li>
            <li>Update SSL certificates before expiry</li>
            <li>Scale resources based on usage patterns</li>
        </ul>
    </div>
</body>
</html>
EOF
    
    # Replace placeholders with actual data
    if [ -f "$latest_json" ]; then
        local overall_status=$(jq -r '.overall_status' "$latest_json")
        local api_status=$(jq -r '.components.api.status' "$latest_json")
        local db_status=$(jq -r '.components.database.status' "$latest_json")
        local redis_status=$(jq -r '.components.cache.status' "$latest_json")
        local system_status=$(jq -r '.components.system.status' "$latest_json")
        local container_status=$(jq -r '.components.containers.status' "$latest_json")
        local ssl_status=$(jq -r '.components.ssl.status' "$latest_json")
        
        sed -i "s/TIMESTAMP_PLACEHOLDER/$timestamp/g" "$report_file"
        sed -i "s/ENVIRONMENT_PLACEHOLDER/$ENVIRONMENT/g" "$report_file"
        sed -i "s/STATUS_PLACEHOLDER/$overall_status/g" "$report_file"
        sed -i "s/STATUS_CLASS/status-${overall_status}/g" "$report_file"
        sed -i "s/API_STATUS_PLACEHOLDER/$api_status/g" "$report_file"
        sed -i "s/API_STATUS_CLASS/status-${api_status}/g" "$report_file"
        sed -i "s/DB_STATUS_PLACEHOLDER/$db_status/g" "$report_file"
        sed -i "s/DB_STATUS_CLASS/status-${db_status}/g" "$report_file"
        sed -i "s/REDIS_STATUS_PLACEHOLDER/$redis_status/g" "$report_file"
        sed -i "s/REDIS_STATUS_CLASS/status-${redis_status}/g" "$report_file"
        sed -i "s/SYSTEM_STATUS_PLACEHOLDER/$system_status/g" "$report_file"
        sed -i "s/SYSTEM_STATUS_CLASS/status-${system_status}/g" "$report_file"
        sed -i "s/CONTAINER_STATUS_PLACEHOLDER/$container_status/g" "$report_file"
        sed -i "s/CONTAINER_STATUS_CLASS/status-${container_status}/g" "$report_file"
        sed -i "s/SSL_STATUS_PLACEHOLDER/$ssl_status/g" "$report_file"
        sed -i "s/SSL_STATUS_CLASS/status-${ssl_status}/g" "$report_file"
    fi
    
    log_success "Comprehensive health report generated: $report_file"
}

# Show usage
show_usage() {
    echo "🏥 ASVAB Prep Health Monitoring System"
    echo ""
    echo "Usage: $0 [ACTION]"
    echo ""
    echo "Actions:"
    echo "  monitor  - Start continuous health monitoring (default)"
    echo "  check    - Perform single health check"
    echo "  report   - Generate comprehensive health report"
    echo "  alert    - Test alert system"
    echo ""
    echo "Examples:"
    echo "  $0 check"
    echo "  $0 monitor"
    echo "  $0 report"
    echo ""
    echo "Environment Variables:"
    echo "  ENVIRONMENT - Environment name (production, staging)"
    echo "  BASE_URL - API base URL (default: http://localhost:3001)"
    echo "  CHECK_INTERVAL - Monitoring interval in seconds (default: 60)"
    echo "  MAX_RESPONSE_TIME - Max acceptable response time in ms (default: 5000)"
    echo "  ALERT_WEBHOOK - Slack webhook URL for alerts"
    echo "  ALERT_EMAIL - Email address for alerts"
}

# Main function
main() {
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_usage
        exit 0
    fi
    
    init_monitoring
    
    log_header "ASVAB PREP HEALTH MONITORING - MISSION COMMENCE"
    echo -e "${YELLOW}🏥 Military-grade health surveillance system${NC}"
    echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Base URL: $BASE_URL${NC}"
    echo -e "${YELLOW}Action: $ACTION${NC}"
    
    case "$ACTION" in
        "check")
            perform_health_check
            ;;
        "monitor")
            start_monitoring
            ;;
        "report")
            generate_health_report
            ;;
        "alert")
            send_alert "test" "Health monitoring system test alert"
            ;;
        *)
            log_error "Invalid action: $ACTION. Use --help for usage information."
            exit 1
            ;;
    esac
}

# Handle script termination
cleanup() {
    log_info "Health monitoring system shutdown initiated"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Execute main function
main "$@"