# Production Environment Variables Setup

## IMPORTANT: Never commit .env files to GitHub!

Environment variables should be set directly in your production environment (e.g., GitHub Secrets, Railway, Heroku, etc.).

## Required Environment Variables

### 1. Database Configuration (CRITICAL - This is why you're getting 500 errors)
```bash
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
```
- **Required**: YES
- **Description**: PostgreSQL connection string
- **Example for Supabase**: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`

### 2. Security
```bash
JWT_SECRET=your-secret-key-change-in-production
```
- **Required**: YES
- **Description**: Secret key for JWT token signing
- **Important**: Use a strong, random string in production

### 3. Application Configuration
```bash
NODE_ENV=production
PORT=5000
APP_URL=https://onboarding.resolve.io
```
- **Required**: YES
- **Description**: Basic app configuration

### 4. Webhook Configuration (For Actions Platform Integration)
```bash
WEBHOOK_ENABLED=true
AUTOMATION_WEBHOOK_URL=https://actions-api-staging.resolve.io/api/Webhooks/postEvent/00F4F67D-3B92-4FD2-A574-7BE22C6BE796
AUTOMATION_AUTH=Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj
```
- **Required**: YES (for RAG features)
- **Description**: Integration with Resolve Actions Platform

### 5. Optional Settings
```bash
MAX_DOCUMENT_SIZE=51200
VECTOR_DIMENSION=1536
```

## How to Set in Different Platforms

### GitHub Actions (for deployment)
1. Go to your GitHub repository
2. Click Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each environment variable as a secret

### Railway/Render/Heroku
Use their respective environment variable settings in the dashboard.

### Docker Compose (for self-hosted)
Create a `.env` file locally (but never commit it):
```bash
cp .env.example .env
# Edit .env with your values
```

### Kubernetes
Use ConfigMaps and Secrets:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://..."
  JWT_SECRET: "your-secret"
```

## Testing Your Configuration

After setting environment variables, test the connection:
```bash
# Test database connection
curl https://onboarding.resolve.io/api/health

# Test RAG endpoints
curl https://onboarding.resolve.io/api/rag/documents \
  -H "Cookie: sessionToken=YOUR_SESSION_TOKEN"
```

## Troubleshooting

If you're getting 500 errors:
1. Check that DATABASE_URL is set correctly
2. Verify the database is accessible from production
3. Check logs for specific error messages
4. Ensure all required tables exist (run migrations)

## Security Notes
- Never expose these variables in client-side code
- Rotate JWT_SECRET periodically
- Use different credentials for production vs development
- Enable SSL for database connections in production