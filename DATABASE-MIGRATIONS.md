# Database Migration System

## Overview
The application now includes an idempotent database migration system that automatically creates and updates all database tables during application startup. This ensures production deployments work correctly even with empty databases.

## Features
- **Automatic Schema Creation**: All tables, indexes, and triggers are created on startup
- **Idempotent Operations**: Safe to run multiple times - won't fail if tables already exist
- **Multi-Database Support**: Works with both PostgreSQL (production) and SQLite (development)
- **Admin User Creation**: Automatically creates default admin user if not exists
- **Zero Downtime**: Non-destructive migrations that preserve existing data

## How It Works

### PostgreSQL (Production)
1. On startup, `database-postgres.js` calls `runPostgreSQLMigrations()`
2. Reads `init.sql` and executes all statements
3. Handles "already exists" errors gracefully
4. Creates admin user if not present

### SQLite (Development)
1. On startup, `database.js` calls `runSQLiteMigrations()`
2. Creates all tables with IF NOT EXISTS clauses
3. Creates indexes
4. Creates admin user if not present

## Database Schema

### Core Tables
- `users` - User authentication and profiles
- `sessions` - Active user sessions
- `tickets` - IT service tickets
- `csv_uploads` - CSV file upload tracking
- `api_keys` - API key management
- `integrations` - External service integrations
- `pending_validations` - Async validation tracking

### Analytics Tables
- `analytics_events` - User interaction tracking
- `onboarding_funnel` - Conversion funnel metrics
- `page_metrics` - Page performance data
- `conversions` - Conversion tracking
- `webhook_calls` - Webhook activity logs

## Default Admin User
- Email: `john@resolve.io`
- Password: `AdminPassword1`
- Tier: Premium
- Created automatically on first startup

## Deployment Instructions

### Docker Deployment
```bash
# The migrations run automatically when containers start
docker-compose up -d
```

### Manual Deployment
1. Set environment variables:
   ```bash
   export DATABASE_TYPE=postgresql
   export DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```

2. Start the application:
   ```bash
   node server-enhanced.js
   ```

3. Migrations run automatically on startup

### Verification
Check migration status in logs:
```bash
# Docker
docker-compose logs app | grep -i migration

# Direct
grep -i migration app.log
```

Expected output:
```
🔄 Running PostgreSQL database migrations...
✅ PostgreSQL migrations complete: 29 executed, 0 skipped
✅ Admin user created: john@resolve.io
```

## Troubleshooting

### Issue: Tables not created
- Check database connection string
- Verify user has CREATE TABLE permissions
- Check logs for specific error messages

### Issue: Admin user not created
- May already exist from previous run
- Check users table: `SELECT * FROM users WHERE email='john@resolve.io'`

### Issue: Migrations fail
- Check database permissions
- Ensure init.sql is present in deployment
- Verify DATABASE_TYPE environment variable is set correctly

## Migration Files
- `/database-migrations.js` - Migration logic
- `/init.sql` - PostgreSQL schema definition
- `/database-postgres.js` - PostgreSQL initialization
- `/database.js` - SQLite initialization

## Environment Variables
- `DATABASE_TYPE`: Set to `postgresql` for production
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Set to `production` for production deployments

## Security Notes
- Admin password should be changed after first login in production
- Database credentials should use environment variables
- SSL/TLS should be enabled for database connections in production

## Testing Migrations
```bash
# Test with fresh database
docker-compose down -v
docker-compose up -d
docker-compose exec app curl http://localhost:8082/health

# Verify admin login
curl -X POST http://localhost:8082/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@resolve.io","password":"AdminPassword1"}'
```