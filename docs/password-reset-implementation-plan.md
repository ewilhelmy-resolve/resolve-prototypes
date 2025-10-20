# Password Reset System - Backend Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for the **backend components** of the password reset system. Frontend implementation will be handled separately.

**Scope**: Backend API, database migration, webhook integration, mock service, and documentation updates.

**Reference**: See `docs/password-reset-system.md` for complete design specification.

---

## Implementation Checklist

### Phase 1: Database Setup ✓ TODO
- [ ] Create database migration file
- [ ] Add password_reset_tokens table
- [ ] Add indexes and constraints
- [ ] Test migration (up/down)
- [ ] Update database documentation

### Phase 2: TypeScript Types & Interfaces ✓ TODO
- [ ] Add webhook payload types
- [ ] Add API request/response types
- [ ] Add database row types
- [ ] Export types from index

### Phase 3: Password Reset Service ✓ TODO
- [ ] Create PasswordResetService class
- [ ] Implement requestReset() method
- [ ] Implement verifyToken() method
- [ ] Implement resetPassword() method
- [ ] Add validation helpers

### Phase 4: Webhook Service Updates ✓ TODO
- [ ] Add sendPasswordResetRequestEvent() method
- [ ] Add sendPasswordResetCompleteEvent() method
- [ ] Update webhook types

### Phase 5: API Endpoints ✓ TODO
- [ ] POST /auth/forgot-password endpoint
- [ ] POST /auth/verify-reset-token endpoint
- [ ] POST /auth/reset-password endpoint
- [ ] Add rate limiting middleware
- [ ] Add validation middleware

### Phase 6: Mock Service Updates ✅ COMPLETED
- [x] Add PasswordResetRequestPayload interface
- [x] Add PasswordResetCompletePayload interface
- [x] Add password_reset_request handler
- [x] Add password_reset_complete handler

### Phase 7: Testing & Validation ✓ TODO
- [ ] Manual testing with Docker
- [ ] Test full reset flow
- [ ] Test error scenarios
- [ ] Test webhook integration
- [ ] Verify opportunistic cleanup

---

## Phase 1: Database Setup

### Step 1.1: Create Migration File

**File**: `packages/api-server/src/database/migrations/XXX_add_password_reset_tokens.sql`

> Replace `XXX` with next sequential migration number

**Content**:
```sql
-- Migration: Add password_reset_tokens table
-- Description: Secure password reset tokens with single-use enforcement
-- Date: 2025-01-XX

-- Create password_reset_tokens table
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  reset_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,

  CONSTRAINT token_expiry_valid CHECK (token_expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX idx_password_reset_tokens_email ON password_reset_tokens(user_email);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(reset_token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(token_expires_at);

-- Prevent multiple active tokens per email (only one valid reset at a time)
CREATE UNIQUE INDEX idx_password_reset_tokens_unique_active_email
  ON password_reset_tokens(user_email)
  WHERE used_at IS NULL AND token_expires_at > NOW();

-- Table and column comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens with single-use enforcement and 1-hour expiration';
COMMENT ON COLUMN password_reset_tokens.reset_token IS '64-character hex token sent via email for password reset';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was used (single-use enforcement via atomic UPDATE)';
COMMENT ON COLUMN password_reset_tokens.token_expires_at IS 'Token expiration time (1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.ip_address IS 'IP address of reset requester (audit trail)';
COMMENT ON COLUMN password_reset_tokens.user_agent IS 'User agent of reset requester (audit trail)';
```

### Step 1.2: Test Migration

```bash
# Run migration up
cd packages/api-server
npm run migrate:up

# Verify table exists
psql $DATABASE_URL -c "\d password_reset_tokens"

# Test rollback (optional)
npm run migrate:down
npm run migrate:up
```

### Step 1.3: Update Database Documentation

**File**: `docs/database-tables.md`

**Action**: Add new table entry as #14 (or next available number)

