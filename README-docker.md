# Docker Setup - Resolve Onboarding

## Single Container Architecture

This application runs as a **single Docker container** serving both the frontend and backend on port 8082.

## Quick Start

```bash
# Build the container
docker-compose build

# Start the application
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

## Access Points

- **Application**: http://localhost:8082
- **Health Check**: http://localhost:8082/health
- **API**: http://localhost:8082/api/*

## Default Credentials

- **Email**: john@resolve.io
- **Password**: !Password1

## Docker Files

- `Dockerfile.simple` - Single container setup with Node.js
- `docker-compose.yml` - Simple compose configuration
- `data/` - Persistent volume for SQLite database

## Testing CSV Upload

1. Navigate to http://localhost:8082
2. Click "Log in here"
3. Enter credentials (john@resolve.io / !Password1)
4. After login, click "Upload Ticket CSV"
5. Select `sample-tickets.csv`
6. Verify upload success

## Container Features

- **Port**: 8082
- **Health Check**: Every 30s
- **Auto-restart**: Unless stopped
- **Persistent Data**: ./data volume
- **Database**: SQLite with pre-seeded admin

## Commands

```bash
# Rebuild container (after code changes)
docker-compose build --no-cache

# View container logs
docker-compose logs app

# Execute command in container
docker-compose exec app sh

# Run tests
docker-compose exec app npm test

# Reset database
docker-compose down -v
docker-compose up -d
```

## Environment Variables

- `NODE_ENV=production`
- `PORT=8082`

## Troubleshooting

### Container won't start
```bash
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up -d
```

### Port already in use
```bash
# Find process using port
lsof -i :8082
# Or change port in docker-compose.yml
```

### Database issues
```bash
# Remove data volume and recreate
rm -rf data/
docker-compose down -v
docker-compose up -d
```