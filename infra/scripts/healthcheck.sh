#!/usr/bin/env bash
# ==============================================================================
# healthcheck.sh - Production Health & Readiness Verification
# ==============================================================================

set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
ADMIN_URL="${ADMIN_URL:-http://localhost:5173}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

check_endpoint() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  echo -n "Checking ${name} (${url})... "
  status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" || echo "FAIL")

  if [ "$status" == "$expected_status" ]; then
    echo -e "${GREEN}OK (${status})${NC}"
    return 0
  else
    echo -e "${RED}FAILED (Got ${status}, expected ${expected_status})${NC}"
    return 1
  fi
}

echo "=== System Healthcheck Verification ==="
failed=0

check_endpoint "NestJS API Health" "${API_URL}/health" "200" || failed=$((failed + 1))
check_endpoint "Next.js Web Frontend (TR)" "${WEB_URL}/tr" "200" || failed=$((failed + 1))
check_endpoint "Next.js Web Frontend (EN)" "${WEB_URL}/en" "200" || failed=$((failed + 1))
check_endpoint "Admin Dashboard SPA" "${ADMIN_URL}" "200" || failed=$((failed + 1))

echo "----------------------------------------"
if [ $failed -eq 0 ]; then
  echo -e "${GREEN}All system health checks passed successfully!${NC}"
  exit 0
else
  echo -e "${RED}${failed} health check(s) failed.${NC}"
  exit 1
fi
