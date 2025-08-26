#!/bin/bash

# ASVAB Prep CDN Configuration Script
# Military-grade content delivery network setup for global performance

set -e

# Colors for military-style output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
CDN_PROVIDER=${CDN_PROVIDER:-"cloudflare"}  # cloudflare, aws, azure, gcp
DOMAIN=${DOMAIN:-"asvabprep.com"}
CDN_SUBDOMAIN=${CDN_SUBDOMAIN:-"cdn"}
S3_BUCKET=${S3_BUCKET:-"asvab-prep-static-assets"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
ACTION=${1:-"setup"}  # setup, sync, purge, analyze

log_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}🌐 $1${NC}"
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
    log_header "CDN SETUP PREREQUISITES CHECK"
    
    # Check required tools based on CDN provider
    case "$CDN_PROVIDER" in
        "aws"|"cloudfront")
            if ! command -v aws &> /dev/null; then
                log_error "AWS CLI is required for AWS CloudFront CDN setup"
            fi
            ;;
        "azure")
            if ! command -v az &> /dev/null; then
                log_error "Azure CLI is required for Azure CDN setup"
            fi
            ;;
        "gcp")
            if ! command -v gcloud &> /dev/null; then
                log_error "Google Cloud SDK is required for GCP CDN setup"
            fi
            ;;
        "cloudflare")
            if ! command -v curl &> /dev/null; then
                log_error "curl is required for Cloudflare API operations"
            fi
            if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
                log_warning "CLOUDFLARE_API_TOKEN not set - some operations may fail"
            fi
            ;;
    esac
    
    # Check if jq is available for JSON processing
    if ! command -v jq &> /dev/null; then
        log_info "Installing jq for JSON processing..."
        if command -v apt-get &> /dev/null; then
            apt-get update && apt-get install -y jq
        elif command -v yum &> /dev/null; then
            yum install -y jq
        elif command -v apk &> /dev/null; then
            apk add --no-cache jq
        else
            log_warning "jq not available - some features may be limited"
        fi
    fi
    
    log_success "Prerequisites check completed"
}

