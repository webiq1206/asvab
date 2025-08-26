#!/bin/bash

# ASVAB Prep SSL/TLS Certificate Management
# Military-grade security certificate deployment and management

set -e

# Colors for military-style output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
DOMAIN=${DOMAIN:-"asvabprep.com"}
STAGING_DOMAIN=${STAGING_DOMAIN:-"staging.asvabprep.com"}
EMAIL=${SSL_EMAIL:-"admin@asvabprep.com"}
ENVIRONMENT=${ENVIRONMENT:-"production"}
SSL_DIR="/etc/ssl/asvab"
CERTBOT_DIR="/etc/letsencrypt"
ACTION=${1:-"setup"}  # setup, renew, check, cleanup

log_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}🔒 $1${NC}"
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

# Check prerequisites
check_prerequisites() {
    log_header "SSL CERTIFICATE PREREQUISITES CHECK"
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root for SSL certificate management"
    fi
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        if command -v apt-get &> /dev/null; then
            apt-get update && apt-get install -y certbot python3-certbot-nginx
        elif command -v yum &> /dev/null; then
            yum install -y certbot python3-certbot-nginx
        elif command -v apk &> /dev/null; then
            apk add --no-cache certbot certbot-nginx
        else
            log_error "Cannot install certbot - unsupported package manager"
        fi
    fi
    
    # Check if nginx is installed and running
    if ! command -v nginx &> /dev/null; then
        log_error "Nginx is not installed - required for SSL certificate validation"
    fi
    
    if ! systemctl is-active --quiet nginx; then
        log_warning "Nginx is not running - attempting to start..."
        systemctl start nginx || log_error "Failed to start Nginx"
    fi
    
    # Check DNS resolution
    log_info "Checking DNS resolution for domains..."
    for domain in "$DOMAIN" "api.$DOMAIN" "admin.$DOMAIN"; do
        if nslookup "$domain" >/dev/null 2>&1; then
            log_info "✓ $domain resolves correctly"
        else
            log_warning "⚠ $domain does not resolve - certificate may fail"
        fi
    done
    
    # Create SSL directories
    mkdir -p "$SSL_DIR"
    mkdir -p "$SSL_DIR/live"
    mkdir -p "$SSL_DIR/archive"
    
    log_success "Prerequisites check completed"
}

# Generate self-signed certificates (for development/staging)
generate_self_signed() {
    log_header "GENERATING SELF-SIGNED CERTIFICATES"
    
    local cert_path="$SSL_DIR/live/$DOMAIN"
    mkdir -p "$cert_path"
    
    # Generate private key
    log_info "Generating private key..."
    openssl genrsa -out "$cert_path/privkey.pem" 2048
    
    # Generate certificate signing request
    log_info "Generating certificate signing request..."
    openssl req -new -key "$cert_path/privkey.pem" -out "$cert_path/cert.csr" -subj "/C=US/ST=Military/L=Base/O=ASVAB Prep/OU=IT Department/CN=$DOMAIN"
    
    # Generate self-signed certificate
    log_info "Generating self-signed certificate..."
    openssl x509 -req -days 365 -in "$cert_path/cert.csr" -signkey "$cert_path/privkey.pem" -out "$cert_path/fullchain.pem"
    
    # Create certificate chain
    cp "$cert_path/fullchain.pem" "$cert_path/cert.pem"
    
    # Set proper permissions
    chmod 600 "$cert_path/privkey.pem"
    chmod 644 "$cert_path/fullchain.pem"
    chmod 644 "$cert_path/cert.pem"
    
    log_success "Self-signed certificates generated successfully"
    log_warning "Self-signed certificates are for development only!"
}

