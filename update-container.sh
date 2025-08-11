#!/bin/bash

echo "🚀 Updating Resolve Onboarding Container..."
echo ""

# Stop existing container
echo "📦 Stopping existing container..."
docker-compose down

# Clean up old images (optional)
echo "🧹 Cleaning up old images..."
docker system prune -f

# Build new container
echo "🔨 Building new container..."
docker-compose build --no-cache

# Start the container
echo "▶️ Starting container..."
docker-compose up -d

# Wait for health check
echo "⏳ Waiting for health check..."
sleep 5

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Container updated and running successfully!"
    echo ""
    echo "📍 Access the application at: http://localhost:8082"
    echo "📊 Automations page: http://localhost:8082/jarvis.html"
    echo ""
    echo "🔍 View logs with: docker-compose logs -f"
else
    echo "❌ Container failed to start. Check logs with: docker-compose logs"
    exit 1
fi