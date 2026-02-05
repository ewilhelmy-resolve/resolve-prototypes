# Keycloak Password Reset - Rita Implementation

## Overview

Rita uses Keycloak's native forgot password functionality with custom Rita branding.
Users access password reset through the Keycloak login page.

## User Flow

1. User navigates to Keycloak login page (via Rita client redirect)
2. User clicks **"Forgot Password?"** link
3. Keycloak renders `login-reset-password.ftl` (Rita themed)
4. User enters email address
5. Keycloak sends password reset email (configured SMTP)
6. User clicks link in email
7. Keycloak renders `login-update-password.ftl` (Rita themed)
8. User enters new password
9. Keycloak validates password (realm password policy)
10. Password updated in Keycloak
11. User redirected to login page

## Architecture

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  RITA Go    │──────▶│  Keycloak   │──────▶│  SMTP       │
│  (Client)   │       │  (Auth)     │       │  (Email)    │
└─────────────┘       └─────────────┘       └─────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │  PostgreSQL │
                      │  (Users)    │
                      └─────────────┘
```

### Components

- **RITA Go**: Redirects unauthenticated users to Keycloak
- **Keycloak**: Handles entire password reset flow
- **Rita Theme**: Custom FreeMarker templates (`rita-theme-v2`)
- **SMTP**: Email delivery (Mailpit for dev, production SMTP for prod)
- **PostgreSQL**: Keycloak's user database

## Keycloak Configuration

### Realm Settings

**Location**: Keycloak Admin Console → Realm: `resolve` → Realm Settings

#### General Tab
- **Display name**: Resolve
- **Enabled**: ON

#### Login Tab
- **User registration**: OFF (handled by Rita signup)
- **Forgot password**: ON ✅
- **Remember me**: ON
- **Email as username**: ON

#### Email Tab
```
Host: smtp.gmail.com (or your SMTP server)
Port: 587
From: noreply@rita.example.com
Enable StartTLS: ON
Enable Authentication: ON
Username: [SMTP username]
Password: [SMTP password]
```

#### Themes Tab
```
Login Theme: rita-theme-v2 ✅
Account Theme: rita-theme-v2
Admin Console Theme: keycloak.v2
Email Theme: rita-theme-v2
```

### Password Policy

**Location**: Realm Settings → Authentication → Policies → Password Policy

Current policy:
```
- Length: 8 characters minimum
- Uppercase: 1 character minimum
- Lowercase: 1 character minimum
- Digits: 1 character minimum
- Not Username: Enabled
- Not Email: Enabled
```

To modify:
1. Click **"Add policy"**
2. Select policy type (e.g., "Length", "Uppercase")
3. Configure value
4. Click **"Save"**

## Rita Theme Templates

### Directory Structure

```
keycloak/themes/rita-theme-v2/
├── login/
│   ├── login.ftl                      # Main login page
│   ├── login-reset-password.ftl       # Forgot password form ✅
│   ├── login-update-password.ftl      # Password update form ✅
│   ├── error.ftl                      # Error page
│   └── resources/
│       ├── css/
│       │   ├── fonts.css
│       │   └── login.css              # Tailwind compiled styles
│       └── img/
│           └── logo.svg
└── email/
    ├── html/
    │   └── password-reset.ftl         # Password reset email HTML
    └── text/
        └── password-reset.ftl         # Password reset email plain text
```

### Key Templates

#### `login-reset-password.ftl`
- **Purpose**: Forgot password form where user enters email
- **Features**: Rita branding, dark gradient background, responsive
- **Location**: `keycloak/themes/rita-theme-v2/login/login-reset-password.ftl`

#### `login-update-password.ftl`
- **Purpose**: Password update form with password visibility toggles
- **Features**: Password strength indicators, show/hide toggle, validation
- **Location**: `keycloak/themes/rita-theme-v2/login/login-update-password.ftl`

### Customizing Templates

Templates use FreeMarker syntax:

```ftl
<#-- Conditional rendering -->
<#if messagesPerField.existsError('username')>
  <p class="error">${messagesPerField.get('username')}</p>
