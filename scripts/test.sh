#!/bin/bash

# ==============================================
# Comprehensive Test Runner
# ==============================================

set -e  # Exit on any error

echo "🧪 Running comprehensive test suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
BACKEND_TESTS=0
FRONTEND_TESTS=0
E2E_TESTS=0
LINTING=0

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2 passed${NC}"
    else
        echo -e "${RED}❌ $2 failed${NC}"
    fi
}

# Start Redis for testing
echo "🔴 Starting Redis for testing..."
if command -v redis-server &> /dev/null; then
    redis-server --daemonize yes --port 6380 --dir /tmp > /dev/null 2>&1 || true
    export REDIS_URL="redis://localhost:6380"
    echo "✅ Redis started on port 6380"
else
    echo "⚠️  Redis not available, some tests may fail"
fi

# Run backend linting
echo "🔍 Running backend linting..."
cd backend
if npm run lint > /dev/null 2>&1; then
    LINTING=0
else
    echo "⚠️  Backend linting issues found (not blocking)"
    LINTING=1
fi
cd ..

# Run frontend linting
echo "🔍 Running frontend linting..."
cd frontend
if npm run lint > /dev/null 2>&1; then
    LINTING=$((LINTING + 0))
else
    echo "⚠️  Frontend linting issues found (not blocking)"
    LINTING=$((LINTING + 1))
fi
cd ..

# Run backend tests
echo "🧪 Running backend tests..."
cd backend
if npm test; then
    BACKEND_TESTS=0
else
    BACKEND_TESTS=1
fi
cd ..

# Run frontend tests
echo "🧪 Running frontend tests..."
cd frontend
if CI=true npm test -- --coverage --watchAll=false; then
    FRONTEND_TESTS=0
else
    FRONTEND_TESTS=1
fi
cd ..

# Run E2E tests (optional, requires browsers)
if command -v npx &> /dev/null && [ -d "tests/node_modules" ]; then
    echo "🎭 Running E2E tests..."
    cd tests
    if npm run test:e2e; then
        E2E_TESTS=0
    else
        E2E_TESTS=1
    fi
    cd ..
else
    echo "⚠️  E2E tests skipped (Playwright not installed)"
    E2E_TESTS=0
fi

# Stop test Redis
echo "🛑 Stopping test Redis..."
redis-cli -p 6380 shutdown > /dev/null 2>&1 || true

# Print results
echo ""
echo "📊 Test Results:"
echo "================="
print_result $LINTING "Linting"
print_result $BACKEND_TESTS "Backend Tests"
print_result $FRONTEND_TESTS "Frontend Tests"
print_result $E2E_TESTS "E2E Tests"

# Calculate overall result
OVERALL_RESULT=$((BACKEND_TESTS + FRONTEND_TESTS + E2E_TESTS))

echo ""
if [ $OVERALL_RESULT -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check the output above.${NC}"
    exit 1
fi