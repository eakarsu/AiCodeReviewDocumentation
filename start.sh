#!/bin/bash

# AI Code Review & Documentation Application Startup Script
# Uses local PostgreSQL installation

echo "=========================================="
echo "AI Code Review & Documentation App"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Step 1: Clean up existing processes on ports
echo "Step 1: Cleaning up existing processes..."
cleanup_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "Killing processes on port $port"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

cleanup_port 3000
cleanup_port 5001
# Also kill any node processes from previous runs
pkill -f "node.*AiCodeReviewDocumentation" 2>/dev/null || true
sleep 1
print_status "Port cleanup complete"

# Step 2: Check local PostgreSQL
echo ""
echo "Step 2: Checking local PostgreSQL..."

if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    print_status "PostgreSQL is running"
else
    print_error "PostgreSQL is not running. Please start it first:"
    echo "  brew services start postgresql"
    exit 1
fi

# Create database if it doesn't exist
createdb ai_code_review 2>/dev/null || true
print_status "Database ready"

# Step 3: Setup and Start Backend
echo ""
echo "Step 3: Setting up backend..."

cd "$SCRIPT_DIR/backend"

# Install backend dependencies
echo "Installing backend dependencies..."
npm install --silent 2>/dev/null
print_status "Backend dependencies installed"

# Run database seed
echo "Seeding database..."
node src/seed/seedData.js
print_status "Database seeded with sample data"

# Start backend server in background
echo "Starting backend server..."
nohup node src/index.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..20}; do
    if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
        print_status "Backend is running on port 5001"
        break
    fi
    if [ $i -eq 20 ]; then
        print_error "Backend failed to start. Check /tmp/backend.log"
        cat /tmp/backend.log
        exit 1
    fi
    sleep 1
done

# Step 4: Setup and Start Frontend
echo ""
echo "Step 4: Setting up frontend..."

cd "$SCRIPT_DIR/frontend"

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install --silent 2>/dev/null
print_status "Frontend dependencies installed"

# Start frontend dev server in background
echo "Starting frontend server..."
nohup npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to be ready
echo "Waiting for frontend to start..."
for i in {1..20}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend is running on port 3000"
        break
    fi
    if [ $i -eq 20 ]; then
        print_warning "Frontend may still be starting..."
    fi
    sleep 1
done

cd "$SCRIPT_DIR"

echo ""
echo "=========================================="
print_status "Application started successfully!"
echo "=========================================="
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5001"
echo ""
echo "Login with the 'Auto-Fill Demo Credentials' button"
echo ""
echo "Logs:"
echo "  Backend:  /tmp/backend.log"
echo "  Frontend: /tmp/frontend.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Open browser
if command -v open &> /dev/null; then
    open http://localhost:3000
fi

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

# Keep script running
while true; do
    sleep 1
done
