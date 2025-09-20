# Staging Deployment Secrets Setup

Since GitHub Environments aren't available, this project uses **prefixed repository secrets** for environment separation.

## Required Repository Secrets

Navigate to **Settings → Secrets and variables → Actions** in your GitHub repository and add these secrets:

### 📦 Frontend Build Secrets
```
STAGING_VITE_KEYCLOAK_URL=https://your-staging-keycloak.example.com
STAGING_VITE_KEYCLOAK_REALM=your-staging-realm
STAGING_VITE_KEYCLOAK_CLIENT_ID=your-staging-client-id
```

### 🗃️ Backend Infrastructure Secrets
```
STAGING_DATABASE_URL=postgresql://username:password@your-staging-db:5432/database_name
STAGING_RABBITMQ_URL=amqp://username:password@your-staging-rabbitmq:5672
STAGING_REDIS_URL=redis://your-staging-redis:6379
```

### 🔐 Keycloak API Secrets
```
STAGING_KEYCLOAK_URL=http://your-internal-keycloak:8080
STAGING_KEYCLOAK_REALM=your-staging-realm
STAGING_KEYCLOAK_ISSUER=https://your-staging-keycloak.example.com/realms/your-staging-realm
```

### 🌐 External Service Secrets
```
STAGING_AUTOMATION_WEBHOOK_URL=https://your-staging-automation.example.com/webhook
STAGING_AUTOMATION_AUTH=your-staging-auth-token
STAGING_CLIENT_URL=https://your-staging-app.example.com
```

### 🚀 Deployment Secrets
```
STAGING_DEPLOY_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
...your actual staging server SSH private key content...
-----END OPENSSH PRIVATE KEY-----
```

### 📢 Notification Secrets (Optional)
```
STAGING_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/TOKEN
STAGING_URL=https://your-staging-app.example.com
```

## Required Repository Variables

Navigate to **Settings → Secrets and variables → Actions → Variables** and add:

```
STAGING_DEPLOY_HOST=your-staging-server.example.com
STAGING_DEPLOY_USER=your-deploy-user
```

## 🎯 How It Works

### Frontend Build-Time Configuration
The frontend build uses `STAGING_VITE_*` secrets to bake configuration into the built assets:

```yaml
env:
  VITE_KEYCLOAK_URL: ${{ secrets.STAGING_VITE_KEYCLOAK_URL }}
  VITE_KEYCLOAK_REALM: ${{ secrets.STAGING_VITE_KEYCLOAK_REALM }}
  VITE_KEYCLOAK_CLIENT_ID: ${{ secrets.STAGING_VITE_KEYCLOAK_CLIENT_ID }}
```

### Backend Runtime Configuration
The API server gets `STAGING_*` secrets at runtime via docker-compose:

```yaml
environment:
  DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
  KEYCLOAK_URL: ${{ secrets.STAGING_KEYCLOAK_URL }}
  # ... other runtime configs
```

## 🔧 Environment Separation Strategy

### Development vs Staging vs Production
```
# Development (local .env)
VITE_KEYCLOAK_URL=http://localhost:8080
DATABASE_URL=postgresql://rita:rita@localhost:5432/rita

# Staging (STAGING_* secrets - example values)
STAGING_VITE_KEYCLOAK_URL=https://your-staging-keycloak.example.com
STAGING_DATABASE_URL=postgresql://user:pass@your-staging-db:5432/staging_db

# Production (PRODUCTION_* secrets - future example values)
PRODUCTION_VITE_KEYCLOAK_URL=https://your-production-keycloak.example.com
PRODUCTION_DATABASE_URL=postgresql://user:pass@your-production-db:5432/production_db
```

## ⚠️ Important Notes

### Secret Security
- **Never commit actual secret values** to the repository
- Use strong, unique passwords for each environment
- Rotate secrets regularly
- Use different database/service credentials per environment

### Network Configuration
- **Frontend URLs** (`STAGING_VITE_*`) must be **browser-accessible**
- **Backend URLs** (`STAGING_*`) can be **internal service names** (for Docker)
- **Keycloak Issuer** must match what the frontend uses for JWT validation

### Validation
Before enabling deployment, test your secrets:

1. **Build-only test**: Push to your test branch to validate frontend builds
2. **Secret validation**: Ensure all secrets are set correctly
3. **Network connectivity**: Verify backend can reach databases/services

## 🚀 Enabling Full Deployment

Once secrets are configured and build is validated:

1. **Uncomment deployment jobs** in `.github/workflows/deploy-staging.yml`
2. **Test SSH access** to staging server
3. **Verify staging server setup** (Docker, docker-compose installed)
4. **Run first deployment** and monitor logs

## 🔄 Production Pipeline (Future)

When ready for production, create similar `PRODUCTION_*` prefixed secrets and a separate `deploy-production.yml` workflow triggered by Git tags.

---

## ✅ Quick Checklist

- [ ] All `STAGING_VITE_*` secrets added
- [ ] All `STAGING_*` backend secrets added
- [ ] `STAGING_DEPLOY_SSH_KEY` configured
- [ ] `STAGING_DEPLOY_HOST` and `STAGING_DEPLOY_USER` variables set
- [ ] Build-only workflow tested successfully
- [ ] Staging server prepared for deployment
- [ ] Ready to uncomment deployment jobs