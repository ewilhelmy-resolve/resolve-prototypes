# RITA Go Iframe Integration

Embeddable iframe version of RITA Go chat for integration into host portals (e.g., Jarvis).

## Assumptions

1. **Shared Keycloak** - Rita and host portal use the same Keycloak instance
2. **Same Domain** - Host and Rita deployed on same origin (cookie sharing)
3. **Host Controls Routing IDs** - Host provides userId, tenantId, chatSessionId via Valkey
4. **User Already Authenticated** - User logged into host portal = logged into Rita
5. **Valkey Available** - Redis/Valkey accessible to both host and Rita backend

## Activity-Based Conversation Mapping

Conversations are linked by **activityId** from the Valkey `context` object.

**Lookup behavior:**
- `context.activityId` present → same activity always reuses same conversation
- No activityId → new conversation every time (no context to tie to)

**How it works:**
- Host stores `context: { activityId: 1234, activityName: "Display Value" }` in Valkey
- Multiple sessionKeys with same activityId share one conversation
- Activity → conversation links stored in `activity_contexts` table
- sessionKey is stored for tracking/audit only, not used for lookup

**Benefits:**
- User returns to same activity = continues same conversation
- Different browser tabs with same activity = same conversation
- New activity = new conversation (isolated context)
- No activityId = fresh start every time (stateless embed)

**Valkey payload with activityId:**
```json
{
  "tenantId": "...",
  "userGuid": "...",
  "context": {
    "designer": "activity",
    "activityId": 1234,
    "activityName": "Display Value"
  }
}
```

## ID Mapping

| Valkey Field | Webhook Field | SSE Routing | Source |
|--------------|---------------|-------------|--------|
| `userId` | `rita_user_id` | `conn.userId` | User's Keycloak GUID (`sub` claim) |
| `tenantId` | `rita_org_id` | `conn.organizationId` | User's active organization |
| `chatSessionId` | `rita_conversation_id` | conversation filter | Unique per chat instance |

**Critical**: For messages to reach the iframe, `userId` and `tenantId` must match the authenticated user's Keycloak GUID and active organization.

## Message Delivery Sequence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. SETUP                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User authenticates via Keycloak (shared with host)                        │
│                         │                                                   │
│                         ▼                                                   │
│  Host stores Valkey payload with:                                          │
│    - userId = user's Keycloak GUID                                         │
│    - tenantId = user's active org                                          │
│    - chatSessionId = unique instance ID                                    │
│                         │                                                   │
│                         ▼                                                   │
│  Host embeds iframe: /iframe/chat?token=xxx&hashkey=yyy                    │
│                         │                                                   │
│                         ▼                                                   │
│  Iframe establishes SSE connection (GET /api/sse/events)                   │
│    → Connection registered with userId + organizationId from session       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  2. OUTBOUND (Trigger Workflow)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User action → POST /api/iframe/execute { hashkey }                        │
│                         │                                                   │
│                         ▼                                                   │
│  Rita fetches Valkey config, sends webhook to Actions API:                 │
│    {                                                                        │
│      rita_user_id: config.userId,        // Keycloak GUID                  │
│      rita_org_id: config.tenantId,       // Organization ID                │
│      rita_conversation_id: config.chatSessionId,                           │
│      ... workflow data                                                      │
│    }                                                                        │
│                         │                                                   │
│                         ▼                                                   │
│  Actions API executes workflow                                              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  3. INBOUND (Message Delivery)                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Workflow publishes to RabbitMQ `chat.responses`:                          │
│    {                                                                        │
│      user_id: "<rita_user_id>",          // MUST match SSE conn.userId     │
│      organization_id: "<rita_org_id>",   // MUST match SSE conn.orgId      │
│      conversation_id: "<rita_conversation_id>",                            │
│      content: "Response message"                                           │
│    }                                                                        │
│                         │                                                   │
│                         ▼                                                   │
│  Rita MessageConsumer receives message                                      │
│                         │                                                   │
│                         ▼                                                   │
│  SSEService.sendToUser(user_id, organization_id, event)                    │
│    → Filters connections: conn.userId === user_id                          │
│                        && conn.organizationId === organization_id          │
│                         │                                                   │
│                         ▼                                                   │
│  Message delivered to iframe via SSE EventSource                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Routes

- `/iframe/chat?token=xxx&hashkey=yyy` - Chat with workflow execution
- `/iframe/chat/:conversationId?token=xxx` - Existing conversation

## Quick Start (Development)

```bash
# Install dependencies
pnpm install

# Terminal 1: API server (localhost:3000)
pnpm dev:api

# Terminal 2: Jarvis client (localhost:5173)
pnpm dev:client

# Terminal 3: Test host page (localhost:5174)
pnpm dev:iframe-app
```

**Open http://localhost:5174** - Test host page with Platform Simulator for testing UI schemas.

Direct iframe URL: http://localhost:5173/iframe/chat?token=dev-iframe-token-2024

## Dynamic UI Schema Rendering

Platform can send JSON UI schemas via SSE that render as interactive shadcn/ui components in the chat.

### Flow

