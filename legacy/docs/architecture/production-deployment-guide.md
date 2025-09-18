# Production Deployment Guide

## Phase 3: Production Setup - Deployment Instructions

This guide walks you through deploying the Resolve Onboarding application in a production environment using the Phase 3 production setup components.

## Quick Start

### 1. Install Dependencies

```bash
# Install PM2 globally (if not using Docker)
npm install -g pm2

# Install production dependencies
npm ci --production
```

### 2. Run Database Migration

```bash
# Run production migration script
npm run migrate:production

# Or manually:
node scripts/migrate-to-production.js
```

### 3. Start Production Server

#### Option A: Using PM2 (Recommended)

```bash
# Start with PM2
npm run prod

# Check status
pm2 status

# View logs
pm2 logs resolve-app

# Monitor
pm2 monit
```

#### Option B: Using Docker

```bash
# Build production image
docker build --target production -t resolve-app:production .

# Run with docker-compose
docker-compose up -d

# Or run standalone
docker run -d -p 5000:5000 --env-file .env resolve-app:production
```

## Production Components Overview

### 1. PM2 Configuration (`ecosystem.config.js`)
- **Cluster Mode**: Automatically spawns processes based on CPU cores
- **Zero-Downtime Reloads**: `pm2 reload resolve-app`
- **Log Rotation**: Logs stored in `./logs/` directory
- **Memory Management**: Restart if memory usage exceeds 1GB
- **Health Monitoring**: Built-in health checks

### 2. Optimized Docker Setup
- **Multi-stage Build**: Reduces final image size (258MB)
- **Non-root User**: Runs as `nodejs` user (UID 1001)
- **Health Checks**: Built-in health monitoring
- **Security**: No unnecessary packages in production image
- **PM2 Runtime**: Uses `pm2-runtime` for container management

### 3. Database Optimizations
- **Password Hashing**: Migrates plaintext passwords to bcrypt
- **Performance Indexes**: Adds indexes on frequently queried columns
- **Session Cleanup**: Removes expired sessions
- **Constraints**: Ensures data integrity
- **Schema Versioning**: Tracks migration history

### 4. Load Balancer Ready
- **Health Check Endpoint**: `/health` returns application status
- **Session Storage**: Database-backed sessions (not sticky)
- **Nginx Configuration**: Production-ready load balancer config
- **Rate Limiting**: Built-in rate limiting support

## Detailed Setup Instructions

### Environment Configuration

Create a production `.env` file:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://username:password@host:5432/database
DB_MAX_CONNECTIONS=20

# Security
JWT_SECRET=your-super-secure-32-character-secret-here
SESSION_SECRET=another-super-secure-32-character-secret
BCRYPT_ROUNDS=10

# Features
WEBHOOKS_ENABLED=true
RAG_ENABLED=true
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# Monitoring (optional)
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn-here
```

### PM2 Production Deployment

```bash
# 1. Clone and setup
git clone https://github.com/resolve-io/resolve-onboarding.git
cd resolve-onboarding

# 2. Install dependencies
npm ci --production

# 3. Run migrations
npm run migrate:production

# 4. Start with PM2
pm2 start ecosystem.config.js --env production

# 5. Save PM2 configuration
pm2 save
pm2 startup

# 6. Check status
pm2 status
pm2 logs resolve-app
```

### Docker Production Deployment

```bash
# 1. Build production image
docker build --target production -t resolve-app:production .

# 2. Run with environment
docker run -d \
  --name resolve-app \
  -p 5000:5000 \
  --env-file .env \
  --restart unless-stopped \
  resolve-app:production

# 3. Check health
curl http://localhost:5000/health

# 4. View logs
docker logs resolve-app
```

### Load Balancer Setup

```bash
# 1. Install Nginx
sudo apt update
sudo apt install nginx

# 2. Copy configuration
sudo cp nginx.conf.example /etc/nginx/sites-available/resolve-onboarding
sudo ln -s /etc/nginx/sites-available/resolve-onboarding /etc/nginx/sites-enabled/

# 3. Test configuration
sudo nginx -t

# 4. Start Nginx
sudo systemctl enable nginx
sudo systemctl restart nginx

