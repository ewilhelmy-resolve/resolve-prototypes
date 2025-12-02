# Iframe Instantiation Architecture (Barista Pattern)

**Engineering Design Document**
**Version**: 2.0 (Revised)
**Status**: Approved
**Pattern**: Public User with Instantiation Validation

---

## Executive Summary

Iframe embedding using **Barista pattern**: single public user with instantiation token validation. Token proves legitimate origin (Jarvis), not user authentication.

**Phase 1 (Current)**: Authentication/validation infrastructure only.
**Phase 2 (Future)**: Workflow triggers to pre-populate conversation with context.

**Key Principles**:
- No user authentication required
- Token validates instantiation legitimacy
- Same-domain deployment (Jarvis + Rita)
- Parameters flow from HTML markup

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ Jarvis (Parent App)                                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ <div id="chat"                                  │ │
│ │   data-workflow-id="wf-123"                     │ │
│ │   data-intent-eid="activity-approval-001"       │ │
│ │   data-designer-mode="activity"                 │ │
│ │   data-context='{"step":3}'>                    │ │
│ └─────────────────────────────────────────────────┘ │
│          │                                           │
│          │ 1. JS reads data-* attributes            │
│          ▼                                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Jarvis Backend                                  │ │
│ │ POST /api/jarvis/rita-instantiation-token       │ │
│ └────────────┬────────────────────────────────────┘ │
└──────────────┼──────────────────────────────────────┘
               │ 2. Request token from Rita
               ▼
┌─────────────────────────────────────────────────────┐
│ Rita Backend                                        │
│ POST /api/iframe/generate-instantiation-token      │
│ Returns: JWT token (15min TTL)                      │
└────────────┬────────────────────────────────────────┘
             │ 3. Return token to Jarvis
             ▼
┌─────────────────────────────────────────────────────┐
│ Jarvis Frontend                                     │
│ Construct URL: /iframe/chat?token=...&params=...   │
│ Create <iframe src="...">                           │
└────────────┬────────────────────────────────────────┘
             │ 4. Load iframe
             ▼
┌─────────────────────────────────────────────────────┐
│ Rita Iframe (IframeChatPage)                        │
│ POST /api/iframe/validate-instantiation             │
└────────────┬────────────────────────────────────────┘
             │ 5. Validate token + trigger workflow
             ▼
┌─────────────────────────────────────────────────────┐
│ Rita Backend                                        │
│ - Validate JWT token                                │
│ - Create conversation (public-guest-user)           │
│ - Return conversationId                             │
│ - [Phase 2] Trigger workflow with parameters        │
│ - [Phase 2] Pre-populate conversation               │
└────────────┬────────────────────────────────────────┘
             │ 6. Display chat
             ▼
┌─────────────────────────────────────────────────────┐
│ Rita Iframe Chat                                    │
│ - User interacts (public access)                    │
│ - No authentication required                        │
│ - [Phase 2] Show workflow greeting                  │
└─────────────────────────────────────────────────────┘
```

---

## Token Model: Instantiation Validation (Not Authentication)

### What the Token IS

| Purpose | Description |
|---------|-------------|
| **Origin Proof** | Validates iframe loaded from Jarvis, not random website |
| **Instantiation Credential** | Proves legitimate setup request |
| **Workflow Context** | Carries workspace metadata for workflow trigger |
| **Short-lived** | 15 minutes max, single-use during setup |

### What the Token IS NOT

| Not For | Why |
|---------|-----|
| ❌ User Authentication | No user identity involved |
| ❌ Session Token | No session created, public access |
| ❌ Long-lived Authorization | Discarded after instantiation |
| ❌ Rate Limiting | Same-domain handles abuse prevention |

### Token Lifecycle

```
1. Generate (Jarvis Backend → Rita Backend)
   ├─ Jarvis requests token for workspace
   └─ Rita signs JWT with workspace + origin

2. Transport (Jarvis → Rita Iframe)
   ├─ Token passed via URL query param
   └─ iframe loads with token in URL

3. Validate (Rita Iframe → Rita Backend)
   ├─ Extract token from URL
   ├─ Validate signature + expiration + origin
   ├─ Create conversation for public user
   ├─ [Phase 2] Trigger workflow with parameters
   └─ Return conversation setup

