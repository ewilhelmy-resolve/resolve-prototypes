# Mailpit Integration Design Document

**Status:** Draft for Review
**Author:** Development Team
**Date:** 2025-10-23
**Version:** 1.0

---

## 1. Executive Summary

This document outlines the integration of [Mailpit](https://mailpit.axllent.org/) as the local email testing solution for the Rita project development environment. Mailpit will capture and display emails sent from Keycloak (password resets, account notifications) and the mock-service (signup verifications, invitations) without requiring external SMTP services or actual email delivery.

### Key Benefits
- **Zero Configuration**: No external SMTP credentials needed
- **Full Email Visibility**: Web UI to view all captured emails
- **Fast Development**: Instant email capture without network delays
- **Multi-Service Support**: Single email server for all services
- **API Access**: Programmatic email retrieval for testing

---

## 2. Current State Analysis

### 2.1 Existing Email Touchpoints

#### Mock Service (`packages/mock-service/src/index.ts`)
Currently logs emails to console for:
- **User Signup** (lines 2310-2343): Verification emails with token URLs
- **Send Invitations** (lines 1698-1739): Organization invitations to new members
- **Accept Invitations** (lines 1760-1810): Confirmation when invitations accepted
- **Password Reset Request** (lines 1812-1842): Reset link emails
- **Password Reset Complete** (lines 1844-1930): Confirmation of successful reset

Console output example:
```javascript
console.log(`\n${'='.repeat(80)}`);
console.log('📧 MOCK EMAIL VERIFICATION');
console.log('='.repeat(80));
console.log(`To: ${signupPayload.user_email}`);
console.log(`Verification URL: ${signupPayload.verification_url}`);
console.log('(In production, this would be sent via email)');
console.log(`${'='.repeat(80)}\n`);
```

#### Keycloak
Handles authentication flows but currently has no SMTP configured:
- Email verification
- **Password reset flows** (built-in "Forgot Password?" feature)
- Account notifications
- User registration confirmations

**Note**: The mock-service also handles password reset webhooks (lines 1812-1930) for Rita's custom password reset flow. This provides flexibility to use either:
1. **Keycloak's built-in flow**: "Forgot Password?" link on login page (enabled via `resetPasswordAllowed: true`)
2. **Rita's custom flow**: Application-driven password reset via mock-service webhooks

For development, we'll enable both approaches to test different UX patterns.

---

## 3. Proposed Architecture

### 3.1 Docker Compose Integration

Add Mailpit as a new service in `docker-compose.yml`:

```yaml
services:
  # ... existing services (postgres, rabbitmq, keycloak)

  mailpit:
    image: axllent/mailpit:latest
    container_name: mailpit
    restart: unless-stopped
    ports:
      - "1025:1025"  # SMTP server (internal services connect here)
      - "8025:8025"  # Web UI (developers access at http://localhost:8025)
    environment:
      MP_MAX_MESSAGES: 5000
      MP_DATABASE: /data/mailpit.db
      MP_SMTP_AUTH_ACCEPT_ANY: 1
      MP_SMTP_AUTH_ALLOW_INSECURE: 1
    volumes:
      - mailpit_data:/data
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8025/api/v1/info"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
  rabbitmq_data:
  mailpit_data:  # New volume for email persistence
```

### 3.2 Service Configuration

#### Keycloak SMTP Configuration

We'll use **Realm-Level Configuration** by updating the realm export file. This approach is ideal for development as it:
- Version controls the SMTP configuration
- Automatically imports on container startup
- Keeps configuration consistent across team members
- No manual Keycloak Admin Console setup required

Update `keycloak/realm-export.json` by adding the `smtpServer` section and enabling password reset features:
```json
{
  "realm": "rita-chat-realm",
  "enabled": true,
  "resetPasswordAllowed": true,
  "smtpServer": {
    "host": "mailpit",
    "port": "1025",
    "from": "noreply@rita.local",
    "fromDisplayName": "Rita Authentication",
    "auth": "false",
    "starttls": "false",
    "ssl": "false"
  },
  "clients": [
    ...existing clients array...
  ],
  "users": [
    ...existing users array...
  ]
}
```

**Configuration Changes**:
- **`smtpServer`**: SMTP configuration for Mailpit integration
  - `host`: Docker service name for Mailpit
  - `port`: SMTP port (1025)
  - `from`: Sender email address for all Keycloak emails
  - `fromDisplayName`: Display name shown in email clients
  - `auth`, `starttls`, `ssl`: Disabled for local development
- **`resetPasswordAllowed`**: Enables "Forgot Password" link on login page
  - Users can request password reset emails
  - Keycloak sends reset links via Mailpit
  - Integrates with Rita's password reset flow

**Important Notes**:
- Add both `resetPasswordAllowed` and `smtpServer` to your existing realm configuration
- Keep all existing `clients` and `users` arrays unchanged
- The realm export is imported automatically when Keycloak starts via the `--import-realm` flag in `docker-compose.yml` (line 54)
- After updating the file, restart Keycloak for changes to take effect: `docker compose restart keycloak`

**✅ Configuration Applied**: The file `keycloak/realm-export.json` has been updated with these settings.

#### Mock Service SMTP Integration

Add `nodemailer` for actual email sending:

**1. Install Dependencies**
```bash
cd packages/mock-service
npm install nodemailer
npm install --save-dev @types/nodemailer
```

**2. Configuration (`.env`)**
```bash
# SMTP Configuration (Mailpit)
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_FROM=noreply@rita.local
SMTP_FROM_NAME=Rita Platform
SMTP_SECURE=false
SMTP_AUTH=false
```

**3. Email Service Module (`src/email-service.ts`)**
```typescript
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mailpit',
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_AUTH === 'true' ? {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      } : undefined
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Rita Platform'}" <${process.env.SMTP_FROM || 'noreply@rita.local'}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent: ${info.messageId}`);
      console.log(`📬 Preview URL: http://localhost:8025`);
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      // Fallback to console logging
      console.log(`\n${'='.repeat(80)}`);
      console.log('📧 EMAIL (Fallback - Mailpit unavailable)');
      console.log('='.repeat(80));
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body:\n${options.text}`);
      console.log(`${'='.repeat(80)}\n`);
    }
  }

  async sendSignupVerification(email: string, name: string, verificationUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Verify Your Rita Account',
      text: `Hi ${name},\n\nWelcome to Rita! Please verify your email address by clicking the link below:\n\n${verificationUrl}\n\nIf you didn't create this account, please ignore this email.\n\nBest regards,\nThe Rita Team`,
      html: `
        <h2>Welcome to Rita!</h2>
        <p>Hi ${name},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <p><a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a></p>
        <p>Or copy and paste this URL into your browser:</p>
        <p><code>${verificationUrl}</code></p>
        <p>If you didn't create this account, please ignore this email.</p>
        <p>Best regards,<br>The Rita Team</p>
      `
    });
  }

  async sendInvitation(
    email: string,
    invitedByName: string,
    organizationName: string,
    invitationUrl: string,
    expiresAt: string
  ): Promise<void> {
    const expiryDate = new Date(expiresAt).toLocaleString();

    await this.sendEmail({
      to: email,
      subject: `You're invited to join ${organizationName} on Rita`,
      text: `${invitedByName} has invited you to join ${organizationName} on Rita.\n\nAccept your invitation by clicking the link below:\n\n${invitationUrl}\n\nThis invitation expires on ${expiryDate}.\n\nBest regards,\nThe Rita Team`,
      html: `
        <h2>You're Invited!</h2>
        <p><strong>${invitedByName}</strong> has invited you to join <strong>${organizationName}</strong> on Rita.</p>
        <p><a href="${invitationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
        <p>Or copy and paste this URL into your browser:</p>
        <p><code>${invitationUrl}</code></p>
        <p><small>This invitation expires on ${expiryDate}.</small></p>
        <p>Best regards,<br>The Rita Team</p>
      `
    });
  }

  async sendPasswordReset(email: string, resetUrl: string, expiresAt: string): Promise<void> {
    const expiryDate = new Date(expiresAt).toLocaleString();

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Rita Password',
      text: `You requested a password reset for your Rita account.\n\nReset your password by clicking the link below:\n\n${resetUrl}\n\nThis link expires on ${expiryDate}.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe Rita Team`,
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your Rita account.</p>
        <p><a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
        <p>Or copy and paste this URL into your browser:</p>
        <p><code>${resetUrl}</code></p>
        <p><small>This link expires on ${expiryDate}.</small></p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The Rita Team</p>
      `
    });
  }
}

export const emailService = new EmailService();
```

**4. Update Webhook Handlers (`src/index.ts`)**

Replace console.log statements with actual email sends:

```typescript
// Signup webhook (line ~2310)
try {
  const keycloakUserId = await createKeycloakUser(signupPayload);

  // Send actual email instead of console.log
  await emailService.sendSignupVerification(
    signupPayload.user_email!,
    `${signupPayload.first_name} ${signupPayload.last_name}`,
    signupPayload.verification_url
  );

  contextLogger.info({
    email: signupPayload.user_email,
    keycloakUserId,
    verification_url: signupPayload.verification_url
  }, '🎉 SIGNUP SUCCESS: Email sent via Mailpit');
}

// Send invitation webhook (line ~1698)
for (const invitation of invitationPayload.invitations) {
  await emailService.sendInvitation(
    invitation.invitee_email,
    invitationPayload.invited_by_name,
    invitationPayload.organization_name,
    invitation.invitation_url,
    invitation.expires_at
  );
}

// Password reset webhook (line ~1812)
await emailService.sendPasswordReset(
  resetRequestPayload.user_email!,
  resetRequestPayload.reset_url,
  resetRequestPayload.expires_at
);
```

---

## 4. Developer Workflow

### 4.1 Accessing Mailpit

**Web UI**: `http://localhost:8025`

Features:
- **Inbox**: View all captured emails
- **Search**: Filter by recipient, subject, date
- **Preview**: HTML and plain text rendering
- **Attachments**: View/download email attachments
- **API**: REST API for programmatic access

### 4.2 Testing Email Flows

#### User Signup Flow
```bash
# 1. Start all services
docker compose up -d

# 2. Trigger signup via Rita Go UI (http://localhost:5173)
# 3. Open Mailpit (http://localhost:8025)
# 4. View verification email
# 5. Click verification link in email
# 6. Confirm account activated
```

#### Invitation Flow
```bash
# 1. Login as organization admin
# 2. Navigate to Team Management
# 3. Send invitation to new member
# 4. Check Mailpit for invitation email
# 5. Copy invitation URL
# 6. Test invitation acceptance
```

#### Password Reset Flow (Keycloak Built-in)
```bash
# 1. Navigate to Keycloak login page (http://localhost:8080/realms/rita-chat-realm/account)
# 2. Click "Forgot Password?" link
# 3. Enter email address (e.g., testuser@example.com)
# 4. Check Mailpit UI (http://localhost:8025) for reset email from Keycloak
# 5. Click reset link in email
# 6. Set new password in Keycloak's reset form
# 7. Verify login with new password in Rita Go
```

**Note**: With `resetPasswordAllowed: true`, the "Forgot Password?" link appears automatically on the Keycloak login page. No custom Rita implementation needed for this flow.

---

## 5. Configuration Summary

### 5.1 Environment Variables

#### Root `.env`
```bash
# Mailpit Configuration
MAILPIT_SMTP_HOST=mailpit
MAILPIT_SMTP_PORT=1025
MAILPIT_WEB_UI=http://localhost:8025
```

#### Mock Service `.env`
```bash
# SMTP Configuration
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_FROM=noreply@rita.local
SMTP_FROM_NAME=Rita Platform
SMTP_SECURE=false
SMTP_AUTH=false
```

### 5.2 Docker Networking

All services in `docker-compose.yml` share the same default network, allowing:
- Keycloak → Mailpit (smtp://mailpit:1025)
- Mock Service → Mailpit (smtp://mailpit:1025)
- Host Browser → Mailpit UI (http://localhost:8025)

---

## 6. Migration Plan

### Phase 1: Docker Compose Setup ✅
- [ ] Add Mailpit service to `docker-compose.yml`
- [ ] Add `mailpit_data` volume
- [ ] Test Mailpit starts and UI is accessible
- [ ] Update `keycloak/realm-export.json` with SMTP configuration
- [ ] Restart Keycloak to import updated realm settings

### Phase 2: Mock Service Integration ✅
- [ ] Install nodemailer dependency
- [ ] Create `email-service.ts` module
- [ ] Update signup webhook to send real emails
- [ ] Update invitation webhook to send real emails
- [ ] Update password reset webhook to send real emails
- [ ] Test all email flows via Mailpit UI

### Phase 3: Documentation ✅
- [ ] Update README.md with Mailpit instructions
- [ ] Document email testing workflow
- [ ] Create developer troubleshooting guide

### Phase 4: Production Readiness 🔮
- [ ] Add environment variable switching for production SMTP
- [ ] Document production SMTP configuration (SendGrid/AWS SES)
- [ ] Add feature flag for email service selection
- [ ] Test graceful fallback when Mailpit unavailable

---

## 7. Troubleshooting

### Issue: Emails not appearing in Mailpit

**Check 1: Mailpit is running**
```bash
docker compose ps mailpit
# Should show "Up" and "(healthy)"
```

**Check 2: SMTP port is accessible**
```bash
docker compose exec mock-service nc -zv mailpit 1025
# Should show "mailpit [172.x.x.x] 1025 (?) open"
```

**Check 3: View Mailpit logs**
```bash
docker compose logs mailpit --tail=50
```

### Issue: Keycloak emails not sending

**Check 1: Verify realm SMTP configuration was imported**
```bash
# Login to Keycloak Admin Console (http://localhost:8080)
# Navigate to: rita-chat-realm → Realm Settings → Email
# Verify settings:
#   - Host: mailpit
#   - Port: 1025
#   - From: noreply@rita.local
#   - Authentication: Disabled
```

**Check 2: Re-import realm if SMTP settings are missing**
```bash
# Stop Keycloak
docker compose stop keycloak

# Remove Keycloak data volume to force fresh import
docker compose down -v keycloak

# Start Keycloak (will re-import realm-export.json)
docker compose up -d keycloak
```

**Check 3: Test connection in Keycloak Admin Console**
```bash
# In Keycloak Admin Console → Email settings
# Click "Test connection" button
# Check Mailpit UI (http://localhost:8025) for test email
```

### Issue: Mock service nodemailer errors

**Check 1: Verify environment variables**
```bash
docker compose exec mock-service env | grep SMTP
```

**Check 2: Check mock-service logs**
```bash
docker compose logs mock-service --tail=100 | grep -i "email\|smtp"
```

---

## 8. Security Considerations

### Development Environment
- ✅ **No authentication**: Mailpit accepts all SMTP connections
- ✅ **Insecure connections**: No TLS/SSL required
- ✅ **Local only**: Mailpit only accessible on localhost
- ⚠️ **Data persistence**: Emails stored in Docker volume

### Production Environment
- ❌ **Do NOT use Mailpit**: Use production SMTP service (SendGrid, AWS SES, etc.)
- ✅ **Enable authentication**: Use SMTP_AUTH=true with credentials
- ✅ **Enforce TLS**: Use SMTP_SECURE=true for encrypted connections
- ✅ **Rate limiting**: Implement email sending quotas
- ✅ **SPF/DKIM/DMARC**: Configure proper email authentication

---

## 9. Future Enhancements

### Email Templates
- [ ] Implement template engine (Handlebars/Mjml)
- [ ] Centralize email templates in `packages/email-templates/`
- [ ] Add brand styling and consistent design system
- [ ] Support multi-language email templates

### Testing Infrastructure
- [ ] Create mock email fixtures for unit tests
- [ ] Add email performance monitoring

### Observability
- [ ] Add email sending metrics (count, success rate, latency)
- [ ] Integrate email logs with centralized logging (if applicable)
- [ ] Set up alerts for email delivery failures
- [ ] Track email open rates and click-through rates (production only)

---

## 10. References

- [Mailpit Documentation](https://mailpit.axllent.org/)
- [Mailpit Docker Guide](https://mailpit.axllent.org/docs/install/docker/)
- [Mailpit API Reference](https://mailpit.axllent.org/docs/api-v1/)
- [Nodemailer Documentation](https://nodemailer.com/)
- [Keycloak Email Configuration](https://www.keycloak.org/docs/latest/server_admin/#_email)

---

## Appendix: Complete Docker Compose Service

```yaml
mailpit:
  image: axllent/mailpit:latest
  container_name: mailpit
  restart: unless-stopped
  ports:
    - "1025:1025"  # SMTP
    - "8025:8025"  # Web UI
  environment:
    # Storage
    MP_MAX_MESSAGES: 5000
    MP_DATABASE: /data/mailpit.db

    # SMTP Settings
    MP_SMTP_AUTH_ACCEPT_ANY: 1
    MP_SMTP_AUTH_ALLOW_INSECURE: 1

    # Optional: Timezone
    TZ: America/New_York

    # Optional: Basic auth for web UI (development)
    # MP_UI_AUTH_FILE: /config/auth.txt
  volumes:
    - mailpit_data:/data
    # - ./mailpit/auth.txt:/config/auth.txt  # Optional
  healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8025/api/v1/info"]
    interval: 10s
    timeout: 5s
    retries: 3
  networks:
    - default
```

---

**End of Document**
