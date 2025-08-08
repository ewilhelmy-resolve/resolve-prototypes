#!/bin/bash

# Docker-based testing script for Resolve Onboarding

echo "🚀 Resolve Onboarding - Docker Test Runner"
echo "=========================================="

# Function to show usage
show_usage() {
    echo "Usage: ./docker-test.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start      - Start all services (frontend + backend)"
    echo "  stop       - Stop all services"
    echo "  test       - Run E2E tests in Docker"
    echo "  test-local - Run tests against local services"
    echo "  logs       - Show service logs"
    echo "  clean      - Clean up containers and volumes"
    echo "  rebuild    - Rebuild all Docker images"
    echo ""
}

# Check command
case "$1" in
    start)
        echo "📦 Starting services..."
        docker-compose -f docker-compose.full.yml up -d frontend backend
        echo "⏳ Waiting for services to be ready..."
        sleep 5
        echo "✅ Services started!"
        echo "   Frontend: http://localhost:8081"
        echo "   Backend:  http://localhost:8082"
        ;;
    
    stop)
        echo "🛑 Stopping services..."
        docker-compose -f docker-compose.full.yml down
        echo "✅ Services stopped!"
        ;;
    
    test)
        echo "🧪 Running E2E tests in Docker..."
        # First ensure backend is running
        docker-compose -f docker-compose.full.yml up -d backend
        sleep 5
        # Run tests
        docker-compose -f docker-compose.full.yml --profile test run --rm test-runner
        echo "✅ Tests completed! Check playwright-report/index.html for results"
        ;;
    
    test-local)
        echo "🧪 Running tests against local services..."
        # Ensure local services are running
        if ! curl -s http://localhost:8082/health > /dev/null; then
            echo "❌ Backend not running on port 8082. Start it first!"
            exit 1
        fi
        npx playwright test --reporter=list,html
        echo "✅ Tests completed!"
        ;;
    
    logs)
        echo "📋 Showing service logs..."
        docker-compose -f docker-compose.full.yml logs -f
        ;;
    
    clean)
        echo "🧹 Cleaning up..."
        docker-compose -f docker-compose.full.yml down -v
        rm -rf test-results playwright-report
        echo "✅ Cleanup completed!"
        ;;
    
    rebuild)
        echo "🔨 Rebuilding Docker images..."
        docker-compose -f docker-compose.full.yml build --no-cache
        echo "✅ Images rebuilt!"
        ;;
    
    *)
        show_usage
        ;;
esac