</#if>

<#-- Variables -->
${url.loginAction}
${msg("emailForgotTitle")}

<#-- Loops -->
<#list properties.styles?split(' ') as style>
  <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
</#list>
```

See: [Keycloak Themes Documentation](https://www.keycloak.org/docs/latest/server_development/#_themes)

## Email Configuration

### Development (Mailpit)

Mailpit runs in Docker Compose for local email testing:

```yaml
# docker-compose.yml
mailpit:
  image: axllent/mailpit:latest
  ports:
    - "1025:1025"  # SMTP
    - "8025:8025"  # Web UI
```

**Access Web UI**: http://localhost:8025

**Keycloak Config** (dev):
```
Host: mailpit
Port: 1025
From: noreply@rita-local.com
Enable StartTLS: OFF
Enable Authentication: OFF
```

### Production

**Keycloak Config** (production):
```
Host: smtp.sendgrid.net (or your provider)
Port: 587
From: noreply@rita.io
Enable StartTLS: ON
Enable Authentication: ON
Username: apikey
Password: [SendGrid API key]
```

Popular SMTP providers:
- **SendGrid**: 100 emails/day free tier
- **Mailgun**: 5,000 emails/month free
- **AWS SES**: $0.10 per 1,000 emails
- **Postmark**: 100 emails/month free

## Testing Password Reset

### Local Development

1. **Start services**:
   ```bash
   docker compose up -d
   ```

2. **Create test user** (if not exists):
   ```bash
   # Access Keycloak Admin Console
   open http://localhost:8080/admin/master/console/#/resolve/users

   # Or use API server signup endpoint
   curl -X POST http://localhost:3000/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Test",
       "lastName": "User",
       "email": "test@example.com",
       "company": "Acme Inc",
       "password": "Password123!"
     }'
   ```

3. **Navigate to login**:
   ```bash
   open http://localhost:5173
   ```

4. **Click "Forgot Password?"**

5. **Enter email**: `test@example.com`

6. **Check Mailpit**:
   ```bash
   open http://localhost:8025
   ```

7. **Click reset link** in email

8. **Enter new password**: Must meet password policy

9. **Verify login** works with new password

### Production Testing

1. Configure SMTP in Keycloak realm
2. Test with real email address (use your own email)
3. Verify email delivery (check spam folder if not received)
4. Complete reset flow end-to-end
5. Verify password policy enforcement
6. Test invalid token (expired link)
7. Test already-used token

## Troubleshooting

### Email Not Sent

**Symptoms**: User submits email, but no email received

**Check**:
1. Keycloak logs:
   ```bash
   docker compose logs keycloak | grep -i "email\|smtp"
   ```

2. SMTP configuration in Keycloak:
   - Realm Settings → Email
   - Click **"Test connection"**

3. Email provider status:
   - Check SendGrid/Mailgun dashboard for errors
   - Verify SMTP credentials are correct
   - Check rate limits

4. Spam folder:
   - Gmail may filter Keycloak emails
   - Add sender to whitelist

**Solutions**:
- Verify SMTP host, port, username, password
- Enable "Less secure app access" (Gmail)
- Use app-specific password (Gmail with 2FA)
- Check firewall rules (port 587 outbound)

### Reset Link Expired

**Symptoms**: User clicks link, sees "Invalid or expired reset link"

**Cause**: Keycloak tokens expire after **5 minutes** by default

**Configure expiration**:
1. Keycloak Admin Console → Realm: `resolve`
2. Realm Settings → Tokens
3. **Action Token Lifespan**: Increase from 5 minutes (e.g., 15 minutes)
4. Click **"Save"**

**User action**: Request new reset link

### Password Policy Errors

**Symptoms**: User enters password, sees "Password must contain..."

**Check policy**:
1. Realm Settings → Authentication → Policies → Password Policy
2. Review current policies

**Common policies**:
- Length (8+ chars)
- Uppercase (1+ char)
- Lowercase (1+ char)
- Digit (1+ char)
- Special character (1+ char)
- Not username
- Not email

**User action**: Update password to meet requirements

### Keycloak Theme Not Applied

**Symptoms**: Forgot password page shows default Keycloak theme

**Check**:
1. Verify theme is built:
   ```bash
   ls keycloak/themes/rita-theme-v2/login/resources/css/login.css
   ```

2. Verify realm theme setting:
   - Realm Settings → Themes → Login Theme: `rita-theme-v2`

3. Restart Keycloak:
   ```bash
   docker compose restart keycloak
   ```

4. Clear browser cache:
   - Keycloak aggressively caches themes
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

**Solution**: Rebuild theme and restart Keycloak
```bash
cd keycloak/themes/rita-theme-v2/login
npm run build
docker compose restart keycloak
```

## Security Features

### Built-in Protections

- ✅ **Single Use Tokens**: Reset links expire after first use
- ✅ **Time Limits**: 5-minute token expiration (configurable)
- ✅ **Rate Limiting**: Keycloak enforces rate limits on forgot password requests
- ✅ **Email Verification**: Keycloak verifies email ownership before allowing reset
- ✅ **Password History**: Optionally prevent password reuse (configurable)
- ✅ **Audit Logging**: All password reset events logged in Keycloak admin events
- ✅ **Brute Force Detection**: Keycloak detects and blocks repeated failed attempts

### Rate Limiting

**Default**: 30 requests per minute per IP

**Configure**:
1. Realm Settings → Security Defenses → Brute Force Detection
2. **Max Login Failures**: 30
3. **Wait Increment**: 60 seconds
4. **Max Wait**: 900 seconds (15 min)
5. **Failure Reset Time**: 43200 seconds (12 hours)

### Audit Logging

**View events**:
1. Keycloak Admin Console → Events
2. **User events**: Login, logout, password reset
3. **Admin events**: Configuration changes

**Filter by event**:
- `UPDATE_PASSWORD`
- `SEND_RESET_PASSWORD`
- `RESET_PASSWORD`

## Migration Notes

### Previous Implementation

**Removed**: October 29, 2025

Rita previously had a custom password reset system with:
- Custom API endpoints (`/auth/forgot-password`, `/auth/reset-password`)
- Database table (`password_reset_tokens`)
- Webhook integration with mock service
- Manual Keycloak password update via Admin API

### Why Changed

1. **Keycloak native is enterprise-grade**: Battle-tested, SOC2 compliant
2. **Reduced maintenance**: No custom security code to maintain
3. **Fewer failure points**: Eliminates webhooks, database, custom tokens
4. **Better UX**: Consistent Keycloak authentication flow
5. **Cost**: Custom system never used in production, wasted effort

### What Was Removed

See: `docs/archive/password-reset-system-removed-2025-10-29/README.md`

- `PasswordResetService.ts` (263 lines)
- 3 API endpoints
- `password_reset_tokens` database table
- Webhook handlers in mock service
- Custom email service integration

### Frontend Note

`packages/client/src/pages/ResetPasswordPage.tsx` is **deprecated** and kept only for UI reference.
It was never connected to the API and uses simulated data.

## Related Documentation

- **Keycloak Official Docs**: https://www.keycloak.org/docs/latest/
- **Theme Development**: https://www.keycloak.org/docs/latest/server_development/#_themes
- **FreeMarker Template Guide**: https://freemarker.apache.org/docs/
- **Archived Custom System**: `docs/archive/password-reset-system-removed-2025-10-29/`
- **Removal Design Doc**: `docs/password-reset-removal-design.md`

## Support

For issues with password reset:

1. **Check Keycloak logs**: `docker compose logs keycloak`
2. **Test SMTP connection**: Realm Settings → Email → Test connection
3. **Review audit events**: Keycloak Admin Console → Events
4. **Check Mailpit** (dev): http://localhost:8025
5. **Verify realm configuration**: Realm Settings → Login → Forgot password: ON

If problems persist, contact the Rita development team with:
- User email (redacted if production)
- Keycloak logs
- SMTP test results
- Error message or screenshot
