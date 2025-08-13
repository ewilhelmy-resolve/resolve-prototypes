# Docker Setup

## Quick Start

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `DB_PASSWORD`: PostgreSQL password (default: resolve_secure_pass_2024)
- `APP_PORT`: Application port (default: 8082)
- `NODE_ENV`: Environment (production/development)
- `AUTOMATION_WEBHOOK_URL`: Automation engine webhook URL
- `AUTOMATION_AUTH`: Basic auth for automation engine
- `TENANT_TOKEN`: Tenant identifier

## Services

### PostgreSQL Database
- Port: 5432
- Database: resolve_onboarding
- User: resolve_user

### Application
- Port: 8082
- Health check: http://localhost:8082/health

## Development

```bash
# Rebuild after code changes
docker-compose build app

# Run with development target
BUILD_TARGET=development docker-compose up

# Execute commands in container
docker-compose exec app sh
```

## Testing

```bash
# Run Playwright tests
npm test

# Run specific test
npx playwright test tests/jira-integration-simple.spec.js
```

## Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U resolve_user -d resolve_onboarding

# View tables
docker-compose exec postgres psql -U resolve_user -d resolve_onboarding -c "\dt"

# Backup database
docker-compose exec postgres pg_dump -U resolve_user resolve_onboarding > backup.sql

# Restore database
docker-compose exec -T postgres psql -U resolve_user resolve_onboarding < backup.sql
```

## Troubleshooting

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs app
docker-compose logs postgres

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Check application health
curl http://localhost:8082/health
```

## Production Deployment

1. Set appropriate environment variables in `.env`
2. Use production build target (default)
3. Enable SSL/TLS termination (nginx/load balancer)
4. Configure proper database backups
5. Set up monitoring and logging

## API Endpoints

- `/health` - Health check
- `/api/auth/signup` - User registration
- `/api/auth/login` - User login
- `/api/integrations/validate-jira` - Jira validation
- `/api/integrations/status-stream/:id` - SSE status updates
- `/api/integrations/callback/:id` - Automation callbacks