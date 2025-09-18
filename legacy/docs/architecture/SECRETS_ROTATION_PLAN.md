# Secrets Rotation Plan

## Overview

This document outlines the plan and procedures for regular rotation of all sensitive credentials and secrets used in the Resolve Onboarding application.

## Rotation Schedule

### Critical Secrets (Every 90 days)
- `JWT_SECRET` - JSON Web Token signing key
- `SESSION_SECRET` - Session encryption key
- `AUTOMATION_AUTH` - Webhook authentication credentials
- Database passwords

### High-Priority Secrets (Every 180 days)
- `OPENAI_API_KEY` - OpenAI API access key
- `SENTRY_DSN` - Error tracking service credentials
- `SMTP_PASS` - Email service password
- Redis authentication (if used)

### Medium-Priority Secrets (Annually)
- SSL/TLS certificates
- S3 bucket access keys (if used)
- Third-party service API keys

## Rotation Procedures

### 1. JWT_SECRET Rotation

**Impact**: All active user sessions will be invalidated
**Downtime**: None (graceful transition possible)

```bash
# 1. Generate new secret
NEW_JWT_SECRET=$(openssl rand -base64 48)

# 2. Update environment variable
echo "JWT_SECRET=$NEW_JWT_SECRET" >> .env

# 3. Restart application (or use rolling deployment)
docker-compose restart app

# 4. Monitor for any authentication issues
```

**Rollback Plan**: Keep old secret for 24 hours, restore if issues occur

### 2. SESSION_SECRET Rotation

**Impact**: All active user sessions will be invalidated
**Downtime**: None

```bash
# 1. Generate new secret
NEW_SESSION_SECRET=$(openssl rand -base64 48)

# 2. Update environment variable
echo "SESSION_SECRET=$NEW_SESSION_SECRET" >> .env

# 3. Restart application
docker-compose restart app

# 4. Users will need to re-login
```

### 3. Database Password Rotation

**Impact**: Application database access
**Downtime**: ~30 seconds

```bash
# 1. Create new database user/password
NEW_DB_PASS=$(openssl rand -base64 32)

# 2. Update database with new credentials
# (Steps depend on your database setup)

# 3. Update DATABASE_URL environment variable
# 4. Test connection
# 5. Restart application
# 6. Remove old database user
```

### 4. AUTOMATION_AUTH Rotation

**Impact**: Webhook authentication may fail temporarily
**Downtime**: None

```bash
# 1. Generate new authentication token
NEW_AUTH=$(echo -n "username:new_password" | base64)

# 2. Update webhook service with new credentials
# 3. Update AUTOMATION_AUTH environment variable
# 4. Restart application
# 5. Test webhook functionality
```

## Pre-Rotation Checklist

- [ ] Backup current configuration
- [ ] Notify team of planned rotation
- [ ] Verify monitoring systems are active
- [ ] Prepare rollback plan
- [ ] Test rotation in staging environment

## Post-Rotation Checklist

- [ ] Verify application functionality
- [ ] Check all integrations work
- [ ] Monitor error rates for 1 hour
- [ ] Update documentation
- [ ] Securely dispose of old secrets

## Automated Rotation

### Using AWS Secrets Manager

```javascript
// Example: Automatic secret rotation with AWS
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function rotateSecret(secretName) {
    try {
        await secretsManager.rotateSecret({
            SecretId: secretName,
            ForceRotateSecrets: false
        }).promise();
        
        console.log(`Secret ${secretName} rotation initiated`);
    } catch (error) {
        console.error('Rotation failed:', error);
    }
}
```

### Using Azure Key Vault

```javascript
// Example: Azure Key Vault integration
const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

const client = new SecretClient(
    `https://${keyVaultName}.vault.azure.net/`,
    new DefaultAzureCredential()
);

async function rotateSecret(secretName) {
    const newSecret = generateSecureSecret();
    await client.setSecret(secretName, newSecret);
}
```

## Monitoring and Alerting

### Key Metrics to Monitor
- Authentication failure rate
- Session creation/destruction rate
- Database connection errors
- Webhook delivery success rate

### Alert Thresholds
- Authentication failures > 10% increase: Immediate alert
- Database connections failing: Critical alert
- Webhook failures > 5%: Warning alert

## Emergency Procedures

### If Secrets Are Compromised

1. **Immediate Actions**
   - Rotate all affected secrets immediately
   - Invalidate all sessions
   - Review access logs
   - Contact security team

2. **Investigation Steps**
   - Identify scope of compromise
   - Review recent access patterns
   - Check for unauthorized access
   - Document findings

3. **Recovery Steps**
   - Generate new secrets
   - Update all systems
   - Monitor for suspicious activity
   - Implement additional security measures

## Compliance Considerations

### SOC 2 Type II
- Document all rotation activities
- Maintain rotation logs
- Regular access reviews

### GDPR/Privacy
- Ensure user data protection during rotation
- Document data access during maintenance

## Testing Procedures

### Pre-Production Testing
```bash
# Test script for secret rotation
#!/bin/bash

echo "Testing secret rotation..."

# 1. Backup current secrets
cp .env .env.backup

# 2. Generate test secrets
TEST_JWT_SECRET=$(openssl rand -base64 48)
TEST_SESSION_SECRET=$(openssl rand -base64 48)

# 3. Apply test secrets
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$TEST_JWT_SECRET/" .env
sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$TEST_SESSION_SECRET/" .env

# 4. Test application startup
docker-compose up -d app

# 5. Run health checks
curl -f http://localhost:5000/health || exit 1

# 6. Test authentication
# ... authentication test script ...

echo "Secret rotation test completed successfully"
```

## Documentation Updates

When rotating secrets:
1. Update this rotation plan if procedures change
2. Update deployment documentation
3. Update incident response procedures
4. Update team knowledge base

## Contact Information

- **Security Team**: security@resolve.io
- **DevOps Lead**: devops@resolve.io  
- **On-call Engineer**: +1-XXX-XXX-XXXX

## Appendix

### Secret Generation Commands
```bash
# JWT/Session secrets (48 bytes base64)
openssl rand -base64 48

# API keys (32 bytes hex)
openssl rand -hex 32

# Passwords (32 bytes base64)
openssl rand -base64 32

# UUIDs
uuidgen
```

### Environment Variable Validation
```javascript
// Validate secret strength
function validateSecretStrength(secret, minLength = 32) {
    if (!secret || secret.length < minLength) {
        throw new Error(`Secret must be at least ${minLength} characters`);
    }
    
    // Check for common patterns
    if (/^[a-z]+$/.test(secret) || /^[0-9]+$/.test(secret)) {
        throw new Error('Secret is too simple');
    }
    
    return true;
}
```

---

**Last Updated**: December 2024  
**Next Review**: March 2025  
**Document Version**: 1.0