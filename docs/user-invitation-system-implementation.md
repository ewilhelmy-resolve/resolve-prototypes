# User Invitation System - Implementation Plan

## Overview

This document provides a detailed, step-by-step implementation plan for the User Invitation System as specified in [user-invitation-system.md](./user-invitation-system.md). The plan is organized into phases with clear dependencies, deliverables, and acceptance criteria.

## Implementation Strategy

**Approach**: Bottom-up implementation (database → backend → frontend)
**Timeline**: 3-4 weeks (estimates for single developer)
**Risk Level**: Medium (webhook integration, email verification, JIT provisioning)

## Phase 1: Database Schema (Week 1, Day 1-2)

### 1.1 Create Migration File

**File**: `packages/api-server/src/database/migrations/122_add_pending_invitations.sql`

**Tasks**:
- [ ] Create migration file with table definition
- [ ] Add all required indexes for performance
- [ ] Add unique constraint for pending invitations per org
- [ ] Add foreign key constraints with CASCADE delete
- [ ] Add table and column comments

**Migration SQL**:
```sql
-- Create pending_invitations table
CREATE TABLE pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  invitation_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'user')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled', 'failed'))
);

-- Indexes for performance
CREATE INDEX idx_pending_invitations_email ON pending_invitations(email);
CREATE INDEX idx_pending_invitations_token ON pending_invitations(invitation_token);
CREATE INDEX idx_pending_invitations_org_id ON pending_invitations(organization_id);
CREATE INDEX idx_pending_invitations_status ON pending_invitations(status);
CREATE INDEX idx_pending_invitations_token_expires_at ON pending_invitations(token_expires_at);

-- Unique constraint for pending invitations
CREATE UNIQUE INDEX idx_pending_invitations_unique_email_org
  ON pending_invitations(email, organization_id)
  WHERE status = 'pending';

-- Comments
COMMENT ON TABLE pending_invitations IS 'Stores organization user invitations until accepted';
COMMENT ON COLUMN pending_invitations.invitation_token IS 'Unique token sent via email for invitation acceptance';
COMMENT ON COLUMN pending_invitations.role IS 'Role the user will have in the organization upon acceptance';
COMMENT ON COLUMN pending_invitations.status IS 'Current status of the invitation';
```

**Acceptance Criteria**:
- [ ] Migration runs successfully on clean database
- [ ] All constraints work as expected (test with sample data)
- [ ] Indexes are created and used by queries
- [ ] Foreign key cascades work correctly

**Testing**:
```bash
# Run migration
npm run migrate:up

# Test constraints
psql -d onboarding -U rita -c "
INSERT INTO pending_invitations (
  organization_id, invited_by_user_id, email, role,
  invitation_token, token_expires_at
) VALUES (
  '<org-uuid>', '<user-uuid>', 'test@example.com', 'user',
  'token123', NOW() + INTERVAL '7 days'
);
"

# Test duplicate prevention (should fail)
# Test invalid role (should fail)
# Test invalid status (should fail)
```

---

## Phase 2: Backend Core Services (Week 1, Day 3-5)

### 2.1 Create TypeScript Types

**File**: `packages/api-server/src/types/invitation.ts`

**Tasks**:
- [ ] Create invitation database types
- [ ] Create API request/response types
- [ ] Create webhook payload types
- [ ] Export all types

**Implementation**:
```typescript
// Database types
export interface PendingInvitation {
  id: string;
  organization_id: string;
  invited_by_user_id: string;
  email: string;
  role: 'owner' | 'admin' | 'user';
  invitation_token: string;
  token_expires_at: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled' | 'failed';
  created_at: Date;
  accepted_at: Date | null;
}

// API types
export interface SendInvitationsRequest {
  emails: string[];
}

export interface SendInvitationsResponse {
  success: boolean;
  invitations: Array<{
    email: string;
    status: 'sent' | 'already_member' | 'already_invited' | 'failed' | 'skipped';
    reason?: string;
    code?: string;
  }>;
  successCount: number;
  failureCount: number;
}

export interface VerifyInvitationResponse {
  valid: boolean;
  invitation: {
    email: string;
    organizationName: string;
    inviterName: string;
    role: string;
    expiresAt: string;
  } | null;
  error?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}

// Webhook payload types
export interface SendInvitationWebhookPayload {
  tenant_id: string;
  source: 'rita-invitations';
  action: 'send_invitation';
  organization_name: string;
  invited_by_email: string;
  invited_by_name: string;
  invitations: Array<{
    invitee_email: string;
    invitation_token: string;
    invitation_url: string;
    role: string;
    invitation_id: string;
    expires_at: string;
  }>;
  timestamp: string;
}

export interface AcceptInvitationWebhookPayload {
  tenant_id: string;
  user_email: string;
  source: 'rita-invitations';
  action: 'accept_invitation';
  invitation_id: string;
  first_name: string;
  last_name: string;
  password: string; // Base64 encoded
  role: string;
  email_verified: true;
  timestamp: string;
}
```

**Acceptance Criteria**:
- [ ] All types compile without errors
- [ ] Types match database schema exactly
- [ ] Webhook payload types match design document

---

### 2.2 Create InvitationService

**File**: `packages/api-server/src/services/InvitationService.ts`