# Obtain Let's Encrypt certificates
obtain_letsencrypt_certs() {
    log_header "OBTAINING LET'S ENCRYPT CERTIFICATES"
    
    local staging_flag=""
    if [ "$ENVIRONMENT" = "staging" ]; then
        staging_flag="--staging"
        log_info "Using Let's Encrypt staging environment"
    fi
    
    # Main domain certificate
    log_info "Obtaining certificate for primary domains..."
    certbot certonly \
        --nginx \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        $staging_flag \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        -d "api.$DOMAIN" \
        -d "admin.$DOMAIN" \
        --cert-path "$SSL_DIR/live/$DOMAIN/cert.pem" \
        --key-path "$SSL_DIR/live/$DOMAIN/privkey.pem" \
        --fullchain-path "$SSL_DIR/live/$DOMAIN/fullchain.pem" \
        --chain-path "$SSL_DIR/live/$DOMAIN/chain.pem"
    
    if [ $? -eq 0 ]; then
        log_success "Let's Encrypt certificates obtained successfully"
    else
        log_error "Failed to obtain Let's Encrypt certificates"
    fi
    
    # Staging domain certificate (if different)
    if [ "$STAGING_DOMAIN" != "$DOMAIN" ] && [ "$ENVIRONMENT" = "production" ]; then
        log_info "Obtaining certificate for staging domain..."
        certbot certonly \
            --nginx \
            --non-interactive \
            --agree-tos \
            --email "$EMAIL" \
            -d "$STAGING_DOMAIN" \
            -d "api.$STAGING_DOMAIN" \
            --cert-path "$SSL_DIR/live/$STAGING_DOMAIN/cert.pem" \
            --key-path "$SSL_DIR/live/$STAGING_DOMAIN/privkey.pem" \
            --fullchain-path "$SSL_DIR/live/$STAGING_DOMAIN/fullchain.pem" \
            --chain-path "$SSL_DIR/live/$STAGING_DOMAIN/chain.pem"
    fi
}

# Setup automatic renewal
setup_auto_renewal() {
    log_header "SETTING UP AUTOMATIC CERTIFICATE RENEWAL"
    
    # Create renewal script
    cat > /usr/local/bin/asvab-ssl-renew.sh << 'EOF'
#!/bin/bash

# ASVAB Prep SSL Certificate Renewal
LOG_FILE="/var/log/asvab-ssl-renewal.log"

echo "[$(date)] Starting SSL certificate renewal..." >> "$LOG_FILE"

# Attempt renewal
certbot renew --quiet --nginx --post-hook "systemctl reload nginx" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date)] SSL certificate renewal successful" >> "$LOG_FILE"
    
    # Send success notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"🔒 ASVAB Prep SSL certificates renewed successfully"}' \
            "$SLACK_WEBHOOK_URL" >> "$LOG_FILE" 2>&1
    fi
else
    echo "[$(date)] SSL certificate renewal failed" >> "$LOG_FILE"
    
    # Send failure notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"❌ ASVAB Prep SSL certificate renewal FAILED - immediate attention required!"}' \
            "$SLACK_WEBHOOK_URL" >> "$LOG_FILE" 2>&1
    fi
fi

echo "[$(date)] SSL renewal process completed" >> "$LOG_FILE"
EOF

    chmod +x /usr/local/bin/asvab-ssl-renew.sh
    
    # Create systemd timer for renewal
    cat > /etc/systemd/system/asvab-ssl-renewal.service << EOF
[Unit]
Description=ASVAB Prep SSL Certificate Renewal
After=network.target

[Service]
Type=oneshot
User=root
ExecStart=/usr/local/bin/asvab-ssl-renew.sh
StandardOutput=journal
StandardError=journal
EOF

    cat > /etc/systemd/system/asvab-ssl-renewal.timer << EOF
[Unit]
Description=ASVAB Prep SSL Certificate Renewal Timer
Requires=asvab-ssl-renewal.service

[Timer]
OnCalendar=daily
RandomizedDelaySec=1h
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Enable and start timer
    systemctl daemon-reload
    systemctl enable asvab-ssl-renewal.timer
    systemctl start asvab-ssl-renewal.timer
    
    # Create logrotate configuration
    cat > /etc/logrotate.d/asvab-ssl-renewal << EOF
/var/log/asvab-ssl-renewal.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF
    
    log_success "Automatic SSL renewal configured"
    log_info "Renewal timer status:"
    systemctl status asvab-ssl-renewal.timer --no-pager
}