4. Discard (Rita Iframe)
   ├─ Remove token from URL (security)
   └─ Token never used again
```

---

## Public User Model

### Single Shared User

```sql
-- One public user for ALL iframe instances
INSERT INTO users (id, email, first_name, last_name, role, created_at)
VALUES (
  'public-guest-user',
  'public@internal.system',
  'Guest',
  'User',
  'public',
  NOW()
);

-- Minimal permissions (chat only)
INSERT INTO user_permissions (user_id, permission)
VALUES
  ('public-guest-user', 'chat:create'),
  ('public-guest-user', 'chat:read'),
  ('public-guest-user', 'chat:send_message');
```

### No User Context

- **No authentication** - Public user always "logged in"
- **No session cookies** - Not needed for public access
- **No user profile** - Generic guest user
- **No PII** - Zero privacy concerns
- **No rate limiting per user** - Same-domain is primary protection

### Conversation Isolation

**Key Design**: Isolation by `conversationId`, not by `userId`

```typescript
interface Conversation {
  id: string;                       // Unique per iframe instance
  userId: "public-guest-user";      // ALWAYS same user
  workspaceId: string;              // Jarvis workspace
  intentEid: string;                // Unique per instantiation
  workflowParams: {
    workflowId?: string,
    designerMode?: string,
    activityType?: string,
    context: object
  };
  createdAt: Date;
  expiresAt: Date;                  // TTL for cleanup (7 days)
}

// Each iframe = new conversation
// No cross-conversation visibility
// No user history (each iframe is isolated)
```

---

## API Specification

### 1. Generate Instantiation Token

**Endpoint**: `POST /api/iframe/generate-instantiation-token`

**Caller**: Jarvis Backend (authenticated with service account JWT)

**Request**:
```json
{
  "parentOrigin": "https://jarvis.yourdomain.com",
  "workspaceId": "ws-456",
  "metadata": {
    "jarvisUserId": "user-123",       // For audit only
    "jarvisSessionId": "sess-789"
  }
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2025-11-25T12:15:00Z",
  "validOrigin": "https://jarvis.yourdomain.com"
}
```

**JWT Payload**:
```json
{
  "type": "iframe-instantiation",
  "parentOrigin": "https://jarvis.yourdomain.com",
  "workspaceId": "ws-456",
  "exp": 1732535700,
  "iat": 1732534800,
  "iss": "rita-iframe-issuer"
}
```

**Implementation**:
```typescript
// packages/api-server/src/routes/iframe.routes.ts