**Tasks**:
- [ ] Implement `sendInvitations()` - batch invitation creation
- [ ] Implement `verifyToken()` - lookup and validate invitation
- [ ] Implement `acceptInvitation()` - mark as accepted, trigger webhook
- [ ] Implement `cancelInvitation()` - mark as cancelled
- [ ] Implement `listInvitations()` - get org invitations with filters
- [ ] Add comprehensive error handling
- [ ] Add input validation

**Key Methods**:

```typescript
export class InvitationService {
  constructor(
    private pool: Pool,
    private webhookService: WebhookService
  ) {}

  /**
   * Send invitations to multiple emails (batch processing)
   * - Validates emails
   * - Checks for duplicates (existing members, pending invitations)
   * - Checks single-org constraint
   * - Creates invitation records
   * - Triggers single webhook for batch
   * - Updates status based on webhook result
   */
  async sendInvitations(
    organizationId: string,
    invitedByUserId: string,
    emails: string[]
  ): Promise<SendInvitationsResponse>;

  /**
   * Verify invitation token and return details
   * - Validates token format
   * - Checks expiration
   * - Checks status (must be pending)
   * - Returns org and inviter details
   */
  async verifyToken(token: string): Promise<VerifyInvitationResponse>;

  /**
   * Accept invitation and create Keycloak account
   * - Validates token
   * - Checks email not already registered
   * - Marks invitation as accepted (atomic)
   * - Triggers webhook for Keycloak user creation
   * - Returns success (fire-and-forget)
   */
  async acceptInvitation(
    token: string,
    firstName: string,
    lastName: string,
    password: string
  ): Promise<{ success: boolean; email: string }>;

  /**
   * Cancel pending invitation
   * - Validates invitation exists and is pending
   * - Marks as cancelled
   * - (Optional) Triggers webhook for notification
   */
  async cancelInvitation(
    invitationId: string,
    organizationId: string
  ): Promise<{ success: boolean }>;

  /**
   * List invitations for organization
   * - Supports filtering by status
   * - Supports pagination
   * - Returns invitation details with inviter info
   */
  async listInvitations(
    organizationId: string,
    filters?: { status?: string; limit?: number; offset?: number }
  ): Promise<PendingInvitation[]>;
}
```

**Critical Implementation Details**:

1. **Email Validation**:
```typescript
private validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

2. **Duplicate Checking**:
```typescript
// Check if already member
const existingMember = await this.pool.query(
  `SELECT 1 FROM organization_members om
   JOIN user_profiles up ON om.user_id = up.user_id
   WHERE up.email = $1 AND om.organization_id = $2`,
  [email, organizationId]
);

// Check if pending invitation exists
const existingInvitation = await this.pool.query(
  `SELECT id, status FROM pending_invitations
   WHERE email = $1 AND organization_id = $2`,
  [email, organizationId]
);
```

3. **Single-Org Constraint Check**:
```typescript
const existingUserWithOrg = await this.pool.query(
  `SELECT up.user_id FROM user_profiles up
   JOIN organization_members om ON up.user_id = om.user_id
   WHERE up.email = $1 LIMIT 1`,
  [email]
);

if (existingUserWithOrg.rows.length > 0) {
  skippedEmails.push({
    email,
    status: 'skipped',
    reason: 'User already has an organization',
    code: 'INV012'
  });
}
```

4. **Token Generation**:
```typescript
import crypto from 'crypto';

const invitationToken = crypto.randomBytes(32).toString('hex'); // 64 characters
const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
```

5. **Atomic Status Update**:
```typescript
const result = await this.pool.query(
  `UPDATE pending_invitations
   SET status = 'accepted', accepted_at = NOW()
   WHERE id = $1 AND status = 'pending'
   RETURNING id`,
  [invitationId]
);