```
Platform → RabbitMQ → API Server → SSE → Jarvis → SchemaRenderer → User
                                                         ↓
                                              User clicks button
                                                         ↓
                                              POST /action → Platform
```

### Supported Components

| Type | Description |
|------|-------------|
| `text` | Text with variants (heading, muted, code, diff-*) |
| `button` | Action triggers |
| `input` | Form inputs (text, email, textarea) |
| `select` | Dropdown selection |
| `stat` | Metric cards |
| `card` | Container with title |
| `row`/`column` | Layout |
| `form` | Collects inputs, submits action |
| `table` | Data tables |
| `diagram` | Mermaid diagrams with fullscreen |

### Example Schema

```json
{
  "version": "1",
  "components": [
    { "type": "text", "content": "Approve request?", "variant": "heading" },
    { "type": "button", "label": "Approve", "action": "approve", "variant": "default" },
    { "type": "button", "label": "Reject", "action": "reject", "variant": "destructive" }
  ]
}
```

### Testing with Platform Simulator

The iframe-app host (localhost:5174) includes a **Platform Simulator** panel:
- Send mock UI schemas without backend
- Test all component types
- View action payloads in debug console

See `docs/features/ui-schema/specification.md` for full schema spec.

## Integration Example

### Basic HTML Integration

```html
<iframe
  src="https://your-domain.com/iframe/chat?token=your-token"
  style="width: 100%; height: 600px; border: none;"
></iframe>
```

### Dynamic Integration with JavaScript

```javascript
const iframe = document.createElement('iframe');
iframe.src = `https://your-domain.com/iframe/chat?token=${token}&hashkey=${hashkey}`;
iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
document.getElementById('chat-container').appendChild(iframe);
```

## Workflow Execution via Hashkey

For workflow execution, the host stores a payload in Valkey and passes the hashkey in the URL.
RITA backend fetches the payload and calls the Actions API postEvent webhook.

### Valkey Payload Format

The host stores a JSON payload as a Redis hash in Valkey with a unique hashkey.
The hashkey provides routing IDs and webhook credentials. Auth is still via shared Keycloak.

**Key format**: `rita:session:{guid}` (hash type, field: `data`)

**Required fields:**

```json
{
  "userId": "f1918ce5-...",           // User's Keycloak GUID (JWT sub claim)
  "tenantId": "41d95fc2-...",         // Organization ID (must match user's active org)
  "chatSessionId": "4f1f3f18-...",    // Unique per chat instance
  "tabInstanceId": "34b1b50b-...",
  "tenantName": "TenantName",
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "clientId": "webhook-client-id",
  "clientKey": "webhook-client-secret",
  "tokenExpiry": 1765986500,
  "actionsApiBaseUrl": "https://actions-api.example.com",
  "context": { "workflowGuid": "wf-123" }
}
```

**ID Requirements for Message Delivery:**
- `userId` = User's Keycloak GUID (same as `sub` in their JWT)
- `tenantId` = Organization the user is active in (matches `activeOrganizationId` in Rita session)
- `chatSessionId` = Unique identifier for this chat instance

**To store in Valkey:**

```bash
# Store as Redis hash
redis-cli HSET rita:session:my-guid data '{"tenantId":"tenant-123","userId":"user-456",...}'
```

### Webhook Payload to Actions API

When `/api/iframe/execute` is called, RITA sends a webhook to Actions API. All IDs come from the Valkey config:

```json
{
  "source": "rita-chat-iframe",
  "action": "workflow_trigger",
  "tenant_id": "<tenantId from Valkey>",
  "tenant_name": "<tenantName from Valkey>",
  "tab_instance_id": "<tabInstanceId from Valkey>",
  "chat_session_id": "<chatSessionId from Valkey>",
  "access_token": "[JWT from Valkey]",
  "refresh_token": "[JWT from Valkey]",
  "token_expiry": 1234567890,
  "context": { "workflow-specific-data": "..." },
  "timestamp": "2024-01-01T00:00:00.000Z",

  "rita_user_id": "<userId from Valkey>",
  "rita_org_id": "<tenantId from Valkey>",
  "rita_conversation_id": "<chatSessionId from Valkey>"
}
```

**Important**: The `rita_*` fields are required for routing messages back to the iframe. These values come directly from the Valkey payload set by the host.

### External System: Sending Messages to Iframe

External systems (workflow designers) must send messages to the `chat.responses` RabbitMQ queue using the Rita IDs from the webhook payload:

```json
{
  "user_id": "<rita_user_id from webhook>",
  "organization_id": "<rita_org_id from webhook>",
  "conversation_id": "<rita_conversation_id from webhook>",
  "content": "Your workflow response message",
  "message_id": "uuid-for-deduplication"
}
```

**Critical**: Use the exact `rita_user_id`, `rita_org_id`, and `rita_conversation_id` values from the webhook payload. SSE routes messages by these IDs - incorrect IDs will result in messages not being delivered.

### Security

- **No JWT required** - hashkey mechanism replaces need for auth tokens
- Hashkey is a one-time key (host generates unique key per session)
- Host controls what endpoint and payload are stored in Valkey
- RITA backend only fetches and forwards - no sensitive data in URL
- Origin validation for postMessage commands
- Iframe token required for session initialization

## PostMessage API

Enable host pages to communicate with the RITA iframe programmatically.

### Message Protocol

#### Host → Iframe

| Type | Payload | Description |
|------|---------|-------------|
| `SEND_MESSAGE` | `{ content, chatSessionId?, tabInstanceId? }` | Send message to chat |
| `GET_STATUS` | - | Request current status |
| `CLEAR_CHAT` | - | Clear chat (future) |

Note: Workflow execution is handled via hashkey URL parameter, not postMessage.

#### Iframe → Host

| Type | Payload | Description |
|------|---------|-------------|
| `READY` | - | Iframe initialized, ready for commands |
| `ACK` | `{ requestId, success, error? }` | Command acknowledged |
| `STATUS` | `{ requestId, data }` | Status response |

### Example Usage

```javascript
const iframe = document.getElementById('rita-iframe');