**Content**:
```markdown
### 14. **password_reset_tokens**
**Purpose:** Secure password reset tokens with single-use enforcement
**Schema:** Migration `XXX_add_password_reset_tokens.sql`
**Used In:**
- `routes/auth.ts` (password reset flow)
- `services/PasswordResetService.ts` (token management)

**Columns:**
- `id` UUID PRIMARY KEY - Unique token identifier
- `user_email` TEXT NOT NULL - Email address of user requesting reset
- `reset_token` TEXT NOT NULL UNIQUE - 64-character hex token (256-bit entropy)
- `token_expires_at` TIMESTAMP WITH TIME ZONE NOT NULL - Token expiration (1 hour from creation)
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW() - Token creation timestamp
- `used_at` TIMESTAMP WITH TIME ZONE - Timestamp when token was used (NULL = unused)
- `ip_address` TEXT - IP address of requester (audit trail)
- `user_agent` TEXT - User agent string (audit trail)

**Indexes:**
- `idx_password_reset_tokens_email` ON user_email - Fast lookup by email
- `idx_password_reset_tokens_token` ON reset_token - Fast token validation
- `idx_password_reset_tokens_expires_at` ON token_expires_at - Cleanup queries
- `idx_password_reset_tokens_unique_active_email` ON (user_email) WHERE used_at IS NULL AND token_expires_at > NOW() - Enforce single active reset per user

**Features:**
- **Single-use enforcement** - `used_at` field + atomic UPDATE prevents token reuse
- **Opportunistic cleanup** - Old tokens cleaned during INSERT (no cron needed)
- **1-hour token expiration** - Short window minimizes attack surface
- **7-day audit retention** - Used tokens kept for SOC2 compliance
- **IP and user agent logging** - Security audit trail

**Operations:**
- `SELECT` - Verify token validity, check for existing active tokens
- `INSERT` - Create new reset token (includes opportunistic cleanup in same transaction)
- `UPDATE` - Mark token as used (atomic single-use enforcement: `WHERE used_at IS NULL`)
- `DELETE` - Opportunistic cleanup of expired/old tokens (happens during INSERT)

**Code References:**
- `routes/auth.ts:POST /auth/forgot-password` - Request password reset
- `routes/auth.ts:POST /auth/verify-reset-token` - Verify token validity
- `routes/auth.ts:POST /auth/reset-password` - Complete password reset
- `services/PasswordResetService.ts` - Token lifecycle management

**Security Notes:**
- Tokens generated with `crypto.randomBytes(32)` (256 bits entropy)
- Only one active reset token per email (enforced by partial unique index)
- Atomic updates prevent race conditions on token use
- Passwords never stored in this table (zero-storage architecture)
- Short expiration (1 hour) limits attack window

**Cleanup Strategy:**
- **Opportunistic cleanup** - Runs during token creation, no cron job needed
- Expired tokens deleted after 24 hours past expiration
- Used tokens deleted after 7 days (audit retention for SOC2)
- Cleanup SQL: `DELETE WHERE token_expires_at < NOW() - INTERVAL '24 hours' OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days')`

**Relationships:**
- References `user_profiles(email)` - Logical relationship (not enforced FK to allow cleanup independence)
```

### Step 1.4: Update ERD Diagram

**File**: `docs/database-tables.md`

**Action**: Add to Entity Relationship Diagram (find the `erDiagram` section)

**Content**: Add after the `pending_users` section:
```mermaid
  %% Password Reset System
  user_profiles ||--o{ password_reset_tokens : "email"

  password_reset_tokens {
    uuid id PK
    text user_email
    text reset_token UK
    timestamp token_expires_at
    timestamp created_at
    timestamp used_at
    text ip_address
    text user_agent
  }
```

---

## Phase 2: TypeScript Types & Interfaces

### Step 2.1: Webhook Payload Types

**File**: `packages/api-server/src/types/webhook.ts`

**Action**: Add to existing webhook types

**Content**:
```typescript
/**
 * Password Reset Request Webhook Payload
 * Triggered when user requests password reset
 */
export interface PasswordResetRequestPayload extends BaseWebhookPayload {
  source: 'rita-auth';
  action: 'password_reset_request';
  reset_token: string;
  reset_url: string;
  expires_at: string; // ISO timestamp
  ip_address: string;
  user_agent: string;
}

/**
 * Password Reset Complete Webhook Payload
 * Triggered when user submits new password
 */
export interface PasswordResetCompletePayload extends BaseWebhookPayload {
  source: 'rita-auth';
  action: 'password_reset_complete';
  password: string; // Base64 encoded
  reset_token_id: string;
  ip_address: string;
  user_agent: string;
}
```

**Also update**: `WebhookPayload` union type to include new payloads:
```typescript
export type WebhookPayload =
  | MessageWebhookPayload
  | DocumentProcessingPayload
  | DocumentDeletePayload
  | PasswordResetRequestPayload
  | PasswordResetCompletePayload;
```

### Step 2.2: API Request/Response Types

**File**: `packages/api-server/src/types/auth.ts` (create if doesn't exist)

**Content**:
```typescript
/**
 * Password Reset Request API Types
 */
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: true;
  message: string; // Generic message (prevent email enumeration)
}