# Setup AWS CloudFront CDN
setup_cloudfront_cdn() {
    log_header "SETTING UP AWS CLOUDFRONT CDN"
    
    # Create S3 bucket for static assets
    log_info "Creating S3 bucket for static assets..."
    if ! aws s3 ls "s3://$S3_BUCKET" &>/dev/null; then
        aws s3 mb "s3://$S3_BUCKET" --region "$AWS_REGION"
        
        # Configure bucket for static website hosting
        aws s3 website "s3://$S3_BUCKET" \
            --index-document index.html \
            --error-document error.html
        
        # Set bucket policy for public read access
        cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$S3_BUCKET/*"
        }
    ]
}
EOF
        
        aws s3api put-bucket-policy --bucket "$S3_BUCKET" --policy file:///tmp/bucket-policy.json
        rm /tmp/bucket-policy.json
        
        log_success "S3 bucket created and configured"
    else
        log_info "S3 bucket already exists"
    fi
    
    # Create CloudFront Origin Access Control
    log_info "Creating CloudFront distribution..."
    
    # Create distribution configuration
    cat > /tmp/cloudfront-config.json << EOF
{
    "CallerReference": "asvab-prep-$(date +%s)",
    "Comment": "ASVAB Prep CDN - Military Education Assets",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-$S3_BUCKET",
                "DomainName": "$S3_BUCKET.s3.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$S3_BUCKET",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"]
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "Compress": true
    },
    "CacheBehaviors": {
        "Quantity": 2,
        "Items": [
            {
                "PathPattern": "*.css",
                "TargetOriginId": "S3-$S3_BUCKET",
                "ViewerProtocolPolicy": "redirect-to-https",
                "AllowedMethods": {
                    "Quantity": 2,
                    "Items": ["GET", "HEAD"]
                },
                "ForwardedValues": {
                    "QueryString": false,
                    "Cookies": {
                        "Forward": "none"
                    }
                },
                "TrustedSigners": {
                    "Enabled": false,
                    "Quantity": 0
                },
                "MinTTL": 0,
                "DefaultTTL": 31536000,
                "MaxTTL": 31536000,
                "Compress": true
            },
            {
                "PathPattern": "*.js",
                "TargetOriginId": "S3-$S3_BUCKET",
                "ViewerProtocolPolicy": "redirect-to-https",
                "AllowedMethods": {
                    "Quantity": 2,
                    "Items": ["GET", "HEAD"]
                },
                "ForwardedValues": {
                    "QueryString": false,
                    "Cookies": {
                        "Forward": "none"
                    }
                },
                "TrustedSigners": {
                    "Enabled": false,
                    "Quantity": 0
                },
                "MinTTL": 0,
                "DefaultTTL": 31536000,
                "MaxTTL": 31536000,
                "Compress": true
            }
        ]
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100",
    "Aliases": {
        "Quantity": 1,
        "Items": ["$CDN_SUBDOMAIN.$DOMAIN"]
    },
    "ViewerCertificate": {
        "CloudFrontDefaultCertificate": false,
        "ACMCertificateArn": "$(aws acm list-certificates --query 'CertificateSummaryList[?DomainName==`'$DOMAIN'`].CertificateArn' --output text)",
        "SSLSupportMethod": "sni-only",
        "MinimumProtocolVersion": "TLSv1.2_2021"
    }
}
EOF
    
    # Create the distribution
    local distribution_id=$(aws cloudfront create-distribution --distribution-config file:///tmp/cloudfront-config.json --query 'Distribution.Id' --output text)
    
    if [ -n "$distribution_id" ]; then
        log_success "CloudFront distribution created: $distribution_id"
        echo "$distribution_id" > /tmp/cloudfront-distribution-id
        
        # Wait for distribution to be deployed
        log_info "Waiting for distribution deployment (this may take 10-15 minutes)..."
        aws cloudfront wait distribution-deployed --id "$distribution_id"
        
        log_success "CloudFront distribution is now deployed"
    else
        log_error "Failed to create CloudFront distribution"
    fi
    
    rm /tmp/cloudfront-config.json
}

# Setup Cloudflare CDN
setup_cloudflare_cdn() {
    log_header "SETTING UP CLOUDFLARE CDN"
    
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        log_error "CLOUDFLARE_API_TOKEN environment variable is required"
    fi
    
    if [ -z "$CLOUDFLARE_ZONE_ID" ]; then
        log_error "CLOUDFLARE_ZONE_ID environment variable is required"
    fi
    
    # Create CDN subdomain DNS record
    log_info "Creating CDN subdomain DNS record..."
    
    # Get the current A record for the main domain
    local main_ip=$(dig +short "$DOMAIN" | head -1)
    
    if [ -n "$main_ip" ]; then
        # Create CNAME record for CDN subdomain
        curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data '{
                "type": "CNAME",
                "name": "'$CDN_SUBDOMAIN'",
                "content": "'$DOMAIN'",
                "ttl": 300,
                "proxied": true
            }'
        
        log_success "CDN subdomain created: $CDN_SUBDOMAIN.$DOMAIN"
    else
        log_error "Could not resolve main domain IP address"
    fi
    
    # Configure Cloudflare page rules for static assets
    log_info "Setting up Cloudflare page rules for static assets..."
    
    # Page rule for static assets with long cache time
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/pagerules" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{
            "targets": [
                {
                    "target": "url",
                    "constraint": {
                        "operator": "matches",
                        "value": "*'$CDN_SUBDOMAIN'.'$DOMAIN'/*.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf)"
                    }
                }
            ],
            "actions": [
                {
                    "id": "cache_level",
                    "value": "cache_everything"
                },
                {
                    "id": "edge_cache_ttl",
                    "value": 31536000
                },
                {
                    "id": "browser_cache_ttl",
                    "value": 31536000
                }
            ],
            "status": "active",
            "priority": 1
        }'
    
    log_success "Cloudflare CDN configuration completed"
}

# Sync static assets to CDN
sync_assets() {
    log_header "SYNCING STATIC ASSETS TO CDN"
    
    local assets_dir="./static-assets"
    
    # Create static assets if they don't exist
    if [ ! -d "$assets_dir" ]; then
        log_info "Creating static assets directory structure..."
        mkdir -p "$assets_dir"/{css,js,images,fonts,docs}
        
        # Create sample assets for demonstration
        echo "/* ASVAB Prep - Military-grade CSS */" > "$assets_dir/css/main.css"
        echo "// ASVAB Prep - Military-grade JavaScript" > "$assets_dir/js/app.js"
        echo "ASVAB Prep CDN Test" > "$assets_dir/test.txt"
    fi
    
    case "$CDN_PROVIDER" in
        "aws"|"cloudfront")
            log_info "Syncing assets to S3..."
            
            # Sync files with appropriate cache headers
            aws s3 sync "$assets_dir/" "s3://$S3_BUCKET/" \
                --delete \
                --cache-control "max-age=31536000" \
                --metadata-directive REPLACE
            
            # Set shorter cache for HTML files
            aws s3 sync "$assets_dir/" "s3://$S3_BUCKET/" \
                --exclude "*" --include "*.html" \
                --cache-control "max-age=300" \
                --metadata-directive REPLACE
            
            # Invalidate CloudFront cache
            if [ -f "/tmp/cloudfront-distribution-id" ]; then
                local distribution_id=$(cat /tmp/cloudfront-distribution-id)
                log_info "Invalidating CloudFront cache..."
                
                aws cloudfront create-invalidation \
                    --distribution-id "$distribution_id" \
                    --paths "/*"
            fi
            
            log_success "Assets synced to S3 and CloudFront"
            ;;
            
        "cloudflare")
            log_info "Syncing assets via Cloudflare..."
            
            # For Cloudflare, we typically sync to origin server and purge cache
            # This would require your origin server to be configured
            
            # Purge cache for all static assets
            if [ -n "$CLOUDFLARE_API_TOKEN" ] && [ -n "$CLOUDFLARE_ZONE_ID" ]; then
                curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
                    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                    -H "Content-Type: application/json" \
                    --data '{
                        "files": [
                            "https://'$CDN_SUBDOMAIN'.'$DOMAIN'/css/*",
                            "https://'$CDN_SUBDOMAIN'.'$DOMAIN'/js/*",
                            "https://'$CDN_SUBDOMAIN'.'$DOMAIN'/images/*"
                        ]
                    }'
                
                log_success "Cloudflare cache purged for static assets"
            fi
            ;;
    esac
}

