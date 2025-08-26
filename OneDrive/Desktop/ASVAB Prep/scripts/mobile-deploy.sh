#!/bin/bash

# ASVAB Prep Mobile App Deployment Script
# Military-grade mobile deployment for App Store and Google Play

set -e

# Colors for military-style output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MOBILE_DIR="$(dirname "$0")/../mobile"
PLATFORM=${1:-"both"}      # ios, android, both
BUILD_TYPE=${2:-"production"}  # development, preview, production
DEPLOY_TYPE=${3:-"build"}   # build, submit
VERSION=${4:-""}           # optional version override

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

# Validate prerequisites
validate_prerequisites() {
    log_header "VALIDATING DEPLOYMENT PREREQUISITES"
    
    # Check if we're in the mobile directory
    if [ ! -f "$MOBILE_DIR/package.json" ]; then
        log_error "Mobile app directory not found: $MOBILE_DIR"
    fi
    
    # Check for required tools
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
    fi
    
    if ! command -v eas &> /dev/null; then
        log_error "EAS CLI is not installed. Run: npm install -g @expo/eas-cli"
    fi
    
    # Check EAS login
    if ! eas whoami &> /dev/null; then
        log_error "Not logged into EAS. Run: eas login"
    fi
    
    # Check for required configuration files
    if [ ! -f "$MOBILE_DIR/eas.json" ]; then
        log_error "eas.json configuration file not found"
    fi
    
    if [ ! -f "$MOBILE_DIR/app.json" ]; then
        log_error "app.json configuration file not found"
    fi
    
    log_success "All prerequisites validated"
}

# Update version numbers
update_version() {
    if [ -n "$VERSION" ]; then
        log_header "UPDATING VERSION NUMBERS"
        
        log_info "Updating app version to: $VERSION"
        
        cd "$MOBILE_DIR"
        
        # Update package.json version
        npm version "$VERSION" --no-git-tag-version
        
        # Update app.json version
        if command -v jq &> /dev/null; then
            jq ".expo.version = \"$VERSION\"" app.json > app.json.tmp && mv app.json.tmp app.json
        else
            log_info "jq not available, manually update app.json version"
        fi
        
        log_success "Version updated to: $VERSION"
    else
        log_info "No version specified, using current version"
    fi
}

# Install dependencies
install_dependencies() {
    log_header "INSTALLING DEPENDENCIES"
    
    cd "$MOBILE_DIR"
    
    log_info "Installing npm dependencies..."
    npm install
    
    # Clear Expo cache
    log_info "Clearing Expo cache..."
    npx expo install --fix
    
    log_success "Dependencies installed successfully"
}

# Pre-build validation
pre_build_validation() {
    log_header "PRE-BUILD VALIDATION"
    
    cd "$MOBILE_DIR"
    
    # TypeScript type check
    log_info "Running TypeScript type checking..."
    npm run type-check
    
    # ESLint check
    if npm run lint --silent; then
        log_success "Code quality checks passed"
    else
        log_error "Code quality checks failed - fix linting errors before deployment"
    fi
    
    # Check for sensitive data
    log_info "Scanning for sensitive data..."
    if grep -r "sk_test\|pk_test\|AKIA\|password.*=.*['\"]" src/ 2>/dev/null; then
        log_error "Potential sensitive data found in source code!"
    fi
    
    log_success "Pre-build validation completed"
}

# Build iOS app
build_ios() {
    log_header "BUILDING iOS APPLICATION"
    
    cd "$MOBILE_DIR"
    
    local build_profile="production-ios"
    if [ "$BUILD_TYPE" != "production" ]; then
        build_profile="$BUILD_TYPE"
    fi
    
    log_info "Building iOS app with profile: $build_profile"
    log_info "This may take 10-15 minutes for iOS builds..."
    
    eas build --platform ios --profile "$build_profile" --non-interactive
    
    if [ $? -eq 0 ]; then
        log_success "iOS build completed successfully"
        
        # Get build URL
        local build_url=$(eas build:list --platform ios --limit 1 --json | jq -r '.[0].artifacts.buildUrl // "N/A"')
        log_info "iOS build URL: $build_url"
    else
        log_error "iOS build failed!"
    fi
}

