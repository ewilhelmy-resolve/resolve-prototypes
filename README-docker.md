# Docker Setup for Resolve Onboarding

## Overview
This application has been streamlined to use a single, unified Docker Compose configuration with PostgreSQL as the primary database.

## Quick Start

### 1. Copy Environment Variables
```bash
cp .env.example .env
# Edit .env to set your own passwords and configuration
```

### 2. Start the Application
```bash
# Production mode (detached)
npm run docker:up

# Development mode (with hot reload)
npm run docker:dev

# With frontend (nginx)
npm run docker:frontend
```

### 3. Access the Application
- **Main App**: http://localhost:8082
- **Frontend (if enabled)**: http://localhost:8080
- **PostgreSQL**: localhost:5432

## Architecture

### Services

#### PostgreSQL Database
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Database**: resolve_onboarding
- **User**: resolve_user
- **Data**: Persisted in Docker volume

#### Application Server
- **Build**: Multi-stage Dockerfile
- **Port**: 8082
- **Features**:
  - Express.js backend
  - PostgreSQL integration
  - File upload support
  - API key management
  - Webhook integration

#### Nginx (Optional)
- **Port**: 8080
- **Profile**: frontend
- **Purpose**: Static file serving and API proxy

## Database Configuration

The application now uses PostgreSQL for all data storage:
- User authentication
- Ticket management
- CSV uploads
- API keys and tenant isolation
- Analytics and metrics
- Integration configurations

### Database Migrations
```bash
# Initialize database schema
npm run db:init

# Migrate from SQLite to PostgreSQL (if needed)
npm run db:migrate
```

## Docker Commands

### Basic Operations
```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Rebuild containers
npm run docker:rebuild

# Clean everything (including volumes)
npm run docker:clean
```

### Development Mode
```bash
# Start with hot reload and volume mounting
npm run docker:dev
```

This mounts your local directory into the container for real-time updates.

### Production Mode
```bash
# Start in background
npm run docker:up

# With custom ports
APP_PORT=3000 NGINX_PORT=80 npm run docker:up
```

## Environment Variables

Key environment variables (see `.env.example`):

```env
# Database
DB_PASSWORD=your_secure_password
DATABASE_URL=postgresql://resolve_user:password@postgres:5432/resolve_onboarding

# Application
NODE_ENV=production
APP_PORT=8082
NGINX_PORT=8080

# Security
JWT_SECRET=your-secret-key

# Features
WEBHOOK_ENABLED=true
```

## Default Admin Credentials

- **Email**: john@resolve.io
- **Password**: !Password1

These credentials are automatically created when the PostgreSQL database is initialized.

## Testing CSV Upload

1. Navigate to http://localhost:8082
2. Click "Log in here"
3. Enter credentials (john@resolve.io / !Password1)
4. After login, click "Upload Ticket CSV"
5. Select `sample-tickets.csv`
6. Verify upload success

## Build Targets

The Dockerfile supports multiple build targets:

- **base**: Base image with production dependencies
- **development**: Includes dev dependencies and hot reload
- **production**: Optimized production build
- **test**: Test runner with Playwright

Set the target using:
```bash
BUILD_TARGET=development docker-compose up
```

## Networking

All services communicate through the `resolve-network` Docker network:
- Internal service discovery by name (e.g., `postgres`, `app`)
- Isolated from host network
- Secure inter-service communication

## Data Persistence

PostgreSQL data is persisted in a named Docker volume:
- Survives container restarts
- Can be backed up separately
- Remove with `docker-compose down -v`

## Health Checks

All services include health checks:
- **PostgreSQL**: `pg_isready` command
- **App**: HTTP endpoint at `/health`
- **Automatic restarts** on failure

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Connect to PostgreSQL directly
docker-compose exec postgres psql -U resolve_user -d resolve_onboarding
```

### Application Issues
```bash
# View application logs
docker-compose logs app

# Restart application
docker-compose restart app

# Rebuild application
docker-compose build --no-cache app
```

### Clean Start
```bash
# Remove everything and start fresh
npm run docker:clean
npm run docker:rebuild
npm run docker:up
```

## Security Notes

1. **Change default passwords** in production
2. **Use secrets management** for sensitive data
3. **Enable SSL/TLS** for production deployments
4. **Restrict database access** to application only
5. **Regular security updates** for base images

## Migration from Old Setup

If you're migrating from the old multi-file Docker setup:

1. Stop all old containers: `docker-compose -f docker-compose.old.yml down`
2. Backup any SQLite databases if needed
3. Copy `.env.example` to `.env` and configure
4. Run database migration: `npm run db:migrate`
5. Start new setup: `npm run docker:up`

## Removed Files

The following Docker files have been consolidated:
- `docker-compose.dev.yml` → Use `npm run docker:dev`
- `docker-compose.full.yml` → Use main `docker-compose.yml`
- `docker-compose.backend.yml` → Use main `docker-compose.yml`
- `Dockerfile.simple` → Merged into main `Dockerfile`
- `Dockerfile.backend` → Merged into main `Dockerfile`
- `Dockerfile.dev` → Use `BUILD_TARGET=development`
- `Dockerfile.production` → Use `BUILD_TARGET=production`
- `Dockerfile.test` → Use `BUILD_TARGET=test`

## Support

For issues or questions:
1. Check logs: `npm run docker:logs`
2. Verify environment variables in `.env`
3. Ensure ports 8082 and 5432 are available
4. Check Docker daemon is running