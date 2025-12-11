# Email Development Guide

## Overview

Rita uses **Mailpit** for local email testing. All emails from Keycloak (password resets, account notifications) and the mock-service (signups, invitations) are captured and displayed in a web UI.

---

## Quick Start

### 1. Start Services
```bash
docker compose up -d
```

### 2. Access Mailpit
Open in browser: **http://localhost:8025**

All emails will appear here automatically - no configuration needed!

---

## How It Works

### Architecture
```
Keycloak ──────┐
               ├──> Mailpit (SMTP:1025) ──> Web UI (http://localhost:8025)
Mock Service ──┘
```

### Email Flows

**Keycloak Emails:**
- Password reset (Forgot Password flow)
- Email verification
- Account notifications
- Admin actions

**Mock Service Emails:**
- User signup verification
- Organization invitations
- Password reset requests
- Password reset confirmations

---

## Configuration

### Keycloak SMTP (Already Configured)

SMTP settings are in `keycloak/realm-export.json`:
```json
{
  "realm": "rita-chat-realm",
  "smtpServer": {
    "host": "mailpit",
    "port": "1025",
    "from": "noreply@rita.local",
    "fromDisplayName": "Rita Authentication"
  }
}
```

**✅ No manual configuration needed** - auto-imports on startup.

### If You Need to Update SMTP Settings

**Option 1: Manual Configuration (Preserves Data)**

1. Login to Keycloak Admin Console: http://localhost:8080/admin
   - Username: `admin`
   - Password: `admin`
2. Navigate to: `rita-chat-realm` → `Realm Settings` → `Email` tab
3. Configure settings:
   - **Host**: `mailpit`
   - **Port**: `1025`
   - **From**: `noreply@rita.local`
   - **From Display Name**: `Rita Authentication`
   - **Enable SSL**: OFF
   - **Enable StartTLS**: OFF
   - **Enable Authentication**: OFF
4. Click "Save"
5. Click "Test connection" to verify
6. Enable password reset feature:
   - Navigate to: `rita-chat-realm` → `Realm Settings` → `Login` tab
   - Enable "Forgot password" toggle
   - Click "Save"

**Option 2: Force Re-import (Deletes All Data)**

⚠️ **Warning**: This deletes all users, sessions, and realm data!

```bash
docker compose stop keycloak
docker compose rm -f keycloak
docker compose up -d keycloak
```

Use this only for fresh development setup.

### Mock Service SMTP (Auto-Configured)

The email service automatically defaults to `localhost:1025` for local development.

**No configuration needed!** The service will work out of the box.

Optional configuration in `.env` (only if you need to override defaults):
```bash
# Defaults to 'localhost' if not set
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@rita.local
SMTP_FROM_NAME=Rita Platform
```

**Note**: If running mock-service in Docker, set `SMTP_HOST=mailpit`

Email service implementation: `packages/mock-service/src/email-service.ts`

---

## Testing Emails

### Test Keycloak Password Reset

1. Navigate to: http://localhost:8080/realms/rita-chat-realm/account
2. Click "Forgot Password?"
3. Enter: `testuser@example.com`
4. Check Mailpit: http://localhost:8025
5. Click the reset link in the email
6. Set new password

### Test Mock Service Signup Email

1. Trigger signup flow from RITA Go
2. Check Mailpit: http://localhost:8025
3. Verify email contains signup verification link

### Test Invitations

1. Send organization invitation from RITA Go
2. Check Mailpit for invitation email
3. Verify invitation URL and expiration

---

## Mailpit Features

### Web UI (http://localhost:8025)

- **Inbox**: View all captured emails
- **Search**: Filter by recipient, subject, date
- **Preview**: HTML and plain text rendering
- **Attachments**: View/download attachments
- **Details**: View headers, raw source

### API Access

Mailpit provides a REST API for automated testing:

```bash
# Get all messages
curl http://localhost:8025/api/v1/messages

# Get specific message
curl http://localhost:8025/api/v1/message/{id}

# Delete all messages
curl -X DELETE http://localhost:8025/api/v1/messages
```

---

## Troubleshooting

### Emails Not Appearing

**Check 1: Mailpit is running**
```bash
docker compose ps mailpit
# Should show "Up" and "(healthy)"
```

**Check 2: SMTP connectivity**
```bash
docker compose exec keycloak nc -zv mailpit 1025
# Should show "mailpit 1025 (?) open"
```

**Check 3: View logs**
```bash
docker compose logs mailpit --tail=50
docker compose logs keycloak --tail=50 | grep -i smtp
```

### Keycloak Not Sending Emails

**Verify Keycloak SMTP Config:**
1. Login: http://localhost:8080/admin (admin/admin)
2. Navigate to: `rita-chat-realm` → `Realm Settings` → `Email`
3. Verify settings match `realm-export.json`

**Force Re-import:**
```bash
docker compose stop keycloak
docker compose rm -f keycloak
docker compose up -d keycloak
```

### Mock Service Emails Not Sending

**Check environment variables:**
```bash
docker compose exec mock-service env | grep SMTP
```

**Check logs:**
```bash
docker compose logs mock-service --tail=100 | grep -i email
```

---

## Production Considerations

⚠️ **Mailpit is for development only**

For production, configure real SMTP service:

1. **Update `.env`:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_FROM=noreply@rita.com
SMTP_FROM_NAME=Rita Platform
SMTP_SECURE=true
SMTP_AUTH=true
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

2. **Update Keycloak realm settings** via Admin Console or realm export

3. **Test with real email** before deploying

---

## Email Templates

### Mock Service Templates

HTML email templates are in `packages/mock-service/src/email-service.ts`:

- `sendSignupVerification()` - Signup verification email
- `sendInvitation()` - Organization invitation email
- `sendPasswordReset()` - Password reset email

Templates use inline styles for email client compatibility.

### Keycloak Email Templates

To customize Keycloak email templates (future):

1. Add to `keycloak/themes/rita-theme-v2/email/`
2. Create FreeMarker templates (`.ftl`)
3. Reference: https://www.keycloak.org/docs/latest/server_development/#email-templates

---

## Docker Compose Configuration

Mailpit service in `docker-compose.yml`:
```yaml
mailpit:
  image: axllent/mailpit:latest
  ports:
    - "1025:1025"  # SMTP
    - "8025:8025"  # Web UI
  environment:
    MP_MAX_MESSAGES: 5000
    MP_DATABASE: /data/mailpit.db
  volumes:
    - mailpit_data:/data
```

---

## Resources

- **Mailpit Docs**: https://mailpit.axllent.org/
- **Mailpit API**: https://mailpit.axllent.org/docs/api-v1/
- **Keycloak Email Config**: https://www.keycloak.org/docs/latest/server_admin/#_email

---

**Quick Reference:**
- Mailpit UI: http://localhost:8025
- Keycloak Admin: http://localhost:8080/admin (admin/admin)
- Test User: testuser@example.com / test
