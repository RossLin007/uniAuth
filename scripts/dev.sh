#!/bin/bash

# ==============================================
# UniAuth Development Services Startup Script
# ==============================================
#
# 启动所有开发服务:
# - API Server (port 3000)
# - Web Frontend (port 5173)  
# - Developer Console (port 5174)
#
# 使用方法:
#   ./scripts/dev.sh        # 启动所有服务
#   ./scripts/dev.sh stop   # 停止所有服务
#
# ==============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to stop all services
stop_services() {
    print_info "Stopping all UniAuth services..."
    
    # Kill processes on specific ports
    for port in 3000 5173 5174; do
        pid=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            print_success "Stopped process on port $port"
        fi
    done
    
    print_success "All services stopped!"
}

# Function to start all services
start_services() {
    print_info "Starting UniAuth development services..."
    echo ""
    
    # Stop any existing services first
    stop_services
    echo ""
    
    # Start API Server
    print_info "Starting API Server on port 3000..."
    cd "$PROJECT_ROOT/packages/server"
    pnpm run dev &
    API_PID=$!
    sleep 3
    
    # Start Web Frontend
    print_info "Starting Web Frontend on port 5173..."
    cd "$PROJECT_ROOT/packages/web"
    pnpm run dev &
    WEB_PID=$!
    sleep 2
    
    # Start Developer Console
    print_info "Starting Developer Console on port 5174..."
    cd "$PROJECT_ROOT/packages/developer-console"
    pnpm run dev &
    CONSOLE_PID=$!
    sleep 2
    
    echo ""
    echo "=================================================="
    echo -e "${GREEN}✅ All services started successfully!${NC}"
    echo "=================================================="
    echo ""
    echo -e "  ${BLUE}🔧 API Server:${NC}        http://localhost:3000"
    echo -e "  ${BLUE}🌐 Web Frontend:${NC}      http://localhost:5173"
    echo -e "  ${BLUE}👨‍💻 Developer Console:${NC} http://localhost:5174"
    echo ""
    echo -e "  ${YELLOW}📚 API Docs:${NC}          http://localhost:3000/docs"
    echo ""
    echo -e "Press ${RED}Ctrl+C${NC} to stop all services"
    echo ""
    
    # Wait for any process to exit
    wait
}

# Main
case "${1:-start}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 1
        start_services
        ;;
    *)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
        ;;
esac