if (result.rows.length === 0) {
  throw new Error('Invitation already accepted or invalid');
}
```

**Acceptance Criteria**:
- [ ] All methods work with valid input
- [ ] Proper error handling for invalid input
- [ ] Database transactions used where needed
- [ ] Webhook integration works correctly
- [ ] Single-org constraint enforced
- [ ] Email validation prevents invalid addresses
- [ ] Token expiration checked correctly

**Unit Tests**:
```typescript
describe('InvitationService', () => {
  describe('sendInvitations', () => {
    it('should send invitations successfully', async () => {});
    it('should skip already-member emails', async () => {});
    it('should skip users with existing organizations', async () => {});
    it('should handle webhook failures', async () => {});
    it('should deduplicate email list', async () => {});
  });

  describe('verifyToken', () => {
    it('should return valid invitation details', async () => {});
    it('should reject expired tokens', async () => {});
    it('should reject already-accepted tokens', async () => {});
  });

  describe('acceptInvitation', () => {
    it('should accept valid invitation', async () => {});
    it('should prevent duplicate accepts', async () => {});
    it('should validate token format', async () => {});
  });
});
```

---

### 2.3 Update SessionService for JIT Provisioning

**File**: `packages/api-server/src/services/sessionService.ts`

**Location**: `findOrCreateUser()` method (line ~52)

**Tasks**:
- [ ] Add invitation check BEFORE organization creation
- [ ] Skip personal org creation if invitations exist
- [ ] Add user to invited organization(s)
- [ ] Set active organization to first invited org
- [ ] Handle multiple pending invitations

**Implementation**:
```typescript
async findOrCreateUser(tokenPayload: jose.JWTPayload) {
  const email = tokenPayload.email as string;
  const keycloakId = tokenPayload.sub as string;

  // 1. Check if user already exists
  let userResult = await this.pool.query(
    `SELECT user_id, active_organization_id FROM user_profiles WHERE keycloak_id = $1`,
    [keycloakId]
  );

  if (userResult.rows.length > 0) {
    return {
      userId: userResult.rows[0].user_id,
      organizationId: userResult.rows[0].active_organization_id,
      email
    };
  }

  // 2. NEW USER: Check for accepted invitations FIRST
  const invitationsResult = await this.pool.query(
    `SELECT id, organization_id, role
     FROM pending_invitations
     WHERE email = $1 AND status = 'accepted'
     ORDER BY created_at ASC`,
    [email]
  );

  // 3. Create user + org in transaction
  const client = await this.pool.connect();
  try {
    await client.query('BEGIN');

    // Create user profile
    const userInsertResult = await client.query(
      `INSERT INTO user_profiles (keycloak_id, email, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id`,
      [keycloakId, email, tokenPayload.given_name, tokenPayload.family_name]
    );
    const userId = userInsertResult.rows[0].user_id;

    let activeOrganizationId: string | null = null;

    if (invitationsResult.rows.length > 0) {
      // User was invited - add to org(s), DON'T create personal org
      for (const invitation of invitationsResult.rows) {
        await client.query(
          `INSERT INTO organization_members (organization_id, user_id, role)
           VALUES ($1, $2, $3)
           ON CONFLICT (organization_id, user_id) DO NOTHING`,
          [invitation.organization_id, userId, invitation.role]
        );

        if (!activeOrganizationId) {
          activeOrganizationId = invitation.organization_id;
        }
      }

      await client.query(
        `UPDATE user_profiles SET active_organization_id = $1 WHERE user_id = $2`,
        [activeOrganizationId, userId]
      );
    } else {
      // Normal signup - create personal organization
      const orgName = tokenPayload.company || `${tokenPayload.given_name}'s Organization`;
      const orgResult = await client.query(
        `INSERT INTO organizations (name, created_by_user_id)
         VALUES ($1, $2) RETURNING id`,
        [orgName, userId]
      );
      activeOrganizationId = orgResult.rows[0].id;

      await client.query(
        `INSERT INTO organization_members (organization_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [activeOrganizationId, userId]
      );

      await client.query(
        `UPDATE user_profiles SET active_organization_id = $1 WHERE user_id = $2`,
        [activeOrganizationId, userId]
      );
    }

    await client.query('COMMIT');
    return { userId, organizationId: activeOrganizationId, email };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Acceptance Criteria**:
- [ ] Invited users added to correct organization
- [ ] Invited users do NOT get personal organization
- [ ] Normal signups still get personal organization
- [ ] Multiple invitations handled correctly
- [ ] Transaction rollback works on error

**Integration Tests**:
```typescript
describe('SessionService - JIT Provisioning', () => {
  it('should create personal org for normal signup', async () => {});
  it('should add invited user to invited org (no personal org)', async () => {});
  it('should handle multiple invitations', async () => {});
  it('should rollback on error', async () => {});
});
```

---

## Phase 3: Backend API Routes (Week 2, Day 1-3)

### 3.1 Create Invitation Routes

**File**: `packages/api-server/src/routes/invitations.ts`

**Tasks**:
- [ ] Create router with all endpoints
- [ ] Add authentication middleware
- [ ] Add permission checks (owner/admin only)
- [ ] Add rate limiting middleware
- [ ] Add input validation
- [ ] Add audit logging
- [ ] Add error handling

**Endpoints**:

```typescript
import express from 'express';
import { InvitationService } from '../services/InvitationService.js';
import { authenticateSession } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import { rateLimiter } from '../middleware/rate-limit.js';

const router = express.Router();
const invitationService = new InvitationService(pool, webhookService);

/**
 * POST /api/invitations/send
 * Send invitations to multiple emails
 * Auth: Required (owner/admin)
 * Rate Limit: 50 invitations per org per hour
 */
router.post(
  '/send',
  authenticateSession,
  requireRole(['owner', 'admin']),
  rateLimiter({ max: 50, windowMs: 60 * 60 * 1000 }),
  async (req, res) => {
    try {
      const { emails } = req.body;
      const { organizationId, userId } = req.session;

      // Validate input
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: 'Emails array is required' });
      }

      if (emails.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 invitations per request' });
      }

      const result = await invitationService.sendInvitations(
        organizationId,
        userId,
        emails
      );

      res.json(result);
    } catch (error) {
      logger.error({ error }, 'Failed to send invitations');
      res.status(500).json({ error: 'Failed to send invitations' });
    }
  }
);

/**
 * GET /api/invitations/verify/:token
 * Verify invitation token and return details
 * Auth: Not required (public)
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length !== 64) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    const result = await invitationService.verifyToken(token);
    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to verify invitation');
    res.status(500).json({ error: 'Failed to verify invitation' });
  }
});

/**
 * POST /api/invitations/accept
 * Accept invitation and create account
 * Auth: Not required (public)
 * Rate Limit: 5 attempts per token per hour
 */
router.post(
  '/accept',
  rateLimiter({ max: 5, windowMs: 60 * 60 * 1000, keyGenerator: (req) => req.body.token }),
  async (req, res) => {
    try {
      const { token, firstName, lastName, password } = req.body;

      // Validate input
      if (!token || !firstName || !lastName || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const result = await invitationService.acceptInvitation(
        token,
        firstName,
        lastName,
        password
      );

      res.json({
        success: true,
        message: 'Account created successfully. You can sign in shortly.',
        email: result.email
      });
    } catch (error) {
      logger.error({ error }, 'Failed to accept invitation');

      if (error.message.includes('already accepted')) {
        return res.status(400).json({ error: 'Invitation already accepted', code: 'INV003' });
      }

      if (error.message.includes('expired')) {
        return res.status(400).json({ error: 'Invitation expired', code: 'INV002' });
      }

      res.status(500).json({ error: 'Failed to accept invitation' });
    }
  }
);

/**
 * GET /api/invitations/list
 * List invitations for organization
 * Auth: Required (owner/admin)
 */
router.get(
  '/list',
  authenticateSession,
  requireRole(['owner', 'admin']),
  async (req, res) => {
    try {
      const { organizationId } = req.session;
      const { status, limit = 50, offset = 0 } = req.query;

      const invitations = await invitationService.listInvitations(
        organizationId,
        { status: status as string, limit: Number(limit), offset: Number(offset) }
      );

      res.json({ invitations });
    } catch (error) {
      logger.error({ error }, 'Failed to list invitations');
      res.status(500).json({ error: 'Failed to list invitations' });
    }
  }
);

/**
 * DELETE /api/invitations/:id/cancel
 * Cancel pending invitation
 * Auth: Required (owner/admin)
 */
router.delete(
  '/:id/cancel',
  authenticateSession,
  requireRole(['owner', 'admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { organizationId } = req.session;

      const result = await invitationService.cancelInvitation(id, organizationId);
      res.json(result);
    } catch (error) {
      logger.error({ error }, 'Failed to cancel invitation');
      res.status(500).json({ error: 'Failed to cancel invitation' });
    }
  }
);

export default router;
```

**Acceptance Criteria**:
- [ ] All endpoints respond correctly to valid requests
- [ ] Authentication required on protected endpoints
- [ ] Permission checks work (only owner/admin can send)
- [ ] Rate limiting prevents abuse
- [ ] Input validation catches bad data
- [ ] Error responses include helpful messages

---

### 3.2 Register Routes in Main Server

**File**: `packages/api-server/src/index.ts`

**Tasks**:
- [ ] Import invitation routes
- [ ] Register routes under `/api/invitations`
- [ ] Ensure routes come after auth middleware

**Implementation**:
```typescript
import invitationRoutes from './routes/invitations.js';

// ... existing code ...

app.use('/api/invitations', invitationRoutes);
```

---

## Phase 4: Frontend Implementation (Week 2-3)

### 4.1 Create API Hooks

**File**: `packages/client/src/hooks/useInvitations.ts`

**Tasks**:
- [ ] Create `useSendInvitations` mutation hook
- [ ] Create `useVerifyInvitation` query hook
- [ ] Create `useAcceptInvitation` mutation hook
- [ ] Create `useInvitations` list query hook
- [ ] Create `useCancelInvitation` mutation hook
- [ ] Add error handling and loading states
- [ ] Add optimistic updates where appropriate

**Implementation**:
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Send invitations
export function useSendInvitations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { emails: string[] }) => {
      const response = await api.post('/api/invitations/send', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    }
  });
}

// Verify invitation token
export function useVerifyInvitation(token: string | null) {
  return useQuery({
    queryKey: ['invitation-verify', token],
    queryFn: async () => {
      if (!token) return null;
      const response = await api.get(`/api/invitations/verify/${token}`);
      return response.data;
    },
    enabled: !!token,
    retry: false
  });
}

// Accept invitation
export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async (data: {
      token: string;
      firstName: string;
      lastName: string;
      password: string;
    }) => {
      const response = await api.post('/api/invitations/accept', data);
      return response.data;
    }
  });
}

// List invitations
export function useInvitations(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['invitations', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);

      const response = await api.get(`/api/invitations/list?${params}`);
      return response.data.invitations;
    }
  });
}

// Cancel invitation
export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await api.delete(`/api/invitations/${invitationId}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    }
  });
}
```

**Acceptance Criteria**:
- [ ] All hooks work with TanStack Query
- [ ] Loading and error states handled
- [ ] Cache invalidation on mutations
- [ ] TypeScript types are correct

---

### 4.2 Create Invitation Form Component

**File**: `packages/client/src/components/invitations/InvitationForm.tsx`

**Tasks**:
- [ ] Create textarea for email input (comma-separated)
- [ ] Add email validation
- [ ] Show success/error feedback
- [ ] Display note about user role assignment
- [ ] Add loading state

**Implementation**:
```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSendInvitations } from '@/hooks/useInvitations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