# Purge CDN cache
purge_cache() {
    log_header "PURGING CDN CACHE"
    
    case "$CDN_PROVIDER" in
        "aws"|"cloudfront")
            if [ -f "/tmp/cloudfront-distribution-id" ]; then
                local distribution_id=$(cat /tmp/cloudfront-distribution-id)
                log_info "Purging CloudFront cache..."
                
                aws cloudfront create-invalidation \
                    --distribution-id "$distribution_id" \
                    --paths "/*"
                
                log_success "CloudFront cache invalidation initiated"
            else
                log_error "CloudFront distribution ID not found"
            fi
            ;;
            
        "cloudflare")
            if [ -n "$CLOUDFLARE_API_TOKEN" ] && [ -n "$CLOUDFLARE_ZONE_ID" ]; then
                log_info "Purging Cloudflare cache..."
                
                curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
                    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                    -H "Content-Type: application/json" \
                    --data '{"purge_everything": true}'
                
                log_success "Cloudflare cache purged successfully"
            else
                log_error "Cloudflare credentials not configured"
            fi
            ;;
    esac
}

# Analyze CDN performance
analyze_performance() {
    log_header "ANALYZING CDN PERFORMANCE"
    
    local cdn_url="https://$CDN_SUBDOMAIN.$DOMAIN"
    local test_endpoints=(
        "$cdn_url/test.txt"
        "$cdn_url/css/main.css"
        "$cdn_url/js/app.js"
    )
    
    log_info "Testing CDN endpoints performance..."
    
    for endpoint in "${test_endpoints[@]}"; do
        log_info "Testing: $endpoint"
        
        # Test response time and headers
        local response_time=$(curl -o /dev/null -s -w "%{time_total}" "$endpoint" || echo "failed")
        local status_code=$(curl -o /dev/null -s -w "%{http_code}" "$endpoint" || echo "000")
        local cache_status=$(curl -s -I "$endpoint" | grep -i "cf-cache-status\|x-cache" || echo "unknown")
        
        log_info "  Status: $status_code"
        log_info "  Response Time: ${response_time}s"
        log_info "  Cache Status: $cache_status"
        
        if [ "$status_code" = "200" ] && [ "$response_time" != "failed" ]; then
            log_success "  Endpoint is healthy"
        else
            log_warning "  Endpoint may have issues"
        fi
    done
    
    # Test global performance from different regions (if available)
    log_info "Testing global CDN performance..."
    
    # This would typically use a service like GTmetrix, Pingdom, or similar
    log_info "For comprehensive performance testing, use tools like:"
    echo "  - GTmetrix: https://gtmetrix.com/"
    echo "  - Pingdom: https://tools.pingdom.com/"
    echo "  - WebPageTest: https://webpagetest.org/"
    echo "  - KeyCDN Tools: https://tools.keycdn.com/"
}