/**
 * Verify Reset Token API Types
 */
export interface VerifyResetTokenRequest {
  token: string;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  email?: string; // Only present if valid
  error?: string;
  code?: string; // Error code (PWD_RESET_001, etc.)
}

/**
 * Reset Password API Types
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  email?: string;
  error?: string;
  code?: string; // Error code
}

/**
 * Password Reset Error Codes
 */
export enum PasswordResetErrorCode {
  INVALID_TOKEN = 'PWD_RESET_001',
  TOKEN_ALREADY_USED = 'PWD_RESET_002',
  TOKEN_EXPIRED = 'PWD_RESET_003',
  WEBHOOK_FAILURE = 'PWD_RESET_004',
  WEAK_PASSWORD = 'PWD_RESET_005',
  RATE_LIMIT_EXCEEDED = 'PWD_RESET_006'
}
```

### Step 2.3: Database Row Types

**File**: `packages/api-server/src/types/database.ts` (or create new file)

**Content**:
```typescript
/**
 * password_reset_tokens table row
 */
export interface PasswordResetTokenRow {
  id: string; // UUID
  user_email: string;
  reset_token: string;
  token_expires_at: Date;
  created_at: Date;
  used_at: Date | null;
  ip_address: string | null;
  user_agent: string | null;
}
```

---

## Phase 3: Password Reset Service

### Step 3.1: Create Service File

**File**: `packages/api-server/src/services/PasswordResetService.ts`

**Content**:
```typescript
import crypto from 'crypto';
import { pool } from '../config/database.js';
import type { PasswordResetTokenRow } from '../types/database.js';
import { PasswordResetErrorCode } from '../types/auth.js';