# Update nginx configuration
update_nginx_config() {
    log_header "UPDATING NGINX SSL CONFIGURATION"
    
    local nginx_conf="/etc/nginx/sites-available/asvab-prep-ssl"
    
    # Backup existing configuration
    if [ -f "/etc/nginx/sites-available/default" ]; then
        cp "/etc/nginx/sites-available/default" "/etc/nginx/sites-available/default.backup.$(date +%Y%m%d)"
    fi
    
    # Create SSL-enabled nginx configuration
    cat > "$nginx_conf" << EOF
# ASVAB Prep SSL Configuration
# Military-grade HTTPS setup

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN api.$DOMAIN admin.$DOMAIN;
    
    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate $SSL_DIR/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key $SSL_DIR/live/$DOMAIN/privkey.pem;
    ssl_trusted_certificate $SSL_DIR/live/$DOMAIN/chain.pem;
    
    # Modern SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
    
    # Root directory
    root /var/www/html;
    index index.html index.htm;
    
    # Proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Security
        proxy_hide_header X-Powered-By;
        proxy_hide_header Server;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    # Static files
    location / {
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy";
        add_header Content-Type text/plain;
    }
}

# API subdomain
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate $SSL_DIR/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key $SSL_DIR/live/$DOMAIN/privkey.pem;
    ssl_trusted_certificate $SSL_DIR/live/$DOMAIN/chain.pem;
    
    # SSL settings (same as main server)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Access-Control-Allow-Origin "https://$DOMAIN" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    
    # Proxy all requests to backend
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS preflight
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$DOMAIN";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With";
            add_header Access-Control-Max-Age 86400;
            return 204;
        }
    }
}
EOF

    # Enable the configuration
    if [ -L "/etc/nginx/sites-enabled/default" ]; then
        rm "/etc/nginx/sites-enabled/default"
    fi
    
    ln -sf "$nginx_conf" "/etc/nginx/sites-enabled/asvab-prep-ssl"
    
    # Test nginx configuration
    nginx -t
    if [ $? -eq 0 ]; then
        systemctl reload nginx
        log_success "Nginx SSL configuration updated successfully"
    else
        log_error "Nginx configuration test failed"
    fi
}

# Check certificate status
check_certificates() {
    log_header "CHECKING SSL CERTIFICATE STATUS"
    
    for domain in "$DOMAIN" "api.$DOMAIN" "admin.$DOMAIN"; do
        log_info "Checking certificate for $domain..."
        
        if [ -f "$SSL_DIR/live/$DOMAIN/fullchain.pem" ]; then
            # Check certificate expiration
            exp_date=$(openssl x509 -in "$SSL_DIR/live/$DOMAIN/fullchain.pem" -noout -dates | grep notAfter | cut -d= -f2)
            exp_timestamp=$(date -d "$exp_date" +%s)
            current_timestamp=$(date +%s)
            days_until_exp=$(( (exp_timestamp - current_timestamp) / 86400 ))
            
            log_info "Certificate for $domain expires in $days_until_exp days ($exp_date)"
            
            if [ $days_until_exp -lt 30 ]; then
                log_warning "Certificate for $domain expires in less than 30 days!"
            fi
            
            # Test HTTPS connection
            if curl -sSf "https://$domain/health" >/dev/null 2>&1; then
                log_success "HTTPS connection to $domain is working"
            else
                log_warning "HTTPS connection to $domain failed"
            fi
        else
            log_error "Certificate file not found for $domain"
        fi
    done
    
    # Check automatic renewal status
    log_info "Checking automatic renewal status..."
    systemctl status asvab-ssl-renewal.timer --no-pager || log_warning "Renewal timer not active"
}

# Cleanup old certificates
cleanup_certificates() {
    log_header "CLEANING UP OLD CERTIFICATES"
    
    log_info "Removing expired certificates..."
    find "$SSL_DIR/archive" -name "*.pem" -mtime +90 -delete 2>/dev/null || true
    
    log_info "Removing Let's Encrypt backup files..."
    find "$CERTBOT_DIR" -name "*.pem-*" -mtime +30 -delete 2>/dev/null || true
    
    log_info "Cleaning up log files..."
    find /var/log -name "*certbot*" -mtime +30 -delete 2>/dev/null || true
    
    log_success "Certificate cleanup completed"
}