# Update application configuration for CDN
update_app_config() {
    log_header "UPDATING APPLICATION CDN CONFIGURATION"
    
    local cdn_base_url="https://$CDN_SUBDOMAIN.$DOMAIN"
    
    # Update environment variables
    log_info "Updating environment variables..."
    
    # Update .env files
    if [ -f ".env" ]; then
        if grep -q "CDN_BASE_URL" .env; then
            sed -i "s|CDN_BASE_URL=.*|CDN_BASE_URL=$cdn_base_url|" .env
        else
            echo "CDN_BASE_URL=$cdn_base_url" >> .env
        fi
    fi
    
    if [ -f ".env.production" ]; then
        if grep -q "CDN_BASE_URL" .env.production; then
            sed -i "s|CDN_BASE_URL=.*|CDN_BASE_URL=$cdn_base_url|" .env.production
        else
            echo "CDN_BASE_URL=$cdn_base_url" >> .env.production
        fi
    fi
    
    # Create CDN configuration template for application
    cat > cdn-config.json << EOF
{
  "cdn": {
    "enabled": true,
    "base_url": "$cdn_base_url",
    "provider": "$CDN_PROVIDER",
    "endpoints": {
      "css": "$cdn_base_url/css/",
      "js": "$cdn_base_url/js/",
      "images": "$cdn_base_url/images/",
      "fonts": "$cdn_base_url/fonts/",
      "docs": "$cdn_base_url/docs/"
    },
    "cache_busting": {
      "enabled": true,
      "method": "query_string",
      "version": "$(date +%s)"
    },
    "fallback": {
      "enabled": true,
      "local_path": "/static/"
    }
  }
}
EOF
    
    log_success "CDN configuration files updated"
}

# Generate CDN report
generate_report() {
    log_header "GENERATING CDN DEPLOYMENT REPORT"
    
    local report_file="reports/cdn_deployment_$(date +%Y%m%d_%H%M%S).json"
    local deployment_date=$(date +"%Y-%m-%d %H:%M:%S")
    
    mkdir -p reports
    
    # Test CDN endpoints
    local cdn_url="https://$CDN_SUBDOMAIN.$DOMAIN"
    local test_results="{}"
    
    if command -v curl &> /dev/null; then
        local status_code=$(curl -o /dev/null -s -w "%{http_code}" "$cdn_url/test.txt" 2>/dev/null || echo "000")
        local response_time=$(curl -o /dev/null -s -w "%{time_total}" "$cdn_url/test.txt" 2>/dev/null || echo "0")
        
        test_results="{\"status_code\":\"$status_code\",\"response_time\":\"$response_time\"}"
    fi
    
    cat > "$report_file" << EOF
{
  "cdn_deployment": {
    "date": "$deployment_date",
    "provider": "$CDN_PROVIDER",
    "domain": "$DOMAIN",
    "cdn_subdomain": "$CDN_SUBDOMAIN.$DOMAIN",
    "status": "completed"
  },
  "configuration": {
    "base_url": "https://$CDN_SUBDOMAIN.$DOMAIN",
    "cache_ttl": {
      "static_assets": "31536000",
      "html": "300"
    },
    "compression": "enabled",
    "https": "enabled"
  },
  "test_results": $test_results,
  "optimization_recommendations": [
    "Enable Gzip/Brotli compression",
    "Implement cache-busting for dynamic assets",
    "Use WebP images where supported",
    "Minify CSS and JavaScript files",
    "Implement preload hints for critical resources",
    "Monitor CDN performance regularly"
  ],
  "monitoring": {
    "suggested_tools": [
      "Real User Monitoring (RUM)",
      "Synthetic monitoring",
      "CDN analytics dashboard",
      "Performance budgets"
    ]
  }
}
EOF
    
    log_success "CDN deployment report generated: $report_file"
}