export class PasswordResetService {
  /**
   * Request password reset - generates token and triggers webhook
   * Includes opportunistic cleanup of old tokens
   */
  async requestReset(params: {
    email: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<{ token: string; expiresAt: Date } | null> {
    const { email, ipAddress, userAgent } = params;

    // Check if user exists
    const userResult = await pool.query(
      `SELECT user_id, email FROM user_profiles WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      // User doesn't exist - return null (caller returns generic success message)
      return null;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Opportunistic cleanup: Remove old tokens before inserting new one
      // This eliminates the need for a separate cron job
      await client.query(`
        DELETE FROM password_reset_tokens
        WHERE (
          -- Delete expired tokens (>24 hours past expiration)
          token_expires_at < NOW() - INTERVAL '24 hours'
        ) OR (
          -- Delete old used tokens (>7 days old)
          used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days'
        )
      `);

      // Delete any existing active tokens for this email (only one active reset per user)
      await client.query(
        `DELETE FROM password_reset_tokens
         WHERE user_email = $1 AND used_at IS NULL`,
        [email]
      );

      // Generate new token
      const resetToken = crypto.randomBytes(32).toString('hex'); // 64 chars
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Insert new token
      const result = await client.query<PasswordResetTokenRow>(
        `INSERT INTO password_reset_tokens
           (user_email, reset_token, token_expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, reset_token, token_expires_at`,
        [email, resetToken, expiresAt, ipAddress, userAgent]
      );

      await client.query('COMMIT');

      return {
        token: result.rows[0].reset_token,
        expiresAt: result.rows[0].token_expires_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify reset token validity
   */
  async verifyToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    error?: string;
    code?: string;
  }> {
    // Validate token format (64-character hex string)
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return {
        valid: false,
        error: 'Invalid or expired reset link',
        code: PasswordResetErrorCode.INVALID_TOKEN
      };
    }

    const result = await pool.query<PasswordResetTokenRow>(
      `SELECT id, user_email, token_expires_at, used_at
       FROM password_reset_tokens
       WHERE reset_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: 'Invalid or expired reset link',
        code: PasswordResetErrorCode.INVALID_TOKEN
      };
    }

    const resetToken = result.rows[0];

    // Check if already used
    if (resetToken.used_at !== null) {
      return {
        valid: false,
        error: 'This reset link has already been used',
        code: PasswordResetErrorCode.TOKEN_ALREADY_USED
      };
    }

    // Check if expired
    if (new Date(resetToken.token_expires_at) < new Date()) {
      return {
        valid: false,
        error: 'This reset link has expired. Please request a new one.',
        code: PasswordResetErrorCode.TOKEN_EXPIRED
      };
    }

    // Token is valid
    return {
      valid: true,
      email: resetToken.user_email
    };
  }

  /**
   * Reset password - marks token as used and returns token details for webhook
   * IMPORTANT: This only marks the token as used. Caller must trigger webhook to update Keycloak.
   */
  async resetPassword(params: {
    token: string;
  }): Promise<{
    success: boolean;
    tokenId?: string;
    email?: string;
    error?: string;
    code?: string;
  }> {
    const { token } = params;

    // Validate token format
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return {
        success: false,
        error: 'Invalid or expired reset link',
        code: PasswordResetErrorCode.INVALID_TOKEN
      };
    }

    // Get token details
    const selectResult = await pool.query<PasswordResetTokenRow>(
      `SELECT id, user_email, token_expires_at, used_at
       FROM password_reset_tokens
       WHERE reset_token = $1`,
      [token]
    );

    if (selectResult.rows.length === 0) {
      return {
        success: false,
        error: 'Invalid or expired reset link',
        code: PasswordResetErrorCode.INVALID_TOKEN
      };
    }

    const resetToken = selectResult.rows[0];

    // Check if already used
    if (resetToken.used_at !== null) {
      return {
        success: false,
        error: 'This reset link has already been used',
        code: PasswordResetErrorCode.TOKEN_ALREADY_USED
      };
    }

    // Check if expired
    if (new Date(resetToken.token_expires_at) < new Date()) {
      return {
        success: false,
        error: 'This reset link has expired. Please request a new one.',
        code: PasswordResetErrorCode.TOKEN_EXPIRED
      };
    }

    // Mark token as used (atomic single-use enforcement)
    const updateResult = await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE id = $1 AND used_at IS NULL
       RETURNING id, user_email`,
      [resetToken.id]
    );

    if (updateResult.rows.length === 0) {
      // Race condition - another process already used it
      return {
        success: false,
        error: 'This reset link has already been used',
        code: PasswordResetErrorCode.TOKEN_ALREADY_USED
      };
    }

    // Token successfully marked as used
    return {
      success: true,
      tokenId: updateResult.rows[0].id,
      email: updateResult.rows[0].user_email
    };
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < 8) {
      return {
        valid: false,
        error: 'Password must be at least 8 characters'
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one uppercase letter'
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one lowercase letter'
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one number'
      };
    }

    return { valid: true };
  }

  /**
   * Delete token (for cleanup after webhook failure)
   */
  async deleteToken(token: string): Promise<void> {
    await pool.query(
      `DELETE FROM password_reset_tokens WHERE reset_token = $1`,
      [token]
    );
  }
}
```

---

## Phase 4: Webhook Service Updates

### Step 4.1: Add Password Reset Methods

**File**: `packages/api-server/src/services/WebhookService.ts`

**Action**: Add two new methods to the class (after existing methods like `sendDocumentDeleteEvent`)

**Content**:
```typescript
/**
 * Send password reset request webhook event
 */
async sendPasswordResetRequestEvent(params: {
  email: string;
  resetToken: string;
  resetUrl: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
}): Promise<WebhookResponse> {
  // Note: No organizationId/tenant_id needed for unauthenticated password resets
  const payload: BaseWebhookPayload & Record<string, any> = {
    source: 'rita-auth',
    action: 'password_reset_request',
    user_email: params.email,
    tenant_id: undefined, // No tenant context for public password reset
    reset_token: params.resetToken,
    reset_url: params.resetUrl,
    expires_at: params.expiresAt.toISOString(),
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    timestamp: new Date().toISOString()
  };

  return this.sendEvent(payload);
}

/**
 * Send password reset complete webhook event
 */
async sendPasswordResetCompleteEvent(params: {
  email: string;
  password: string; // Plain text - will be Base64 encoded
  resetTokenId: string;
  ipAddress: string;
  userAgent: string;
}): Promise<WebhookResponse> {
  // Base64 encode password to prevent accidental logging of plaintext
  const encodedPassword = Buffer.from(params.password).toString('base64');

  const payload: BaseWebhookPayload & Record<string, any> = {
    source: 'rita-auth',
    action: 'password_reset_complete',
    user_email: params.email,
    tenant_id: undefined, // No tenant context for public password reset
    password: encodedPassword, // Base64 encoded
    reset_token_id: params.resetTokenId,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    timestamp: new Date().toISOString()
  };

  return this.sendEvent(payload);
}
```

---

## Phase 5: API Endpoints

### Step 5.1: Create Auth Routes

**File**: `packages/api-server/src/routes/auth.ts`

**Action**: Add three new endpoints to existing auth routes

**Content**:
```typescript
import { PasswordResetService } from '../services/PasswordResetService.js';
import { WebhookService } from '../services/WebhookService.js';
import type {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  VerifyResetTokenRequest,
  VerifyResetTokenResponse,
  ResetPasswordRequest,
  ResetPasswordResponse
} from '../types/auth.js';

// Initialize services
const passwordResetService = new PasswordResetService();
const webhookService = new WebhookService();

/**
 * POST /auth/forgot-password
 * Request password reset - generates token and sends email
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body as ForgotPasswordRequest;

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Request password reset (includes user existence check + opportunistic cleanup)
    const resetData = await passwordResetService.requestReset({
      email: email.toLowerCase().trim(),
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    // Always return generic success message (prevent email enumeration)
    const genericResponse: ForgotPasswordResponse = {
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent'
    };

    // If user doesn't exist, return early with generic message
    if (!resetData) {
      return res.json(genericResponse);
    }

    // Trigger webhook to send email
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetData.token}`;

    const webhookResult = await webhookService.sendPasswordResetRequestEvent({
      email: email.toLowerCase().trim(),
      resetToken: resetData.token,
      resetUrl,
      expiresAt: resetData.expiresAt,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    if (!webhookResult.success) {
      // Webhook failed - delete token and return error
      await passwordResetService.deleteToken(resetData.token);

      return res.status(500).json({
        error: 'Failed to send password reset email. Please try again.'
      });
    }

    // Success - return generic message
    return res.json(genericResponse);

  } catch (error) {
    console.error('[Auth] Forgot password error:', error);
    return res.status(500).json({
      error: 'An error occurred. Please try again.'
    });
  }
});

/**
 * POST /auth/verify-reset-token
 * Verify reset token validity before showing password form
 */
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body as VerifyResetTokenRequest;

    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'Token is required',
        code: 'PWD_RESET_001'
      });
    }

    // Verify token
    const result = await passwordResetService.verifyToken(token);

    if (!result.valid) {
      return res.status(400).json(result);
    }

    // Token is valid
    const response: VerifyResetTokenResponse = {
      valid: true,
      email: result.email
    };

    return res.json(response);

  } catch (error) {
    console.error('[Auth] Verify reset token error:', error);
    return res.status(500).json({
      valid: false,
      error: 'An error occurred. Please try again.',
      code: 'PWD_RESET_001'
    });
  }
});