const schema = z.object({
  emails: z.string().min(1, 'At least one email is required')
});

type FormData = z.infer<typeof schema>;

export function InvitationForm() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const sendInvitations = useSendInvitations();

  const onSubmit = async (data: FormData) => {
    // Parse comma-separated emails
    const emails = data.emails
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    await sendInvitations.mutateAsync({
      emails
    });

    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Email Addresses</label>
        <Textarea
          {...register('emails')}
          placeholder="Enter email addresses separated by commas"
          rows={4}
          disabled={sendInvitations.isPending}
        />
        {errors.emails && (
          <p className="text-sm text-red-500 mt-1">{errors.emails.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Enter multiple emails separated by commas (max 50)
        </p>
      </div>

      <Alert>
        <AlertDescription>
          All users will be invited with 'user' role. You can promote them later from the Members page.
        </AlertDescription>
      </Alert>

      {sendInvitations.isSuccess && (
        <Alert>
          <AlertDescription>
            ✓ Invitations sent successfully! ({sendInvitations.data.successCount} sent)
          </AlertDescription>
        </Alert>
      )}

      {sendInvitations.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to send invitations. Please try again.
          </AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={sendInvitations.isPending}>
        {sendInvitations.isPending ? 'Sending...' : 'Send Invitations'}
      </Button>
    </form>
  );
}
```

**Acceptance Criteria**:
- [ ] Email parsing works correctly
- [ ] Validation prevents empty submissions
- [ ] Success/error states displayed
- [ ] Loading state prevents double submissions
- [ ] Form resets after successful send

---

### 4.3 Create Invitation List Component

**File**: `packages/client/src/components/invitations/InvitationList.tsx`

**Tasks**:
- [ ] Display invitations in table
- [ ] Show email, role, status, date, inviter
- [ ] Add cancel action for pending invitations
- [ ] Add status filter dropdown
- [ ] Add pagination
- [ ] Handle loading and error states

**Implementation**:
```typescript
import { useState } from 'react';
import { useInvitations, useCancelInvitation } from '@/hooks/useInvitations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function InvitationList() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: invitations, isLoading, error } = useInvitations(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  const cancelInvitation = useCancelInvitation();

  const handleCancel = async (invitationId: string) => {
    if (confirm('Are you sure you want to cancel this invitation?')) {
      await cancelInvitation.mutateAsync(invitationId);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'default',
      accepted: 'secondary',
      expired: 'destructive',
      cancelled: 'outline',
      failed: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (isLoading) return <div>Loading invitations...</div>;
  if (error) return <div>Failed to load invitations</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Invitations</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Invited By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations?.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell>{invitation.email}</TableCell>
              <TableCell>{invitation.role}</TableCell>
              <TableCell>{getStatusBadge(invitation.status)}</TableCell>
              <TableCell>{invitation.invited_by_name}</TableCell>
              <TableCell>{new Date(invitation.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                {invitation.status === 'pending' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancel(invitation.id)}
                  >
                    Cancel
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!invitations || invitations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No invitations found
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Table displays invitation data correctly
- [ ] Status filter works
- [ ] Cancel action works
- [ ] Loading and empty states handled

---

### 4.4 Create Invite Signup Form Component

**File**: `packages/client/src/components/invitations/InviteSignupForm.tsx`

**Tasks**:
- [ ] Display prominent email warning
- [ ] Create form with first name, last name, password fields
- [ ] Add password strength meter
- [ ] Add terms checkbox
- [ ] Show 8-second progress indicator on submit
- [ ] Navigate to login after success
- [ ] Handle errors

**Implementation**:
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAcceptInvitation } from '@/hooks/useInvitations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Loader, CheckCircle } from 'lucide-react';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword']
});

type FormData = z.infer<typeof schema>;

interface Props {
  token: string;
  email: string;
  organizationName: string;
}

export function InviteSignupForm({ token, email, organizationName }: Props) {
  const navigate = useNavigate();
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const acceptInvitation = useAcceptInvitation();

  const animateProgress = (duration: number): Promise<void> => {
    return new Promise((resolve) => {
      const interval = 50;
      const steps = duration / interval;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        setProgress((step / steps) * 100);

        if (step >= steps) {
          clearInterval(timer);
          resolve();
        }
      }, interval);
    });
  };

  const onSubmit = async (data: FormData) => {
    try {
      await acceptInvitation.mutateAsync({
        token,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password
      });

      // Show progress indicator
      setShowProgress(true);
      await animateProgress(8000); // 8 seconds

      // Show success
      setShowProgress(false);
      setSuccess(true);

      // Navigate to login after 2 seconds
      setTimeout(() => {
        navigate('/login', {
          state: {
            email,
            message: 'Account created! Please sign in.'
          }
        });
      }, 2000);

    } catch (error) {
      console.error('Failed to accept invitation:', error);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold">Account Created!</h2>
        <p className="text-gray-600">
          Welcome to {organizationName}! Redirecting to login...
        </p>
      </div>
    );
  }

  if (showProgress) {
    return (
      <div className="text-center space-y-4">
        <Loader className="w-8 h-8 animate-spin mx-auto" />
        <p className="text-gray-600">Creating your account, please wait...</p>
        <Progress value={progress} className="w-full" />
        <p className="text-xs text-gray-500">This usually takes 5-10 seconds...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Prominent email display */}
      <div className="text-center mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-600">Creating account for:</p>
        <p className="text-xl font-semibold text-gray-900">{email}</p>
        <p className="text-xs text-gray-500 mt-2">
          If this is not your email address, do not proceed.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">First Name</label>
        <Input {...register('firstName')} />
        {errors.firstName && (
          <p className="text-sm text-red-500">{errors.firstName.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Last Name</label>
        <Input {...register('lastName')} />
        {errors.lastName && (
          <p className="text-sm text-red-500">{errors.lastName.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Password</label>
        <Input type="password" {...register('password')} />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Confirm Password</label>
        <Input type="password" {...register('confirmPassword')} />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox {...register('acceptTerms')} />
        <label className="text-sm">I accept the terms and conditions</label>
      </div>
      {errors.acceptTerms && (
        <p className="text-sm text-red-500">{errors.acceptTerms.message}</p>
      )}

      {acceptInvitation.isError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
          Failed to create account. Please try again.
        </div>
      )}

      <Button type="submit" className="w-full" disabled={acceptInvitation.isPending}>
        Create Account & Join {organizationName}
      </Button>
    </form>
  );
}
```

**Acceptance Criteria**:
- [ ] Email displayed prominently with warning
- [ ] Form validation works
- [ ] Progress indicator shows for 8 seconds
- [ ] Success state redirects to login
- [ ] Error handling works

---

### 4.5 Create Pages

**Tasks**:
- [ ] Create `/v1/settings/invitations` page (protected)
- [ ] Create `/invite` page (public)
- [ ] Add routes to router
- [ ] Add permission guards

**File**: `packages/client/src/pages/InvitationsPage.tsx`

```typescript
import { InvitationForm } from '@/components/invitations/InvitationForm';
import { InvitationList } from '@/components/invitations/InvitationList';

export function InvitationsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Invite Team Members</h1>
        <p className="text-gray-600">
          Invite users to join your organization. They'll receive an email with instructions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InvitationForm />
        <InvitationList />
      </div>
    </div>
  );
}
```

**File**: `packages/client/src/pages/InviteAcceptPage.tsx`

```typescript
import { useSearchParams } from 'react-router-dom';
import { useVerifyInvitation } from '@/hooks/useInvitations';
import { InviteSignupForm } from '@/components/invitations/InviteSignupForm';

export function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { data, isLoading, error } = useVerifyInvitation(token);

  if (isLoading) {
    return <div className="text-center py-8">Verifying invitation...</div>;
  }

  if (error || !data?.valid) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Invitation</h1>
        <p className="text-gray-600">
          This invitation link is invalid or has expired. Please contact the person who invited you.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Join {data.invitation.organizationName}</h1>
        <p className="text-gray-600">
          You've been invited by {data.invitation.inviterName} to join as a {data.invitation.role}.
        </p>
      </div>

      <InviteSignupForm
        token={token!}
        email={data.invitation.email}
        organizationName={data.invitation.organizationName}
      />
    </div>
  );
}
```

**Update Router** (`packages/client/src/router.tsx`):

```typescript
// Add to routes
{
  path: '/invite',
  element: <InviteAcceptPage />
},
{
  path: '/v1/settings/invitations',
  element: (
    <ProtectedRoute>
      <RitaLayout>
        <InvitationsPage />
      </RitaLayout>
    </ProtectedRoute>
  )
}
```

**Acceptance Criteria**:
- [ ] Invitations page accessible to logged-in users
- [ ] Invite accept page accessible without login
- [ ] Routes work correctly
- [ ] Navigation integrated

---

## Phase 5: Testing (Week 3, Day 4-5)

### 5.1 Backend Unit Tests

**Tasks**:
- [ ] Test InvitationService methods
- [ ] Test SessionService JIT provisioning
- [ ] Test email validation
- [ ] Test token generation
- [ ] Test duplicate prevention
- [ ] Test error handling

**Run Tests**:
```bash
cd packages/api-server
npm test src/services/InvitationService.test.ts
npm test src/services/sessionService.test.ts
```

---

### 5.2 Backend Integration Tests

**Tasks**:
- [ ] Test full invitation flow (send → accept → login)
- [ ] Test webhook integration
- [ ] Test database constraints
- [ ] Test permission checks
- [ ] Test rate limiting

---

### 5.3 Frontend Unit Tests

**Tasks**:
- [ ] Test invitation form validation
- [ ] Test email parsing
- [ ] Test API hooks
- [ ] Test component rendering

**Run Tests**:
```bash
cd packages/client
npm test src/components/invitations/
npm test src/hooks/useInvitations.test.ts
```

---

### 5.4 E2E Tests (Playwright)

**File**: `tests/e2e/invitations.spec.ts`

**Tasks**:
- [ ] Test owner sends invitation
- [ ] Test invited user accepts invitation
- [ ] Test invited user logs in and has access
- [ ] Test canceling invitation
- [ ] Test expired token handling

**Implementation**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('User Invitation System', () => {
  test('owner can send invitation', async ({ page }) => {
    // Login as owner
    await page.goto('/login');
    await page.fill('[name=email]', 'owner@example.com');
    await page.fill('[name=password]', 'password123');
    await page.click('button[type=submit]');

    // Navigate to invitations page
    await page.goto('/v1/settings/invitations');

    // Send invitation
    await page.fill('[name=emails]', 'newuser@example.com');
    await page.click('button:has-text("Send Invitations")');

    // Verify success
    await expect(page.locator('text=Invitations sent successfully')).toBeVisible();
  });

  test('invited user can accept invitation', async ({ page, context }) => {
    // Get invitation token (from email or database)
    const token = 'test-token-123';

    // Open invitation link
    await page.goto(`/invite?token=${token}`);

    // Verify invitation details shown
    await expect(page.locator('text=Join')).toBeVisible();

    // Fill signup form
    await page.fill('[name=firstName]', 'New');
    await page.fill('[name=lastName]', 'User');
    await page.fill('[name=password]', 'Password123');
    await page.fill('[name=confirmPassword]', 'Password123');
    await page.check('[name=acceptTerms]');

    // Submit
    await page.click('button:has-text("Create Account")');

    // Wait for progress indicator
    await expect(page.locator('text=Creating your account')).toBeVisible();

    // Wait for success
    await expect(page.locator('text=Account Created')).toBeVisible({ timeout: 10000 });
  });

  test('invited user can login and access organization', async ({ page }) => {
    // Login as newly invited user
    await page.goto('/login');
    await page.fill('[name=email]', 'newuser@example.com');
    await page.fill('[name=password]', 'Password123');
    await page.click('button[type=submit]');

    // Verify user has access to organization
    await expect(page.locator('text=Welcome')).toBeVisible();

    // Verify user does NOT have personal organization
    // (invited users skip personal org creation)
  });
});
```

**Run Tests**:
```bash
cd packages/client
npm run test:e2e
```

---

## Phase 6: Database Cleanup & Monitoring (Week 4, Day 1)

### 6.1 Create Cleanup Cron Job

**File**: `packages/api-server/src/jobs/cleanup-invitations.ts`

**Tasks**:
- [ ] Create cleanup function
- [ ] Mark expired invitations
- [ ] Delete old invitations (90 days for expired/cancelled, 30 days for accepted)
- [ ] Log cleanup metrics
- [ ] Schedule to run daily at 2 AM UTC

**Implementation**:
```typescript
import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';

export async function cleanupExpiredInvitations() {
  try {
    logger.info('Starting invitation cleanup job');

    // Mark expired invitations
    const expiredResult = await pool.query(
      `UPDATE pending_invitations
       SET status = 'expired'
       WHERE status = 'pending'
       AND token_expires_at < NOW()
       RETURNING id`
    );

    logger.info(`Marked ${expiredResult.rowCount} invitations as expired`);

    // Delete old expired/cancelled invitations (> 90 days)
    const deletedOldResult = await pool.query(
      `DELETE FROM pending_invitations
       WHERE status IN ('expired', 'cancelled', 'failed')
       AND created_at < NOW() - INTERVAL '90 days'
       RETURNING id`
    );

    logger.info(`Deleted ${deletedOldResult.rowCount} old expired/cancelled invitations`);

    // Delete old accepted invitations (> 30 days)
    const deletedAcceptedResult = await pool.query(
      `DELETE FROM pending_invitations
       WHERE status = 'accepted'
       AND accepted_at < NOW() - INTERVAL '30 days'
       RETURNING id`
    );

    logger.info(`Deleted ${deletedAcceptedResult.rowCount} old accepted invitations`);

    logger.info('Invitation cleanup job completed successfully');
  } catch (error) {
    logger.error({ error }, 'Invitation cleanup job failed');
    throw error;
  }
}
```

**Schedule with node-cron** (`packages/api-server/src/index.ts`):

```typescript
import cron from 'node-cron';
import { cleanupExpiredInvitations } from './jobs/cleanup-invitations.js';

// Schedule cleanup to run daily at 2 AM UTC
cron.schedule('0 2 * * *', async () => {
  await cleanupExpiredInvitations();
});
```

**Acceptance Criteria**:
- [ ] Cleanup runs daily at 2 AM UTC
- [ ] Expired invitations marked correctly
- [ ] Old invitations deleted
- [ ] Metrics logged

---

### 6.2 Add Monitoring Metrics

**Tasks**:
- [ ] Track invitation funnel metrics
- [ ] Track webhook failures
- [ ] Add alerts for high failure rates
- [ ] Log all invitation actions

**Implementation** (add to InvitationService):

```typescript
// Track metrics
private async trackMetrics(event: string, metadata: Record<string, any>) {
  logger.info({
    event,
    ...metadata,
    timestamp: new Date().toISOString()
  });

  // Future: Send to monitoring service (DataDog, CloudWatch, etc.)
}

// Call in methods
await this.trackMetrics('invitation.sent', {
  organizationId,
  inviteeCount: emails.length,
  successCount: result.successCount,
  failureCount: result.failureCount
});
```

---

## Phase 7: Documentation & Deployment (Week 4, Day 2-3)

### 7.1 Update Documentation

**Tasks**:
- [ ] Add API endpoint documentation
- [ ] Document webhook payloads for external service
- [ ] Create user guide for sending invitations
- [ ] Document troubleshooting steps
- [ ] Update README with setup instructions

---

### 7.2 Deploy to Staging

**Tasks**:
- [ ] Run database migration on staging
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Configure environment variables
- [ ] Test on staging environment
- [ ] Verify webhook integration

**Deployment Steps**:
```bash
# 1. Backup database
pg_dump onboarding > backup_$(date +%F).sql

# 2. Run migration
npm run migrate:up

# 3. Deploy backend
cd packages/api-server
npm run build
# Deploy to staging server

# 4. Deploy frontend
cd packages/client
npm run build
# Deploy to CDN/hosting

# 5. Verify
curl https://staging.api.example.com/health
```

---

### 7.3 Deploy to Production

**Tasks**:
- [ ] Schedule maintenance window (if needed)
- [ ] Run database migration on production
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Monitor logs for errors
- [ ] Test invitation flow in production
- [ ] Set up alerts

---

## Testing Checklist

### Manual Testing

- [ ] Owner can send single invitation
- [ ] Owner can send bulk invitations (50 emails)
- [ ] Invalid emails are rejected
- [ ] Duplicate emails are handled correctly
- [ ] Users with existing organizations are skipped (INV012)
- [ ] Webhook failures mark invitations as 'failed'
- [ ] Invitation list shows correct data
- [ ] Invitation can be cancelled
- [ ] Invitation link opens correctly
- [ ] Invalid/expired tokens show error
- [ ] Signup form validates correctly
- [ ] Progress indicator shows for 8 seconds
- [ ] Success redirects to login
- [ ] Invited user can login after account creation
- [ ] Invited user added to correct organization
- [ ] Invited user does NOT get personal organization
- [ ] Normal signups still get personal organization
- [ ] Multiple invitations handled correctly
- [ ] Token expiration works (test with past date)
- [ ] Rate limiting prevents abuse
- [ ] Permission checks work (non-owner cannot send)

### Automated Testing

- [ ] All backend unit tests pass
- [ ] All backend integration tests pass
- [ ] All frontend unit tests pass
- [ ] All E2E tests pass
- [ ] Database constraints tested
- [ ] Webhook integration tested (mock)
- [ ] Error handling tested

---

## Risk Mitigation

### High-Risk Areas

1. **Webhook Integration**
   - Risk: External service unavailable
   - Mitigation: Automatic retry with exponential backoff, webhook failure tracking
   - Fallback: Manual retry via "Resend" action

2. **JIT Provisioning**
   - Risk: Race conditions on first login
   - Mitigation: Database transactions, atomic status updates
   - Testing: Concurrent login tests

3. **Email Validation**
   - Risk: Invalid emails cause failures
   - Mitigation: Frontend + backend validation, clear error messages
   - Testing: Edge case email formats

4. **Token Security**
   - Risk: Token hijacking or replay attacks
   - Mitigation: Single-use tokens, short expiration, HTTPS only
   - Testing: Security audit of token handling

5. **Single-Org Constraint**
   - Risk: Users with existing orgs mistakenly invited
   - Mitigation: Check at invitation send time, clear error code (INV012)
   - Testing: Test with existing users

---

## Rollback Plan

If critical issues are discovered after deployment:

1. **Database Rollback**:
   ```bash
   # Restore from backup
   psql onboarding < backup_YYYY-MM-DD.sql
   ```

2. **Code Rollback**:
   - Revert to previous git commit
   - Redeploy backend and frontend

3. **Data Cleanup** (if needed):
   ```sql
   -- Remove orphaned invitations
   DELETE FROM pending_invitations WHERE status = 'failed';
   ```

---

## Success Criteria

### MVP Launch Criteria

- [ ] All automated tests pass
- [ ] Manual testing complete
- [ ] Documentation complete
- [ ] Staging deployment successful
- [ ] No critical bugs identified
- [ ] Performance meets requirements (< 1s for invitation send)
- [ ] Security review passed
- [ ] Webhook integration tested with external service

### Post-Launch Metrics (Week 1)

- [ ] > 95% invitation acceptance rate
- [ ] < 1% webhook failure rate
- [ ] < 5% token expiration rate
- [ ] Zero security incidents
- [ ] Average time to acceptance < 24 hours

---

## Future Enhancements (Post-MVP)

1. **Invitation Analytics Dashboard**
   - Visual funnel metrics
   - Time-series graphs
   - Export to CSV

2. **Role Selection**
   - Allow owner to specify role during invitation (not just default 'user')
   - Update UI to show role dropdown

3. **Bulk Invitation Upload**
   - CSV upload for large invitation batches
   - Email validation during upload

4. **Invitation Templates**
   - Customizable email templates
   - Organization branding

5. **Multi-Organization Support**
   - Remove single-org constraint
   - User consent flow for joining additional orgs

---

## Contacts & Resources

- **Design Document**: [user-invitation-system.md](./user-invitation-system.md)
- **Authentication Flow**: [authentication-flow.md](./authentication-flow.md)
- **Webhook Service**: `packages/api-server/src/services/WebhookService.ts`
- **Session Service**: `packages/api-server/src/services/sessionService.ts`

---

## Appendix: Error Codes Reference

| Code | Message | Action |
|------|---------|--------|
| INV001 | Invalid token | Token doesn't exist or malformed |
| INV002 | Invitation expired | Request new invitation |
| INV003 | Already accepted | User already accepted this invitation |
| INV004 | Invitation cancelled | Contact inviter |
| INV005 | Permission denied | User lacks permission to send invitations |
| INV006 | Email already member | Email is already in organization |
| INV007 | Invalid email format | Fix email format |
| INV008 | Rate limit exceeded | Wait before sending more |
| INV009 | Webhook failed | Retry or contact support |
| INV010 | User already exists | Email already registered |
| INV011 | Logged-in user mismatch | Logout and accept with correct account |
| INV012 | User has organization | User already belongs to an organization |

---

**Document Version**: 1.0
**Last Updated**: 2025-01-13
**Status**: Ready for Implementation