# Build Android app
build_android() {
    log_header "BUILDING ANDROID APPLICATION"
    
    cd "$MOBILE_DIR"
    
    local build_profile="production-android"
    if [ "$BUILD_TYPE" != "production" ]; then
        build_profile="$BUILD_TYPE"
    fi
    
    log_info "Building Android app with profile: $build_profile"
    log_info "This may take 10-15 minutes for Android builds..."
    
    eas build --platform android --profile "$build_profile" --non-interactive
    
    if [ $? -eq 0 ]; then
        log_success "Android build completed successfully"
        
        # Get build URL
        local build_url=$(eas build:list --platform android --limit 1 --json | jq -r '.[0].artifacts.buildUrl // "N/A"')
        log_info "Android build URL: $build_url"
    else
        log_error "Android build failed!"
    fi
}

# Submit to App Store
submit_ios() {
    log_header "SUBMITTING TO APPLE APP STORE"
    
    cd "$MOBILE_DIR"
    
    log_info "Submitting iOS app to App Store Connect..."
    log_info "Note: App will be submitted for review after upload"
    
    eas submit --platform ios --profile "$BUILD_TYPE" --non-interactive
    
    if [ $? -eq 0 ]; then
        log_success "iOS app submitted to App Store Connect"
        log_info "Check App Store Connect for review status"
    else
        log_error "iOS submission failed!"
    fi
}

# Submit to Google Play
submit_android() {
    log_header "SUBMITTING TO GOOGLE PLAY STORE"
    
    cd "$MOBILE_DIR"
    
    log_info "Submitting Android app to Google Play Console..."
    
    # Check if service account key exists
    if [ ! -f "$MOBILE_DIR/google-service-account-key.json" ]; then
        log_error "Google Play service account key not found: google-service-account-key.json"
    fi
    
    eas submit --platform android --profile "$BUILD_TYPE" --non-interactive
    
    if [ $? -eq 0 ]; then
        log_success "Android app submitted to Google Play Console"
        log_info "Check Google Play Console for review status"
    else
        log_error "Android submission failed!"
    fi
}

# Generate deployment report
generate_deployment_report() {
    log_header "GENERATING DEPLOYMENT REPORT"
    
    local report_file="../reports/mobile_deployment_$(date +%Y%m%d_%H%M%S).json"
    local deployment_date=$(date +"%Y-%m-%d %H:%M:%S")
    
    mkdir -p "$(dirname "$report_file")"
    
    cd "$MOBILE_DIR"
    
    # Get app version
    local app_version=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)",/\1/')
    local expo_version=$(grep '"version"' app.json | head -1 | sed 's/.*"version": "\(.*\)",/\1/')
    
    # Get latest build info
    local ios_build_info="null"
    local android_build_info="null"
    
    if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
        ios_build_info=$(eas build:list --platform ios --limit 1 --json 2>/dev/null || echo "null")
    fi
    
    if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
        android_build_info=$(eas build:list --platform android --limit 1 --json 2>/dev/null || echo "null")
    fi
    
    cat > "$report_file" << EOF
{
  "deployment_session": {
    "date": "$deployment_date",
    "platform": "$PLATFORM",
    "build_type": "$BUILD_TYPE",
    "deploy_type": "$DEPLOY_TYPE",
    "app_version": "$app_version",
    "expo_version": "$expo_version",
    "status": "completed"
  },
  "builds": {
    "ios": $ios_build_info,
    "android": $android_build_info
  },
  "next_steps": [
    "Monitor app store review status",
    "Test app on physical devices",
    "Update app store metadata if needed",
    "Prepare release notes for users",
    "Monitor crash reports and user feedback"
  ]
}
EOF
    
    log_success "Deployment report generated: $report_file"
}