// Listen for iframe ready
window.addEventListener('message', (event) => {
  if (event.data.type === 'READY') {
    console.log('RITA iframe ready');
  }
  if (event.data.type === 'ACK') {
    console.log('Message acknowledged:', event.data);
  }
});

// Send message from host
function sendToRita(message, chatSessionId, tabInstanceId) {
  iframe.contentWindow.postMessage({
    type: 'SEND_MESSAGE',
    payload: {
      content: message,
      chatSessionId,   // Workflow tab ID (optional)
      tabInstanceId,   // User connection ID (optional)
    },
    requestId: crypto.randomUUID()
  }, '*');
}
```

### Metadata Tracking

Messages sent via postMessage can include metadata for workflow tracking:

- **chatSessionId**: Jarvis workflow tab identifier
- **tabInstanceId**: User connection identifier

This metadata is stored with the message for audit and workflow correlation.

## API Endpoints

### POST /api/iframe/validate-instantiation

Creates session with Valkey config and conversation.

**Request:**
```json
{
  "token": "your-iframe-token",
  "hashkey": "valkey-key-with-config",
  "existingConversationId": "optional-uuid"
}
```

**Response:**
```json
{
  "valid": true,
  "conversationId": "uuid-of-conversation",
  "webhookConfigLoaded": true,
  "webhookTenantId": "tenant-id-from-valkey"
}
```

### POST /api/iframe/execute

Execute workflow from Valkey hashkey.

**Request:**
```json
{
  "hashkey": "valkey-payload-key"
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "uuid-from-actions-api"
}
```

## Environment Variables

### Backend (api-server)

```env
VALKEY_URL=redis://localhost:6379
ACTIONS_API_URL=https://actions-api-staging.resolve.io
```

### Frontend (client)

```env
VITE_API_URL=http://localhost:3000
```

## Testing

### Iframe Demo Host

The `packages/iframe-app` provides a host page demo for testing iframe integration:

**URL**: `http://localhost:5174`

**Features**:
- Simulates Resolve Actions host page
- Activity-based conversation testing
- Modal approaches demo (self-inject, host modal, popup)
- Mock response triggers
- Event log with color-coded entries

**Usage**:
```bash
# Terminal 1: Start API server
npm run dev:api

# Terminal 2: Start client
npm run dev:client

# Terminal 3: Start iframe demo host
npm run dev:iframe-app
# Open http://localhost:5174
```

### Manual Testing Checklist

- [ ] Page loads without login redirect
- [ ] New conversation created automatically
- [ ] Message sending works
- [ ] SSE real-time updates work
- [ ] Hashkey workflow execution works (requires Valkey payload)
- [ ] No console errors

## Production Deployment

### Prerequisites

1. **Same Domain** - Host and RITA on same origin
2. **HTTPS** - Required for production
3. **API Server** - Must be running with iframe routes
4. **Valkey/Redis** - Required for storing session payloads

### Environment Variables

Same as main app - see `.env.example` in project root

## Known Limitations

1. **Same Domain Only** - Cannot embed cross-domain
2. **Host Provides Routing IDs** - Valkey payload must include userId, tenantId, chatSessionId
3. **Shared Keycloak** - Rita iframe uses same Keycloak as host portal

## Future Enhancements

- [x] PostMessage API for parent-iframe communication
- [x] Workflow execution via Valkey hashkey
- [ ] Custom theming via URL parameters
- [ ] Conversation TTL auto-cleanup
- [ ] Rate limiting per hashkey
- [ ] Workflow state feedback to host (ritasendcompletemessage activity)

## Related Files

- `packages/api-server/src/services/IframeService.ts` - Session/token service
- `packages/api-server/src/services/WorkflowExecutionService.ts` - Valkey + postEvent
- `packages/api-server/src/routes/iframe.routes.ts` - API endpoints
- `packages/api-server/src/config/valkey.ts` - Valkey client
- `packages/client/src/pages/IframeChatPage.tsx` - Iframe chat page
- `packages/client/src/services/iframeApi.ts` - Frontend API client
- `packages/client/src/hooks/useIframeMessaging.ts` - PostMessage handler hook
- `packages/iframe-app/index.html` - Iframe demo host page