export async function generateInstantiationToken(req: Request, res: Response) {
  // 1. Validate service account JWT (Jarvis auth)
  const jarvisAuth = validateServiceAccountJWT(req.headers.authorization);

  // 2. Validate origin whitelist
  const allowedOrigins = process.env.ALLOWED_IFRAME_ORIGINS?.split(',') || [];
  if (!allowedOrigins.includes(req.body.parentOrigin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // 3. Generate JWT token
  const token = jwt.sign(
    {
      type: 'iframe-instantiation',
      parentOrigin: req.body.parentOrigin,
      workspaceId: req.body.workspaceId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '15m',
      issuer: 'rita-iframe-issuer'
    }
  );

  // 4. Audit log
  logger.info('Instantiation token generated', {
    workspaceId: req.body.workspaceId,
    parentOrigin: req.body.parentOrigin,
    requestedBy: req.body.metadata?.jarvisUserId
  });

  return res.json({
    token,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    validOrigin: req.body.parentOrigin
  });
}
```

---

### 2. Validate Instantiation & Setup

**Endpoint**: `POST /api/iframe/validate-instantiation`

**Caller**: Rita Iframe (IframeChatPage)

**Request**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "workflowParams": {
    "intentEid": "activity-approval-001",
    "workflowId": "wf-123",
    "designerMode": "activity",
    "activityType": "approval",
    "context": {
      "currentStep": "step-3",
      "availableActions": ["configure", "test"]
    }
  }
}
```

**Response (Phase 1)**:
```json
{
  "valid": true,
  "publicUserId": "public-guest-user",
  "workspaceId": "ws-456",
  "conversationId": "conv-abc123"
}
```

**Response (Phase 2 - with workflow)**:
```json
{
  "valid": true,
  "publicUserId": "public-guest-user",
  "workspaceId": "ws-456",
  "conversationId": "conv-abc123",
  "initialMessages": [
    {
      "id": "msg-001",
      "role": "assistant",
      "message": "Hi! I'm here to help you design your approval activity...",
      "timestamp": "2025-11-25T12:00:00Z"
    }
  ]
}
```

**Implementation (Phase 1)**:
```typescript
// packages/api-server/src/routes/iframe.routes.ts

export async function validateInstantiationAndSetup(req: Request, res: Response) {
  try {
    // 1. Validate JWT token
    const payload = jwt.verify(req.body.token, process.env.JWT_SECRET) as InstantiationToken;

    if (payload.type !== 'iframe-instantiation') {
      return res.status(400).json({ valid: false, error: 'Invalid token type' });
    }

    // 2. Check origin whitelist
    const allowedOrigins = process.env.ALLOWED_IFRAME_ORIGINS?.split(',') || [];
    if (!allowedOrigins.includes(payload.parentOrigin)) {
      return res.status(403).json({ valid: false, error: 'Origin not allowed' });
    }

    // 3. Create conversation for public user
    const conversation = await createConversation({
      userId: 'public-guest-user',
      workspaceId: payload.workspaceId,
      intentEid: req.body.workflowParams?.intentEid,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days TTL
    });

    // 4. Audit log
    logger.info('Iframe instantiated', {
      conversationId: conversation.id,
      workspaceId: payload.workspaceId,
      intentEid: req.body.workflowParams?.intentEid
    });

    return res.json({
      valid: true,
      publicUserId: 'public-guest-user',
      workspaceId: payload.workspaceId,
      conversationId: conversation.id
    });

  } catch (error) {
    logger.error('Token validation failed', error);
    return res.status(401).json({
      valid: false,
      error: 'Invalid or expired token'
    });
  }
}

// Phase 2: Add workflow trigger after validation
// const workflowResult = await triggerWorkflow({ ... });
// const initialMessages = await prepopulateConversation(workflowResult);
```

---

## Jarvis Integration (External Platform)

**Note**: Jarvis is a separate platform - not part of this codebase. This section documents how Jarvis will embed Rita using standard HTML `<iframe>` tags.

### HTML Iframe Embedding

Jarvis embeds Rita using direct `<iframe>` HTML tags with parameters in the URL:

```html
<!-- Jarvis page: Activity Designer -->
<!-- Token is generated server-side by Jarvis backend and inserted into the src URL -->
<iframe
  src="https://rita.yourdomain.com/iframe/chat?token=eyJhbGciOiJIUzI1NiIs...&intent-eid=activity-designer-001"
  style="width: 100%; height: 600px; border: none;"
  allow="microphone; clipboard-write; clipboard-read"
  data-intent-eid="activity-designer-001"
></iframe>
```

### URL Parameters

| Parameter | Required | Phase | Description |
|-----------|----------|-------|-------------|
| `token` | Yes | 1 | JWT instantiation token from Rita API |
| `intent-eid` | Yes | 1 | Unique identifier for this iframe instance |
| `workflow-id` | No | 2 | Workflow to trigger on load |
| `designer-mode` | No | 2 | Context (activity/workflow) |
| `context` | No | 2 | JSON-encoded workflow parameters |

### Jarvis Backend Responsibilities

Jarvis team implements their backend to call Rita's token generation API:

```typescript
// JARVIS BACKEND (their implementation, reference only)
// This is documentation for the Jarvis team

async function getRitaToken(workspaceId: string): Promise<{ token: string }> {
  const response = await fetch('https://rita.yourdomain.com/api/iframe/generate-instantiation-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${JARVIS_SERVICE_ACCOUNT_JWT}`,  // Provided by Rita team
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      parentOrigin: 'https://jarvis.yourdomain.com',
      workspaceId
    })
  });

  return response.json(); // { token, expiresAt }
}
```

### Jarvis HTML Template Example

```html
<!-- Jarvis server-side template (e.g., JSP, Razor, etc.) -->
<iframe
  src="https://rita.yourdomain.com/iframe/chat?token=<%= ritaToken %>&intent-eid=<%= intentEid %>"
  style="width: 100%; height: 600px; border: none;"
  allow="microphone; clipboard-write; clipboard-read"