# Send deployment notification
send_notification() {
    local status=$1
    local message=$2
    
    # Send to Slack if webhook is configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🎖️ ASVAB Prep Mobile Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
    
    log_info "NOTIFICATION: $status - $message"
}

# Show deployment status
show_status() {
    log_header "DEPLOYMENT STATUS CHECK"
    
    cd "$MOBILE_DIR"
    
    log_info "Recent builds:"
    eas build:list --limit 5
    
    log_info "App store status:"
    eas submit:list --limit 3
    
    log_info "Current app configuration:"
    log_info "- Platform: $PLATFORM"
    log_info "- Build Type: $BUILD_TYPE"
    log_info "- Deploy Type: $DEPLOY_TYPE"
}

# Display usage information
show_usage() {
    echo "🎖️ ASVAB Prep Mobile Deployment System"
    echo ""
    echo "Usage: $0 [PLATFORM] [BUILD_TYPE] [DEPLOY_TYPE] [VERSION]"
    echo ""
    echo "Platforms:"
    echo "  ios     - iOS only"
    echo "  android - Android only" 
    echo "  both    - Both platforms (default)"
    echo ""
    echo "Build Types:"
    echo "  development - Development build"
    echo "  preview     - Preview/staging build"
    echo "  production  - Production build (default)"
    echo ""
    echo "Deploy Types:"
    echo "  build  - Build only (default)"
    echo "  submit - Build and submit to stores"
    echo ""
    echo "Examples:"
    echo "  $0 ios production build 1.2.3"
    echo "  $0 android preview submit"
    echo "  $0 both production submit"
    echo "  $0 status  # Show current status"
    echo ""
    echo "Environment Variables:"
    echo "  SLACK_WEBHOOK_URL - Slack notification webhook"
}

# Main deployment function
main() {
    if [ "$1" = "status" ]; then
        show_status
        exit 0
    fi
    
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_usage
        exit 0
    fi
    
    log_header "ASVAB PREP MOBILE DEPLOYMENT - MISSION COMMENCE"
    echo -e "${YELLOW}🇺🇸 Deploying military education excellence to mobile platforms${NC}"
    echo -e "${YELLOW}Platform: $PLATFORM${NC}"
    echo -e "${YELLOW}Build Type: $BUILD_TYPE${NC}"
    echo -e "${YELLOW}Deploy Type: $DEPLOY_TYPE${NC}"
    echo -e "${YELLOW}Version: ${VERSION:-"current"}${NC}"
    
    # Execute deployment sequence
    validate_prerequisites
    update_version
    install_dependencies
    pre_build_validation
    
    # Build applications
    if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
        build_ios
    fi
    
    if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
        build_android
    fi
    
    # Submit to stores if requested
    if [ "$DEPLOY_TYPE" = "submit" ]; then
        if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
            submit_ios
        fi
        
        if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
            submit_android
        fi
    fi
    
    generate_deployment_report
    
    log_header "MOBILE DEPLOYMENT MISSION ACCOMPLISHED"
    echo -e "${GREEN}🎖️  Mobile applications deployed successfully!${NC}"
    echo -e "${GREEN}📱 Military personnel will have access via app stores!${NC}"
    echo -e "${GREEN}🇺🇸 Serving those who serve! Hooyah!${NC}"
    
    # Final status check
    show_status
    
    send_notification "SUCCESS" "Mobile deployment completed - Platform: $PLATFORM, Type: $BUILD_TYPE"
    
    echo -e "\n${YELLOW}📋 NEXT STEPS:${NC}"
    echo "1. Monitor app store review process"
    echo "2. Test builds on physical devices"
    echo "3. Update app store descriptions and screenshots"
    echo "4. Prepare marketing materials for launch"
    echo "5. Monitor user feedback and crash reports"
}

# Execute main function
main "$@"