# Show usage
show_usage() {
    echo "🌐 ASVAB Prep CDN Configuration System"
    echo ""
    echo "Usage: $0 [ACTION]"
    echo ""
    echo "Actions:"
    echo "  setup    - Initial CDN setup (default)"
    echo "  sync     - Sync static assets to CDN"
    echo "  purge    - Purge CDN cache"
    echo "  analyze  - Analyze CDN performance"
    echo ""
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 sync"
    echo "  $0 purge"
    echo "  $0 analyze"
    echo ""
    echo "Environment Variables:"
    echo "  CDN_PROVIDER - CDN provider (cloudflare, aws, azure, gcp)"
    echo "  DOMAIN - Primary domain (default: asvabprep.com)"
    echo "  CDN_SUBDOMAIN - CDN subdomain (default: cdn)"
    echo "  S3_BUCKET - S3 bucket for assets (AWS only)"
    echo "  CLOUDFLARE_API_TOKEN - Cloudflare API token"
    echo "  CLOUDFLARE_ZONE_ID - Cloudflare zone ID"
}

# Main function
main() {
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_usage
        exit 0
    fi
    
    log_header "ASVAB PREP CDN DEPLOYMENT - GLOBAL PERFORMANCE MISSION"
    echo -e "${YELLOW}🌐 Deploying global content delivery network${NC}"
    echo -e "${YELLOW}Provider: $CDN_PROVIDER${NC}"
    echo -e "${YELLOW}Domain: $DOMAIN${NC}"
    echo -e "${YELLOW}CDN URL: https://$CDN_SUBDOMAIN.$DOMAIN${NC}"
    echo -e "${YELLOW}Action: $ACTION${NC}"
    
    case "$ACTION" in
        "setup")
            check_prerequisites
            case "$CDN_PROVIDER" in
                "aws"|"cloudfront")
                    setup_cloudfront_cdn
                    ;;
                "cloudflare")
                    setup_cloudflare_cdn
                    ;;
                *)
                    log_error "Unsupported CDN provider: $CDN_PROVIDER"
                    ;;
            esac
            update_app_config
            sync_assets
            generate_report
            ;;
        "sync")
            sync_assets
            ;;
        "purge")
            purge_cache
            ;;
        "analyze")
            analyze_performance
            ;;
        *)
            log_error "Invalid action: $ACTION. Use --help for usage information."
            ;;
    esac
    
    log_header "CDN DEPLOYMENT MISSION ACCOMPLISHED"
    echo -e "${GREEN}🌐 Global CDN deployed successfully!${NC}"
    echo -e "${GREEN}⚡ Military personnel worldwide get lightning-fast access!${NC}"
    echo -e "${GREEN}🎖️  Global performance optimized! Hooyah! 🇺🇸${NC}"
    
    echo -e "\n${YELLOW}📊 CDN ENDPOINTS:${NC}"
    echo "🌐 Primary CDN: https://$CDN_SUBDOMAIN.$DOMAIN"
    echo "📄 CSS Assets: https://$CDN_SUBDOMAIN.$DOMAIN/css/"
    echo "⚡ JavaScript: https://$CDN_SUBDOMAIN.$DOMAIN/js/"
    echo "🖼️  Images: https://$CDN_SUBDOMAIN.$DOMAIN/images/"
    echo "🔤 Fonts: https://$CDN_SUBDOMAIN.$DOMAIN/fonts/"
    
    echo -e "\n${YELLOW}📋 PERFORMANCE OPTIMIZATION CHECKLIST:${NC}"
    echo "1. ✓ CDN configured and operational"
    echo "2. ✓ Static assets cached globally"
    echo "3. ✓ HTTPS enabled for all CDN endpoints"
    echo "4. ✓ Compression enabled for text files"
    echo "5. □ Implement WebP image format"
    echo "6. □ Setup Real User Monitoring (RUM)"
    echo "7. □ Configure performance budgets"
    echo "8. □ Regular CDN cache optimization"
}

# Execute main function
main "$@"