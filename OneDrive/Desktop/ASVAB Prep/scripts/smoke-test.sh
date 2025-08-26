#!/bin/bash

# ASVAB Prep Smoke Tests
# Military-grade deployment validation

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL=${BASE_URL:-"http://localhost:3001"}
TIMEOUT=${TIMEOUT:-30}

log_test() {
    echo -e "${YELLOW}🧪 TEST: $1${NC}"
}

log_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
}

log_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    exit 1
}

echo "🎖️  ASVAB Prep Smoke Tests - Military Excellence Validation"
echo "Base URL: $BASE_URL"
echo "Timeout: ${TIMEOUT}s"
echo "============================================"

# Test 1: Health Check
log_test "Health Check"
response=$(curl -s -w "%{http_code}" -o /tmp/health_response "$BASE_URL/api/health" --max-time $TIMEOUT)
if [ "$response" = "200" ]; then
    health_data=$(cat /tmp/health_response)
    if echo "$health_data" | grep -q "status.*ok"; then
        log_pass "Health check endpoint is responding correctly"
    else
        log_fail "Health check response invalid: $health_data"
    fi
else
    log_fail "Health check failed with status code: $response"
fi

# Test 2: Database Connection
log_test "Database Connection"
response=$(curl -s -w "%{http_code}" -o /tmp/db_response "$BASE_URL/api/health/database" --max-time $TIMEOUT)
if [ "$response" = "200" ]; then
    log_pass "Database connection is healthy"
else
    log_fail "Database connection failed with status code: $response"
fi

# Test 3: Military Branches Endpoint
log_test "Military Branches Endpoint"
response=$(curl -s -w "%{http_code}" -o /tmp/branches_response "$BASE_URL/api/military/branches" --max-time $TIMEOUT)
if [ "$response" = "200" ]; then
    branches_data=$(cat /tmp/branches_response)
    if echo "$branches_data" | grep -q "ARMY\|NAVY\|AIR_FORCE"; then
        log_pass "Military branches endpoint is working"
    else
        log_fail "Military branches response invalid: $branches_data"
    fi
else
    log_fail "Military branches endpoint failed with status code: $response"
fi

# Test 4: Authentication Endpoint Structure
log_test "Authentication Endpoint Structure"
response=$(curl -s -w "%{http_code}" -o /tmp/auth_response "$BASE_URL/api/auth/login" --max-time $TIMEOUT -X POST -H "Content-Type: application/json" -d '{}')
if [ "$response" = "400" ] || [ "$response" = "401" ]; then
    log_pass "Authentication endpoint is properly validating requests"
else
    log_fail "Authentication endpoint unexpected response: $response"
fi

# Test 5: CORS Headers
log_test "CORS Headers"
headers=$(curl -s -I "$BASE_URL/api/health" --max-time $TIMEOUT)
if echo "$headers" | grep -qi "access-control-allow"; then
    log_pass "CORS headers are present"
else
    log_fail "CORS headers missing"
fi

# Test 6: Security Headers
log_test "Security Headers"
headers=$(curl -s -I "$BASE_URL/api/health" --max-time $TIMEOUT)
if echo "$headers" | grep -qi "x-content-type-options\|x-frame-options"; then
    log_pass "Security headers are present"
else
    log_fail "Security headers missing"
fi

# Test 7: Rate Limiting Headers
log_test "Rate Limiting Headers"
headers=$(curl -s -I "$BASE_URL/api/health" --max-time $TIMEOUT)
if echo "$headers" | grep -qi "x-ratelimit"; then
    log_pass "Rate limiting headers are present"
else
    log_fail "Rate limiting headers missing"
fi

# Test 8: WebSocket Connection (basic check)
log_test "WebSocket Endpoint Availability"
# Check if the WebSocket endpoint returns appropriate error for HTTP request
response=$(curl -s -w "%{http_code}" -o /tmp/ws_response "$BASE_URL/socket.io/" --max-time $TIMEOUT)
if [ "$response" = "200" ] || [ "$response" = "400" ]; then
    log_pass "WebSocket endpoint is accessible"
else
    log_fail "WebSocket endpoint failed with status code: $response"
fi

# Test 9: Questions Endpoint (should require auth)
log_test "Protected Endpoint Security"
response=$(curl -s -w "%{http_code}" -o /tmp/questions_response "$BASE_URL/api/questions" --max-time $TIMEOUT)
if [ "$response" = "401" ]; then
    log_pass "Protected endpoints properly require authentication"
else
    log_fail "Protected endpoint security check failed: $response"
fi

# Test 10: API Documentation (if enabled)
log_test "API Documentation"
response=$(curl -s -w "%{http_code}" -o /tmp/docs_response "$BASE_URL/api/docs" --max-time $TIMEOUT)
if [ "$response" = "200" ] || [ "$response" = "404" ]; then
    log_pass "API documentation endpoint responds appropriately"
else
    log_fail "API documentation endpoint failed: $response"
fi

# Test 11: Metrics Endpoint (Prometheus)
log_test "Metrics Endpoint"
response=$(curl -s -w "%{http_code}" -o /tmp/metrics_response "$BASE_URL/metrics" --max-time $TIMEOUT)
if [ "$response" = "200" ] || [ "$response" = "404" ]; then
    log_pass "Metrics endpoint responds appropriately"
else
    log_fail "Metrics endpoint failed: $response"
fi

# Test 12: Content-Type Validation
log_test "Content-Type Validation"
response=$(curl -s -w "%{http_code}" -o /tmp/content_response "$BASE_URL/api/health" --max-time $TIMEOUT)
content_type=$(curl -s -I "$BASE_URL/api/health" --max-time $TIMEOUT | grep -i content-type)
if echo "$content_type" | grep -qi "application/json"; then
    log_pass "Proper Content-Type headers are set"
else
    log_fail "Content-Type headers incorrect: $content_type"
fi

# Performance Test: Response Time
log_test "Response Time Performance"
start_time=$(date +%s%N)
curl -s "$BASE_URL/api/health" --max-time $TIMEOUT > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

if [ $response_time -lt 1000 ]; then
    log_pass "Response time is acceptable: ${response_time}ms"
else
    log_fail "Response time too slow: ${response_time}ms"
fi

# Clean up temporary files
rm -f /tmp/health_response /tmp/db_response /tmp/branches_response /tmp/auth_response /tmp/ws_response /tmp/questions_response /tmp/docs_response /tmp/metrics_response /tmp/content_response

echo "============================================"
echo -e "${GREEN}🎖️  ALL SMOKE TESTS PASSED! 🎖️${NC}"
echo -e "${GREEN}ASVAB Prep platform is mission-ready! 🇺🇸${NC}"
echo -e "${GREEN}Semper Fi! Ready to serve military personnel!${NC}"
echo "============================================"