></iframe>
```

---

## Frontend Implementation (Rita Iframe)

### IframeChatPage Component (Phase 1)

```typescript
// packages/client/src/pages/IframeChatPage.tsx

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ChatV1Content from "../components/chat/ChatV1Content";
import IframeChatLayout from "../components/layouts/IframeChatLayout";
import { Loader } from "../components/ai-elements/loader";
import { useRitaChat } from "../hooks/useRitaChat";

export default function IframeChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState(false);

  const ritaChatState = useRitaChat();

  // Extract parameters from URL (Phase 1: token + intent-eid only)
  const token = searchParams.get('token');
  const intentEid = searchParams.get('intent-eid');

  // Validate instantiation and setup on mount
  useEffect(() => {
    async function validateAndSetup() {
      if (!token) {
        setError('No instantiation token provided');
        return;
      }

      if (!intentEid) {
        setError('No intent-eid provided');
        return;
      }

      try {
        // Call validation endpoint
        const response = await fetch('/api/iframe/validate-instantiation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            workflowParams: { intentEid }
          })
        });

        const data = await response.json();

        if (data.valid) {
          // Instantiation successful
          setConversationId(data.conversationId);
          setIsSetup(true);

          // Security: Remove token from URL
          searchParams.delete('token');
          setSearchParams(searchParams, { replace: true });

          console.log('[Rita Iframe] Instantiated successfully', {
            conversationId: data.conversationId,
            workspaceId: data.workspaceId
          });
        } else {
          setError(data.error || 'Invalid instantiation token');
        }
      } catch (error) {
        console.error('[Rita Iframe] Instantiation error:', error);
        setError('Failed to initialize chat');
      }
    }

    validateAndSetup();
  }, [token, intentEid]); // Only run once on mount

  // Error state
  if (error) {
    return (
      <IframeChatLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md px-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Setup Failed
            </h2>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      </IframeChatLayout>
    );
  }

  // Loading state
  if (!isSetup || !conversationId) {
    return (
      <IframeChatLayout>
        <div className="flex items-center justify-center h-full">
          <Loader size={32} />
        </div>
      </IframeChatLayout>
    );
  }

  // Render chat (Phase 1: empty chat, Phase 2: pre-populated)
  return (
    <IframeChatLayout>
      <ChatV1Content
        {...ritaChatState}
        currentConversationId={conversationId}
        requireKnowledgeBase={false}
      />
    </IframeChatLayout>
  );
}
```

### Pre-populate Messages in Store (Phase 2)

```typescript
// packages/client/src/stores/conversationStore.ts
// Phase 2: Add action to pre-populate conversation with workflow messages

setInitialMessages: (conversationId: string, messages: Message[]) =>
  set((state) => ({
    currentConversationId: conversationId,
    messages,
    chatMessages: groupMessages(messages), // Group for UI display
  })),
```

---

## Security Implementation

### Token Validation Middleware

```typescript
// packages/api-server/src/middleware/validateInstantiationToken.ts

import jwt from 'jsonwebtoken';

interface InstantiationToken {
  type: string;
  parentOrigin: string;
  workspaceId: string;
  exp: number;
  iat: number;
  iss: string;
}

export function validateInstantiationToken(token: string): InstantiationToken {
  try {
    // 1. Verify JWT signature and expiration
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as InstantiationToken;

    // 2. Validate token type
    if (payload.type !== 'iframe-instantiation') {
      throw new Error('Invalid token type');
    }

    // 3. Validate issuer
    if (payload.iss !== 'rita-iframe-issuer') {
      throw new Error('Invalid token issuer');
    }

    // 4. Validate origin against whitelist
    const allowedOrigins = process.env.ALLOWED_IFRAME_ORIGINS?.split(',') || [];
    if (!allowedOrigins.includes(payload.parentOrigin)) {
      throw new Error('Origin not allowed');
    }

    return payload;

  } catch (error) {
    throw new Error(`Token validation failed: ${error.message}`);
  }
}
```

### Environment Configuration

```bash
# packages/api-server/.env

# JWT Secret (256-bit minimum)
JWT_SECRET=your-strong-secret-here-min-32-chars

# Allowed iframe parent origins (comma-separated)
ALLOWED_IFRAME_ORIGINS=https://jarvis.yourdomain.com,https://jarvis-staging.yourdomain.com

