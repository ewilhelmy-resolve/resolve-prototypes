# RITA Go Iframe Integration

Embeddable iframe version of RITA Go chat for integration into host pages on the same domain.

## Overview

The iframe version provides embedded chat within a host portal (e.g., Jarvis). Authentication uses shared Keycloak between Rita and the host. Message routing IDs (userId, tenantId, chatSessionId) come from the Valkey payload set by the host. Same-domain deployment where host and RITA share the same origin.

## Routes

- `/iframe/chat?token=xxx` - New public conversation
- `/iframe/chat/:conversationId?token=xxx` - Existing conversation
- `/iframe/chat?token=xxx&hashkey=yyy` - With workflow execution via Valkey

## Key Features

1. **Shared Keycloak Auth** - Same auth as host portal
2. **Host-Provided Routing IDs** - userId, tenantId, chatSessionId from Valkey
3. **Minimal UI** - No sidebar, no navigation
4. **Session Auto-Creation** - Session created automatically on page load
5. **Hashkey Workflow Support** - Execute workflows via Valkey payload
6. **Same-Domain Security** - Secure by virtue of shared origin

## Quick Start (Development)

### 1. Start Dev Servers

```bash
# Terminal 1: Start API server (required)
npm run dev:api

# Terminal 2: Start RITA client
npm run dev:client
```

### 2. Test Locally

Open directly: http://localhost:5173/iframe/chat?token=dev-iframe-token-2024

Or use the built-in demo: http://localhost:5173/embeddemo

## How It Works

### Session Flow

1. Host stores payload in Valkey with hashkey (includes userId, tenantId, chatSessionId)
2. User loads `/iframe/chat?token=xxx&hashkey=yyy`
3. Frontend calls `POST /api/iframe/validate-instantiation`
4. Backend validates token, creates session with Valkey config
5. Session cookie set, chat renders
6. User can send messages immediately

### Routing IDs from Valkey

Message routing IDs come from the Valkey payload (set by host):
- **userId** - User's Keycloak GUID (`sub` claim from JWT) - must match SSE connection
- **tenantId** - Organization ID user is active in → `rita_org_id`
- **chatSessionId** - Unique chat instance identifier → `rita_conversation_id`

**Critical for Message Delivery**:
- `userId` must be the user's actual Keycloak GUID
- SSE routes messages where `user_id` matches the authenticated user's ID
- Mismatched IDs = messages won't be delivered

**For External Systems**: Use `rita_user_id`, `rita_org_id`, `rita_conversation_id` from webhook payload when sending messages back via RabbitMQ.

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

### Architecture

```
Host (Jarvis)
    │
    ├─1─► Store base64-encoded payload in Valkey with hashkey
    │     { endpoint: "/api/Webhooks/postEvent/{tenantId}",
    │       payload: { workflowGuid, chatInput, context, ... } }
    │
    └─2─► Embed iframe: /iframe/chat?token=xxx&hashkey=yyy
                              │
                              ▼
                    RITA Go iframe (on load)
                              │
                        ─3──► POST /api/iframe/execute { hashkey }
                              │
                              ▼
                    RITA API backend
                              │
                        ─4──► Fetch payload from Valkey, decode base64
                              │
                        ─5──► POST to endpoint with payload (no JWT)
                              │
                              ▼
                    Actions API → Workflow executes
                              │
    ┌─────────────────────────┴─────────────────────────┐
    ▼                                                   ▼
SignalR → Host                               RabbitMQ → RITA API → SSE → iframe
```

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

### Response Flow (Round-Trip)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          OUTBOUND (Trigger)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Host stores payload in Valkey → Iframe loads with hashkey             │
│                                              │                          │
│                                              ▼                          │
│  User clicks "Execute" → POST /api/iframe/execute                      │
│                                              │                          │
│                                              ▼                          │
│  Backend fetches Valkey config → webhook to Actions API                │
│  (includes rita_user_id, rita_org_id, rita_conversation_id)            │
│                                              │                          │
│                                              ▼                          │
│  Actions API → Workflow Executes                                        │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                          INBOUND (Response)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Workflow sends message to RabbitMQ `chat.responses` queue             │
│  {                                                                      │
│    "user_id": "<rita_user_id from webhook>",                           │
│    "organization_id": "<rita_org_id from webhook>",                    │
│    "conversation_id": "<rita_conversation_id from webhook>",           │
│    "content": "Workflow response message"                              │
│  }                                                                      │
│                              │                                          │
│                              ▼                                          │
│  RITA MessageConsumer → routes by user_id + org_id → SSE               │
│                              │                                          │
│                              ▼                                          │
│  Iframe receives message via EventSource                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

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

### Built-in Demo Page

The `/embeddemo` route provides a built-in testing environment that deploys with the main app:

**URL**: `http://localhost:5173/embeddemo`

**Features**:
- No separate dev server needed
- Token and hashkey configuration
- Send Message via postMessage
- Event log with color-coded entries
- Workflow execution flow explanation

**Usage**:
```bash
# Just start the client (no separate demo server needed)
npm run dev:client
# Open http://localhost:5173/embeddemo
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
- `packages/client/src/pages/EmbedDemoPage.tsx` - Built-in demo page (/embeddemo)
- `packages/client/src/services/iframeApi.ts` - Frontend API client
- `packages/client/src/hooks/useIframeMessaging.ts` - PostMessage handler hook
