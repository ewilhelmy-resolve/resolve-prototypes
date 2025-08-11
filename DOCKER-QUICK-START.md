# Docker Quick Start Guide

## 🚀 Quick Start

### Production Container
```bash
# Build and run the production container
./update-container.sh

# Or use npm scripts
npm run docker:prod
```

### Development Container (with hot-reloading)
```bash
npm run docker:dev
```

## 📦 Container Management

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Rebuild container from scratch |
| `npm run docker:prod` | Start production container |
| `npm run docker:dev` | Start development container with hot-reloading |
| `npm run docker:logs` | View container logs |
| `npm run docker:stop` | Stop all containers |

### Manual Docker Commands

```bash
# Build container
docker-compose build

# Start container (detached)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop container
docker-compose down

# Rebuild without cache
docker-compose build --no-cache

# Remove all containers and volumes
docker-compose down -v
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 8082)
- `NODE_ENV`: Environment (production/development)
- `DATABASE_PATH`: SQLite database path
- `WEBHOOK_ENABLED`: Enable webhook calls (true/false)

### Volumes
- `./data`: Database storage (persisted)
- `./uploads`: File uploads (persisted)

### Ports
- `8082`: Main application

## 🌐 Access Points

- **Main Application**: http://localhost:8082
- **Jarvis Dashboard**: http://localhost:8082/jarvis.html
- **Health Check**: http://localhost:8082/health
- **API Endpoints**:
  - Upload CSV: POST http://localhost:8082/api/tickets/upload
  - View Webhooks: GET http://localhost:8082/api/webhooks
  - Analytics: GET http://localhost:8082/api/analytics/dashboard

## 🔍 Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs

# Check if port is in use
lsof -i:8082

# Clean up and rebuild
docker-compose down -v
docker system prune -f
./update-container.sh
```

### Database issues
```bash
# Reset database
rm -rf ./data/*
docker-compose restart
```

### Permission issues
```bash
# Fix permissions on Linux/Mac
chmod +x update-container.sh
sudo chown -R $USER:$USER ./data ./uploads
```

## 🔄 Updates

To update the container with new changes:

1. Make your code changes
2. Run the update script:
   ```bash
   ./update-container.sh
   ```

This will:
- Stop the existing container
- Rebuild with new changes
- Start the updated container
- Verify it's running correctly