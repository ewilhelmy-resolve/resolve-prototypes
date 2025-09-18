# Supabase Setup Guide

## Quick Start

1. **Update your `.env` file** with your Supabase connection string:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.wgqdwdzlhspipdvhedkv.supabase.co:5432/postgres
   ```
   Replace `[YOUR-PASSWORD]` with your actual Supabase database password.

2. **Test the connection**:
   ```bash
   node scripts/test-supabase.js
   ```

3. **Run migrations**:
   ```bash
   node scripts/migrate-supabase.js
   ```

4. **Create admin user**:
   ```bash
   node scripts/create-admin.js
   ```
   Default credentials:
   - Email: `admin@resolve.io`
   - Password: `admin123`

5. **Start the application**:
   ```bash
   docker-compose up -d
   ```

## Supabase Dashboard Setup

### Enable pgvector Extension

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Run this command:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Get Your Connection String

1. In Supabase Dashboard, go to **Settings** → **Database**
2. Find **Connection string** section
3. Copy the **URI** (it starts with `postgresql://`)
4. Replace the password placeholder with your actual password

## Local Development

### Using Supabase (Recommended)
Your app will connect directly to Supabase cloud database. This ensures:
- pgvector works correctly
- Same environment as production
- No Docker PostgreSQL needed locally

### Using Local PostgreSQL (Alternative)
If you prefer local PostgreSQL:

1. Update `.env` to use local connection:
   ```
   DATABASE_URL=postgresql://resolve_user:resolve_pass@localhost:5432/resolve_onboarding
   ```

2. Uncomment the `postgres` service in `docker-compose.yml`

3. Run with local PostgreSQL:
   ```bash
   docker-compose up -d
   ```

## Production Deployment

### GitHub Secrets Setup

Add these secrets in GitHub → Settings → Secrets → Actions:

1. **SUPABASE_DATABASE_URL**: Your full Supabase connection string
2. **ONBOARDING_GITHUB_TOKEN**: For GitHub Container Registry
3. **DEPLOY_ONBOARDING_SSH_KEY**: SSH key for EC2 deployment

### Deployment Process

The GitHub Action will:
1. Build and push Docker image to GHCR
2. SSH to EC2 instance
3. Pull latest image
4. Connect to Supabase (no local PostgreSQL)
5. Run migrations automatically
6. Create admin user if needed
7. Verify pgvector support

## Troubleshooting

### Connection Issues

If you see connection errors:

1. **Check password**: Make sure you replaced `[YOUR-PASSWORD]` with actual password
2. **Check firewall**: Supabase requires port 5432 open
3. **Test connection**: Run `node scripts/test-supabase.js`

### pgvector Issues

If vector operations fail:

1. Enable extension in Supabase SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. Verify it's enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

### Migration Issues

If migrations fail:

1. Check current schema:
   ```bash
   node scripts/test-supabase.js
   ```

2. Run migrations manually:
   ```bash
   node scripts/migrate-supabase.js
   ```

3. Check migration logs for specific errors

## Benefits of Using Supabase

- ✅ **pgvector pre-installed**: No compilation needed
- ✅ **Managed backups**: Automatic daily backups
- ✅ **SSL encryption**: Secure connections by default
- ✅ **Scalability**: Easy to scale up as needed
- ✅ **Monitoring**: Built-in performance monitoring
- ✅ **Free tier**: Generous free tier for development

## Security Notes

- Never commit `.env` file with real passwords
- Use GitHub Secrets for production credentials
- Enable Row Level Security (RLS) in Supabase for additional security
- Regularly rotate database passwords
- Use read-only credentials where possible