# Token expiration (seconds)
INSTANTIATION_TOKEN_TTL=900  # 15 minutes

# Conversation TTL (days)
PUBLIC_CONVERSATION_TTL_DAYS=7

# Service Account JWT (for Jarvis backend auth)
JARVIS_SERVICE_ACCOUNT_JWT=jarvis-service-account-token-here
```

### Security Checklist

- [x] **JWT Signing** - 256-bit secret, stored securely
- [x] **Token Expiry** - 15min max, enforced by jwt.verify
- [x] **Origin Whitelist** - Only Jarvis domains allowed
- [x] **HTTPS Only** - Enforced in production
- [x] **Same-Domain** - Primary security layer
- [x] **Token Cleanup** - Removed from URL after validation
- [x] **Public User Permissions** - Limited to chat operations
- [x] **Conversation TTL** - Auto-cleanup after 7 days
- [x] **Audit Logging** - All token operations logged
- [x] **Error Messages** - Generic (no info leak)
- [ ] **Rate Limiting** - Optional (same-domain provides protection)
- [ ] **Token Caching** - Optional (Jarvis side)

---

## Workflow Integration (Phase 2 - Future)

> **Note**: This section describes future functionality. Phase 1 focuses on authentication/validation infrastructure only.

### Workflow Trigger Interface

```typescript
// packages/api-server/src/services/workflow.service.ts

interface WorkflowTriggerRequest {
  workflowId: string;
  conversationId: string;
  context: {
    workspaceId: string;
    designerMode?: string;
    activityType?: string;
    [key: string]: any;
  };
}

interface WorkflowResult {
  success: boolean;
  messages: Array<{
    role: 'assistant' | 'system';
    content: string;
    metadata?: Record<string, any>;
  }>;
  error?: string;
}

export async function triggerWorkflow(
  request: WorkflowTriggerRequest
): Promise<WorkflowResult> {
  try {
    // 1. Look up workflow definition
    const workflow = await getWorkflowById(request.workflowId);
    if (!workflow) {
      return {
        success: false,
        messages: [],
        error: 'Workflow not found'
      };
    }

    // 2. Execute workflow with context
    const result = await executeWorkflow(workflow, request.context);

    // 3. Format output messages
    const messages = result.outputs.messages || [{
      role: 'assistant',
      content: 'Hello! How can I help you today?',
      metadata: { type: 'default-greeting' }
    }];

    return {
      success: true,
      messages
    };

  } catch (error) {
    logger.error('Workflow trigger failed', error);
    return {
      success: false,
      messages: [{
        role: 'assistant',
        content: 'Hi! I\'m ready to help. What would you like to work on?',
        metadata: { type: 'fallback-greeting' }
      }],
      error: error.message
    };
  }
}
```

### Example Workflow: Activity Designer

```typescript
// Example workflow definition (simplified)