/**
 * POST /auth/reset-password
 * Complete password reset - marks token as used and updates Keycloak
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body as ResetPasswordRequest;

    // Validate inputs
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and password are required',
        code: 'PWD_RESET_001'
      });
    }

    // Validate password strength
    const passwordValidation = passwordResetService.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.error,
        code: 'PWD_RESET_005'
      });
    }

    // Mark token as used (atomic single-use enforcement)
    const resetResult = await passwordResetService.resetPassword({ token });

    if (!resetResult.success) {
      return res.status(400).json({
        success: false,
        error: resetResult.error,
        code: resetResult.code
      });
    }

    // Trigger webhook to update Keycloak password
    const webhookResult = await webhookService.sendPasswordResetCompleteEvent({
      email: resetResult.email!,
      password: newPassword, // Plain text (service will Base64 encode)
      resetTokenId: resetResult.tokenId!,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    if (!webhookResult.success) {
      // Webhook failed - token already marked as used, don't rollback
      console.error('[Auth] Password reset webhook failed:', {
        email: resetResult.email,
        tokenId: resetResult.tokenId,
        error: webhookResult.error
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to update password. Please contact support.',
        code: 'PWD_RESET_004'
      });
    }

    // Success
    const response: ResetPasswordResponse = {
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
      email: resetResult.email
    };

    return res.json(response);

  } catch (error) {
    console.error('[Auth] Reset password error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.',
      code: 'PWD_RESET_004'
    });
  }
});
```

### Step 5.2: Rate Limiting (Optional for MVP)

**File**: `packages/api-server/src/middleware/rateLimiter.ts`

> Note: Rate limiting can be implemented in a future iteration. For MVP, skip this step.

---

## Phase 6: Mock Service Updates

### Step 6.1: Add Payload Interfaces

**File**: `packages/mock-service/src/index.ts`

**Action**: Add after existing webhook payload interfaces

**Content**:
```typescript
// Password reset webhook payloads for rita-auth
interface PasswordResetRequestPayload extends BaseWebhookPayload {
  source: 'rita-auth';
  action: 'password_reset_request';
  email: string;
  reset_token: string;
  reset_url: string;
  expires_at: string;
  ip_address: string;
  user_agent: string;
}

interface PasswordResetCompletePayload extends BaseWebhookPayload {
  source: 'rita-auth';
  action: 'password_reset_complete';
  email: string;
  password: string; // Base64 encoded
  reset_token_id: string;
  ip_address: string;
  user_agent: string;
}
```

### Step 6.2: Add Webhook Handlers

**File**: `packages/mock-service/src/index.ts`

**Action**: Add handlers in the webhook POST endpoint (after existing handlers)

**Content**:
```typescript
// Handler: password_reset_request
if (payload.source === 'rita-auth' && payload.action === 'password_reset_request') {
  const resetPayload = payload as PasswordResetRequestPayload;

  // Log mock password reset email prominently for testing
  console.log(`\n${'='.repeat(80)}`);
  console.log('📧 MOCK PASSWORD RESET EMAIL');
  console.log('='.repeat(80));
  console.log(`To: ${resetPayload.email}`);
  console.log(`Reset Token: ${resetPayload.reset_token.substring(0, 16)}...`);
  console.log(`IP Address: ${resetPayload.ip_address}`);
  console.log('');
  console.log('Click here to reset your password:');
  console.log(`${resetPayload.reset_url}`);
  console.log('');
  console.log(`This link will expire at: ${new Date(resetPayload.expires_at).toLocaleString()}`);
  console.log('');
  console.log('If you did not request a password reset, please ignore this email.');
  console.log('(In production, this would be sent via email service)');
  console.log(`${'='.repeat(80)}\n`);

  return res.status(200).json({
    success: true,
    message: 'Password reset email logged successfully',
    email: resetPayload.email
  });
}

// Handler: password_reset_complete
if (payload.source === 'rita-auth' && payload.action === 'password_reset_complete') {
  const completePayload = payload as PasswordResetCompletePayload;

  try {
    // 1. Get Keycloak admin token
    const adminToken = await getKeycloakAdminToken();

    // 2. Find user by email
    const usersResponse = await axios.get(
      `${MOCK_CONFIG.keycloak.baseUrl}/admin/realms/${MOCK_CONFIG.keycloak.realm}/users`,
      {
        params: { email: completePayload.email, exact: true },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (usersResponse.data.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'User not found',
        email: completePayload.email
      });
    }

    const keycloakUserId = usersResponse.data[0].id;

    // 3. Update password in Keycloak
    await axios.put(
      `${MOCK_CONFIG.keycloak.baseUrl}/admin/realms/${MOCK_CONFIG.keycloak.realm}/users/${keycloakUserId}/reset-password`,
      {
        type: 'password',
        value: Buffer.from(completePayload.password, 'base64').toString('utf8'),
        temporary: false
      },
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 4. Log success prominently
    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ PASSWORD RESET COMPLETED');
    console.log('='.repeat(80));
    console.log(`Email: ${completePayload.email}`);
    console.log(`Keycloak User ID: ${keycloakUserId}`);
    console.log(`Reset Token ID: ${completePayload.reset_token_id}`);
    console.log(`IP Address: ${completePayload.ip_address}`);
    console.log('');
    console.log('User can now sign in with their new password!');
    console.log(`${'='.repeat(80)}\n`);

    // 5. Optional: Log mock confirmation email
    console.log(`\n${'='.repeat(80)}`);
    console.log('📧 MOCK PASSWORD CHANGE CONFIRMATION EMAIL');
    console.log('='.repeat(80));
    console.log(`To: ${completePayload.email}`);
    console.log('');
    console.log('Your password was successfully changed.');
    console.log('');
    console.log('If you did not make this change, please contact support immediately.');
    console.log('(In production, this would be sent via email service)');
    console.log(`${'='.repeat(80)}\n`);

    return res.status(200).json({
      success: true,
      message: 'Password reset completed successfully',
      keycloak_user_id: keycloakUserId,
      email: completePayload.email
    });

  } catch (error) {
    console.error('[Mock] Password reset complete error:', error);
    return res.status(200).json({
      success: false,
      message: 'Password reset webhook received but Keycloak update failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

---

## Phase 7: Testing & Validation

### Step 7.1: Start Services

```bash
# Start all services with Docker
docker compose build --pull
docker compose up -d

# Wait for health checks
docker compose ps

# Check logs
docker compose logs -f api-server
docker compose logs -f mock-service
```

### Step 7.2: Manual Testing - Happy Path

**Test 1: Request Password Reset**
```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Expected response:
# {
#   "success": true,
#   "message": "If an account exists with this email, a password reset link will be sent"
# }

# Check mock-service logs for reset email with clickable URL
```

**Test 2: Verify Token**
```bash
# Copy token from mock-service logs
TOKEN="<token-from-logs>"

curl -X POST http://localhost:3000/auth/verify-reset-token \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"

# Expected response:
# {
#   "valid": true,
#   "email": "test@example.com"
# }
```

**Test 3: Reset Password**
```bash
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"newPassword\": \"NewPassword123\"}"

# Expected response:
# {
#   "success": true,
#   "message": "Password reset successfully...",
#   "email": "test@example.com"
# }

# Check mock-service logs for Keycloak update confirmation
```

**Test 4: Login with New Password**
```bash
# Test login with new password via Keycloak
# (Use frontend login page or Keycloak direct grant)
```

### Step 7.3: Test Error Scenarios

**Test: Invalid Email Format**
```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email"}'

# Expected: 400 error
```

**Test: Token Already Used**
```bash
# Submit same token twice
# Second attempt should fail with PWD_RESET_002
```

**Test: Expired Token**
```bash
# Wait 1 hour or manually update token_expires_at in DB
# Verify token should fail with PWD_RESET_003
```

**Test: Invalid Token Format**
```bash
curl -X POST http://localhost:3000/auth/verify-reset-token \
  -H "Content-Type: application/json" \
  -d '{"token": "invalid"}'

# Expected: PWD_RESET_001 error
```

**Test: Weak Password**
```bash
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token": "$TOKEN", "newPassword": "weak"}'

# Expected: PWD_RESET_005 error
```

### Step 7.4: Verify Database

```bash
# Check password_reset_tokens table
psql $DATABASE_URL -c "SELECT * FROM password_reset_tokens;"

# Verify indexes exist
psql $DATABASE_URL -c "\d password_reset_tokens"

# Test opportunistic cleanup (check that old tokens get deleted)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM password_reset_tokens WHERE used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days';"
```

### Step 7.5: Verify Opportunistic Cleanup

```bash
# Create multiple old tokens manually
psql $DATABASE_URL -c "
INSERT INTO password_reset_tokens (user_email, reset_token, token_expires_at, created_at, used_at)
VALUES
  ('old@example.com', 'oldtoken1', NOW() - INTERVAL '2 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'),
  ('old@example.com', 'oldtoken2', NOW() - INTERVAL '3 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '9 days');
"

# Request new reset (should trigger cleanup)
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Verify old tokens were deleted
psql $DATABASE_URL -c "SELECT COUNT(*) FROM password_reset_tokens WHERE used_at < NOW() - INTERVAL '7 days';"
# Expected: 0
```

---

## Implementation Notes

### Environment Variables

Ensure these are set in `packages/api-server/.env`:

```env
# Client URL for reset links
CLIENT_URL=http://localhost:5173

# Database connection
DATABASE_URL=postgresql://...

# Webhook configuration
AUTOMATION_WEBHOOK_URL=http://mock-service:3001/webhook
AUTOMATION_AUTH=Bearer your-secret-token
```

### Security Checklist

- [ ] Tokens are cryptographically random (crypto.randomBytes)
- [ ] Passwords never stored in database
- [ ] Base64 encoding used for webhook transmission
- [ ] Email enumeration prevented (generic responses)
- [ ] Single-use enforcement (atomic UPDATE)
- [ ] Short expiration (1 hour)
- [ ] IP and user agent logged
- [ ] HTTPS enforced in production

### Performance Considerations

- [ ] Opportunistic cleanup query optimized (<5ms typical)
- [ ] Indexes on all WHERE/JOIN columns
- [ ] Partial unique index for active tokens only
- [ ] Webhook timeout set to 10 seconds
- [ ] Connection pool properly configured

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Migration tested on staging database
- [ ] Environment variables configured
- [ ] Webhook endpoint configured
- [ ] Error monitoring setup

### Deployment Steps
1. [ ] Deploy database migration
2. [ ] Deploy API server changes
3. [ ] Deploy mock service changes (if applicable)
4. [ ] Verify services healthy
5. [ ] Test password reset flow end-to-end
6. [ ] Monitor logs for errors

### Post-Deployment
- [ ] Monitor webhook success rate
- [ ] Monitor token usage patterns
- [ ] Verify cleanup is working
- [ ] Check error logs for issues
- [ ] Document any production issues

---

## Troubleshooting

### Issue: Webhook fails to send email

**Symptoms**: API returns 500 error, token deleted from database

**Check**:
- Mock service is running: `docker compose ps`
- Webhook URL is correct: `echo $AUTOMATION_WEBHOOK_URL`
- Authorization header is set: `echo $AUTOMATION_AUTH`

**Fix**:
- Restart mock service: `docker compose restart mock-service`
- Check mock service logs: `docker compose logs mock-service`

### Issue: Token already used error immediately

**Symptoms**: Token fails verification immediately after creation

**Check**:
- Database transaction committed: Check for ROLLBACK in logs
- `used_at` is NULL in database: `SELECT used_at FROM password_reset_tokens WHERE reset_token = '...'`

**Fix**:
- Check for race conditions in code
- Verify atomic UPDATE is working

### Issue: Opportunistic cleanup not working

**Symptoms**: Old tokens accumulating in database

**Check**:
- Cleanup query runs during requestReset(): Add logging
- Query has correct WHERE clause
- Indexes exist: `\d password_reset_tokens`

**Fix**:
- Add explicit logging to cleanup query
- Verify transaction completes successfully

---

## Success Criteria

### Backend Implementation Complete ✓
- [ ] Database migration deployed and tested
- [ ] All 3 API endpoints implemented and working
- [ ] Webhook integration functional
- [ ] Mock service handlers working
- [ ] Error handling tested
- [ ] Database documentation updated
- [ ] ERD diagram updated

### Testing Complete ✓
- [ ] Happy path tested end-to-end
- [ ] All error scenarios tested
- [ ] Token validation working correctly
- [ ] Opportunistic cleanup verified
- [ ] Keycloak password update working
- [ ] Security measures validated

### Ready for Frontend ✓
- [ ] API endpoints documented
- [ ] Request/response contracts defined
- [ ] Error codes documented
- [ ] Example curl commands provided
- [ ] Frontend can begin implementation

---

## Next Steps

Once backend implementation is complete:

1. **Frontend Implementation** (separate plan)
   - Create password reset pages
   - Implement form validation
   - Add routing and navigation
   - Test UI/UX flow

2. **Production Deployment**
   - Configure production webhook endpoint
   - Setup email service integration
   - Configure monitoring and alerts
   - Deploy to production environment

3. **Future Enhancements**
   - Rate limiting middleware
   - MFA support during reset
   - Password history checking
   - Security notification emails
   - Account lockout after failed attempts

---

## Document History

- **Created**: 2025-01-XX
- **Version**: 1.0
- **Author**: Backend Development Team
- **Status**: Ready for Implementation