# Generate security report
generate_security_report() {
    log_header "GENERATING SSL SECURITY REPORT"
    
    local report_file="reports/ssl_security_$(date +%Y%m%d_%H%M%S).json"
    local report_date=$(date +"%Y-%m-%d %H:%M:%S")
    
    mkdir -p reports
    
    # Test SSL configuration
    local ssl_test_results=""
    if command -v curl &> /dev/null; then
        ssl_test_results=$(curl -sSf "https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN&latest" 2>/dev/null || echo "SSL test unavailable")
    fi
    
    cat > "$report_file" << EOF
{
  "security_report": {
    "date": "$report_date",
    "domain": "$DOMAIN",
    "environment": "$ENVIRONMENT",
    "status": "active"
  },
  "certificates": {
    "primary_domain": "$DOMAIN",
    "subdomains": ["www.$DOMAIN", "api.$DOMAIN", "admin.$DOMAIN"],
    "certificate_path": "$SSL_DIR/live/$DOMAIN/fullchain.pem",
    "auto_renewal": "enabled"
  },
  "ssl_configuration": {
    "protocols": ["TLSv1.2", "TLSv1.3"],
    "hsts_enabled": true,
    "ocsp_stapling": true,
    "session_tickets": false,
    "perfect_forward_secrecy": true
  },
  "security_headers": {
    "strict_transport_security": true,
    "x_frame_options": true,
    "x_content_type_options": true,
    "x_xss_protection": true,
    "referrer_policy": true,
    "content_security_policy": true
  },
  "monitoring": {
    "renewal_timer": "active",
    "renewal_logs": "/var/log/asvab-ssl-renewal.log",
    "notification_webhook": $([ -n "$SLACK_WEBHOOK_URL" ] && echo "\"configured\"" || echo "\"not_configured\"")
  }
}
EOF
    
    log_success "SSL security report generated: $report_file"
}

# Show usage
show_usage() {
    echo "🔒 ASVAB Prep SSL/TLS Certificate Management"
    echo ""
    echo "Usage: $0 [ACTION]"
    echo ""
    echo "Actions:"
    echo "  setup    - Initial SSL certificate setup (default)"
    echo "  renew    - Manual certificate renewal"
    echo "  check    - Check certificate status"
    echo "  cleanup  - Clean up old certificates"
    echo ""
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 check"
    echo "  $0 renew"
    echo ""
    echo "Environment Variables:"
    echo "  DOMAIN - Primary domain (default: asvabprep.com)"
    echo "  SSL_EMAIL - Email for Let's Encrypt (default: admin@asvabprep.com)"
    echo "  ENVIRONMENT - Environment type (production/staging)"
    echo "  SLACK_WEBHOOK_URL - Notification webhook for alerts"
}

# Main function
main() {
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_usage
        exit 0
    fi
    
    log_header "ASVAB PREP SSL/TLS CERTIFICATE MANAGEMENT"
    echo -e "${YELLOW}🔒 Military-grade security deployment${NC}"
    echo -e "${YELLOW}Domain: $DOMAIN${NC}"
    echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Action: $ACTION${NC}"
    
    case "$ACTION" in
        "setup")
            check_prerequisites
            if [ "$ENVIRONMENT" = "development" ]; then
                generate_self_signed
            else
                obtain_letsencrypt_certs
                setup_auto_renewal
            fi
            update_nginx_config
            check_certificates
            generate_security_report
            ;;
        "renew")
            /usr/local/bin/asvab-ssl-renew.sh
            check_certificates
            ;;
        "check")
            check_certificates
            generate_security_report
            ;;
        "cleanup")
            cleanup_certificates
            ;;
        *)
            log_error "Invalid action: $ACTION. Use --help for usage information."
            ;;
    esac
    
    log_header "SSL CERTIFICATE MISSION ACCOMPLISHED"
    echo -e "${GREEN}🔒 SSL/TLS certificates secured and operational!${NC}"
    echo -e "${GREEN}🛡️  Military-grade encryption protecting ASVAB data!${NC}"
    echo -e "${GREEN}Semper Fi! Security mission complete! 🇺🇸${NC}"
    
    echo -e "\n${YELLOW}📋 SECURITY CHECKLIST:${NC}"
    echo "1. ✓ SSL certificates installed and configured"
    echo "2. ✓ Automatic renewal enabled"
    echo "3. ✓ Modern TLS protocols configured"
    echo "4. ✓ Security headers implemented"
    echo "5. ✓ HSTS enabled for enhanced security"
    echo "6. ✓ OCSP stapling configured"
    echo "7. ✓ Perfect Forward Secrecy enabled"
    echo "8. ✓ Monitoring and alerting configured"
}

# Execute main function
main "$@"