# 5. Test load balancer
curl -I http://localhost/nginx-health
```

## Production Monitoring

### Health Checks

The application provides a comprehensive health check endpoint at `/health`:

```bash
# Check application health
curl -s http://localhost:5000/health | jq

# Expected response:
{
  "status": "healthy",
  "checks": {
    "database": true,
    "memory": true,
    "uptime": true,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs resolve-app --lines 100

# Restart application
pm2 restart resolve-app

# Reload (zero-downtime)
pm2 reload resolve-app

# Process information
pm2 describe resolve-app
```

### Log Management

Logs are automatically managed by PM2:
- **Error logs**: `./logs/pm2-error.log`
- **Output logs**: `./logs/pm2-out.log`  
- **Combined logs**: `./logs/pm2-combined.log`

### Performance Monitoring

```bash
# CPU and memory usage
pm2 list

# Detailed process info
pm2 describe resolve-app

# Real-time monitoring
pm2 monit
```

## Scaling and High Availability

### Horizontal Scaling

1. **Deploy Multiple Instances**:
   ```bash
   # Server 1
   pm2 start ecosystem.config.js --env production

   # Server 2  
   pm2 start ecosystem.config.js --env production

   # Server 3
   pm2 start ecosystem.config.js --env production
   ```

2. **Configure Load Balancer**:
   - Update `nginx.conf.example` with your server IPs
   - Enable health checks for automatic failover

3. **Database Scaling**:
   - Use read replicas for database scaling
   - Consider connection pooling optimizations

### Zero-Downtime Deployments

```bash
# 1. Deploy new code
git pull origin main
npm ci --production

# 2. Run any new migrations
npm run migrate:production

# 3. Reload application (zero-downtime)
pm2 reload resolve-app

# 4. Verify deployment
curl -s http://localhost:5000/health
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup-20240101_120000.sql
```

### Application Backup

```bash
# Backup application files
tar -czf resolve-app-backup-$(date +%Y%m%d).tar.gz \
  --exclude node_modules \
  --exclude logs \
  --exclude uploads/knowledge \
  .
```

### Rollback Plan

```bash
# 1. Stop current version
pm2 stop resolve-app

# 2. Restore previous version
git checkout previous-stable-tag
npm ci --production

# 3. Rollback database (if needed)
node scripts/rollback-production.js

# 4. Start application
pm2 start resolve-app

# 5. Verify rollback
curl -s http://localhost:5000/health
```

## Security Considerations

### SSL/TLS Configuration

1. **Obtain SSL Certificate**:
   ```bash
   # Using Let's Encrypt
   sudo certbot --nginx -d resolve.io -d www.resolve.io
   ```

2. **Update Nginx Configuration**:
   - Enable HTTPS redirects
   - Configure security headers
   - Set up proper SSL settings

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Security Headers

The application automatically includes security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Troubleshooting

### Common Issues

1. **Application Won't Start**:
   ```bash
   # Check logs
   pm2 logs resolve-app --lines 50
   
   # Check configuration
   pm2 describe resolve-app
   ```

2. **Database Connection Issues**:
   ```bash
   # Test database connection
   node -e "const {Pool}=require('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL});pool.query('SELECT NOW()').then(()=>console.log('Connected')).catch(console.error).finally(()=>process.exit())"
   ```

3. **High Memory Usage**:
   ```bash
   # Check memory usage
   pm2 describe resolve-app
   
   # Restart if needed
   pm2 restart resolve-app
   ```

4. **Load Balancer Issues**:
   ```bash
   # Check Nginx status
   sudo systemctl status nginx
   
   # Test configuration
   sudo nginx -t
   
   # Check access logs
   sudo tail -f /var/log/nginx/access.log
   ```

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migration completed
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Load balancer configured
- [ ] Health checks working
- [ ] Logs rotating properly
- [ ] Performance baseline established

## Support

For production issues:
1. Check application logs: `pm2 logs resolve-app`
2. Check system resources: `htop`, `free -h`, `df -h`
3. Verify health endpoint: `curl http://localhost:5000/health`
4. Review configuration: `pm2 describe resolve-app`

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: Production Ready