const activityDesignerWorkflow = {
  id: 'activity-approval-workflow',
  name: 'Activity Designer - Approval',
  trigger: 'iframe-instantiation',

  steps: [
    {
      id: 'determine-greeting',
      type: 'conditional',
      condition: 'context.activityType',
      branches: {
        'approval': {
          systemMessage: `You are helping design an approval activity.
                         Current context: ${context.currentStep}`,
          greeting: `Hi! I'm here to help you design your approval activity.
                    I can help with:
                    - Setting approval criteria
                    - Configuring escalation rules
                    - Testing approval logic

                    What would you like to start with?`
        },
        'notification': {
          systemMessage: `You are helping design a notification activity.`,
          greeting: `Hi! Let's design your notification activity...`
        },
        'default': {
          greeting: `Hi! I'm here to help with your activity design.`
        }
      }
    }
  ],

  outputs: {
    messages: [
      {
        role: 'assistant',
        content: '${greeting}',
        metadata: {
          type: 'workflow-greeting',
          workflowId: 'activity-approval-workflow',
          activityType: '${context.activityType}'
        }
      }
    ]
  }
};
```

---

## Testing Strategy

### Unit Tests (Phase 1)

```typescript
describe('Instantiation Token', () => {
  it('should generate valid JWT token', async () => {
    const token = await generateInstantiationToken({
      parentOrigin: 'https://jarvis.test.com',
      workspaceId: 'ws-test'
    });

    expect(token).toMatch(/^eyJ/); // JWT format

    const decoded = jwt.decode(token);
    expect(decoded.type).toBe('iframe-instantiation');
    expect(decoded.workspaceId).toBe('ws-test');
  });

  it('should reject invalid origin', async () => {
    await expect(generateInstantiationToken({
      parentOrigin: 'https://evil.com',
      workspaceId: 'ws-test'
    })).rejects.toThrow('Origin not allowed');
  });

  it('should validate token correctly', () => {
    const token = jwt.sign(
      { type: 'iframe-instantiation', parentOrigin: 'https://jarvis.test.com' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const payload = validateInstantiationToken(token);
    expect(payload.type).toBe('iframe-instantiation');
  });

  it('should reject expired token', () => {
    const token = jwt.sign(
      { type: 'iframe-instantiation', parentOrigin: 'https://jarvis.test.com' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' } // Already expired
    );

    expect(() => validateInstantiationToken(token)).toThrow();
  });
});

// Phase 2 Tests
describe('Workflow Trigger', () => {
  it('should trigger workflow on instantiation', async () => {
    const result = await triggerWorkflow({
      workflowId: 'activity-approval-workflow',
      conversationId: 'conv-test',
      context: {
        workspaceId: 'ws-test',
        designerMode: 'activity',
        activityType: 'approval'
      }
    });

    expect(result.success).toBe(true);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toContain('approval activity');
  });
});
```

### Integration Tests (Phase 1)

```typescript
describe('End-to-End Instantiation', () => {
  it('should complete full instantiation flow', async () => {
    // 1. Generate token (Jarvis backend)
    const tokenResponse = await request(app)
      .post('/api/iframe/generate-instantiation-token')
      .set('Authorization', `Bearer ${serviceAccountJWT}`)
      .send({
        parentOrigin: 'https://jarvis.test.com',
        workspaceId: 'ws-test'
      })
      .expect(200);

    const { token } = tokenResponse.body;

    // 2. Validate token and setup (Rita iframe)
    const setupResponse = await request(app)
      .post('/api/iframe/validate-instantiation')
      .send({
        token,
        workflowParams: {
          intentEid: 'test-intent-001'
        }
      })
      .expect(200);

    expect(setupResponse.body.valid).toBe(true);
    expect(setupResponse.body.conversationId).toBeDefined();

    // 3. Send message as public user
    const conversationId = setupResponse.body.conversationId;
    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .send({ content: 'Hello!' })
      .expect(200);
  });
});

// Phase 2: Add workflow integration tests
// expect(setupResponse.body.initialMessages).toHaveLength(1);
```

### Manual Testing Checklist

**Phase 1 (Auth Infrastructure)**:
- [ ] Token generation from Jarvis backend
- [ ] Token validation in Rita backend
- [ ] Origin whitelist enforcement
- [ ] Token expiration (wait 15min)
- [ ] Invalid token handling
- [ ] Token removed from URL after validation
- [ ] Multiple iframe instances (different conversations)
- [ ] Public user message sending
- [ ] Conversation isolation (can't access others)
- [ ] Error states (no token, invalid token)

**Phase 2 (Workflow Integration)**:
- [ ] Workflow trigger on instantiation
- [ ] Pre-populated messages display
- [ ] Parameter flow: attrs → URL → workflow
- [ ] Error states (workflow failure)

---

## Monitoring & Observability

### Key Metrics

```typescript
// Prometheus/CloudWatch metrics

// Phase 1: Token Operations
instantiation_tokens_generated_total      // Counter
instantiation_tokens_validated_total      // Counter
instantiation_validation_errors_total     // Counter (by error type)
instantiation_token_age_seconds          // Histogram (validation time - issue time)

// Phase 1: Conversations
public_conversations_created_total        // Counter
public_conversations_active               // Gauge
public_conversations_expired_total        // Counter

// Phase 1: Messages
public_user_messages_sent_total          // Counter

// Phase 2: Workflow Operations
workflow_triggers_total                   // Counter (by workflowId)
workflow_execution_duration_seconds       // Histogram
workflow_failures_total                   // Counter (by workflowId)
```

### Alerts

```yaml
# Phase 1: High validation failure rate
- alert: HighInstantiationFailureRate
  expr: rate(instantiation_validation_errors_total[5m]) > 0.1
  for: 5m
  annotations:
    summary: "High iframe instantiation failure rate"
    description: "{{ $value }} validation errors/sec"

# Phase 1: Token age anomaly (possible clock skew)
- alert: TokenAgeAnomaly
  expr: histogram_quantile(0.95, instantiation_token_age_seconds) > 300
  annotations:
    summary: "Old instantiation tokens being validated"
    description: "Tokens older than 5min being validated"

# Phase 2: Workflow failures
- alert: WorkflowTriggerFailures
  expr: rate(workflow_failures_total[5m]) > 0.05
  for: 5m
  annotations:
    summary: "Workflow trigger failures detected"
    description: "Workflow {{ $labels.workflowId }} failing"
```

---

## Deployment Checklist

### Phase 1: Authentication Infrastructure

#### Backend (Rita)

- [ ] Add public-guest-user to database
- [ ] Implement token generation endpoint (`POST /api/iframe/generate-instantiation-token`)
- [ ] Implement token validation endpoint (`POST /api/iframe/validate-instantiation`)
- [ ] Configure environment variables (JWT_SECRET, ALLOWED_IFRAME_ORIGINS)
- [ ] Set up JWT secret management
- [ ] Configure origin whitelist
- [ ] Add audit logging
- [ ] Configure conversation TTL cleanup job

#### Backend (Jarvis)

- [ ] Create Rita token request endpoint
- [ ] Configure service account JWT (provided by Rita team)
- [ ] Add error handling for token failures

#### Frontend (Rita)

- [ ] Update IframeChatPage for token validation
- [ ] Add loading and error states
- [ ] Remove token from URL after validation
- [ ] Test iframe isolation

#### Frontend (Jarvis)

- [ ] Implement iframe URL construction with token
- [ ] Add error handling UI
- [ ] Test across different pages

#### Infrastructure

- [ ] Deploy to staging environment
- [ ] Configure HTTPS/TLS
- [ ] Test same-domain deployment
- [ ] Set up log aggregation
- [ ] Security audit
- [ ] Production deployment

### Phase 2: Workflow Integration (Future)

- [ ] Add workflow trigger integration
- [ ] Implement pre-populated message display
- [ ] Set up metrics collection for workflow triggers
- [ ] Test workflow-specific greetings
- [ ] Load test (concurrent iframes with workflows)

---

## Known Limitations & Future Enhancements

### Phase 1 Limitations

1. **Single Public User** - All conversations share one user, no personalization
2. **No Workflow Triggers** - Chat starts empty (Phase 2 adds pre-populated greetings)
3. **No Refresh** - Token single-use, must reload iframe for new instantiation
4. **No Communication** - Iframe doesn't talk back to parent
5. **TTL Cleanup** - Manual or scheduled job needed for old conversations

### Phase 2: Workflow Integration

- [ ] **Workflow Triggers** - Pre-populate conversation on instantiation
- [ ] **Context-aware Greetings** - Different greetings per workflow/activity type
- [ ] **Workflow Parameters** - Pass designer-mode, activity-type, context

### Future Enhancements (Post Phase 2)

- [ ] **Token Refresh** - Allow token refresh without full reload
- [ ] **PostMessage API** - Enable parent-iframe communication
- [ ] **Conversation Resume** - Load existing conversation by ID
- [ ] **Custom Branding** - Pass theme/colors via parameters
- [ ] **Usage Analytics** - Track interaction patterns per workspace
- [ ] **Rate Limiting** - Optional per-workspace limits
- [ ] **Multi-tenancy** - Workspace-specific public users (if needed)

---

## Appendix: Key Differences from OTC Design

| Aspect | OTC Design | Barista Pattern |
|--------|------------|-----------------|
| **Purpose** | User authentication | Origin validation |
| **User Model** | Individual users | Single public user |
| **Storage** | Redis (ephemeral) | Not needed |
| **Token Type** | One-time code | JWT (standard) |
| **Complexity** | High (user context) | Low (public access) |
| **Session** | Required | Not required |
| **Workflow** | After auth | On instantiation |
| **Privacy** | User data concerns | No PII |

---

**Document Version**: 2.0
**Last Updated**: 2025-11-25
**Next Review**: After staging deployment
**Maintainer**: Engineering Team
