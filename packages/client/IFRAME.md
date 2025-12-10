# RITA Go Iframe Integration (Public Guest Access)

Embeddable iframe version of RITA Go chat for integration into host pages on the same domain.

## Overview

The iframe version provides public access to RITA chat without requiring user authentication. All users interact through a shared `public-guest-user` account, with conversations isolated by `conversationId`. This is designed for same-domain deployment where the host page and RITA share the same origin.

## Routes

- `/iframe/chat?token=xxx` - New public conversation
- `/iframe/chat/:conversationId?token=xxx` - Existing conversation
- `/iframe/chat?token=xxx&hashkey=yyy` - With workflow execution via Valkey

## Key Features

1. **Public Access** - No Keycloak login required
2. **Guest User Model** - All users share `public-guest-user` account
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

### Public Guest User

All iframe conversations use a shared system user:

- **User ID**: `00000000-0000-0000-0000-000000000002`
- **Org ID**: `00000000-0000-0000-0000-000000000001`
- **Email**: `public-guest@internal.system`

This user is created via database migration and has restricted permissions.

### Session Flow

1. User loads `/iframe/chat?token=xxx`
2. Frontend calls `POST /api/iframe/validate-instantiation`
3. Backend validates token, creates session for `public-guest-user`
4. Backend creates conversation, returns `conversationId`
5. Session cookie set, chat renders
6. User can send messages immediately

### No Authentication Required

Unlike the main RITA app:
- No Keycloak redirect
- No login page
- No JWT tokens (for basic chat)
- Session created automatically

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

The host stores a **base64-encoded** JSON payload in Valkey with a unique hashkey.
No JWT is needed - the hashkey mechanism replaces authentication.

**JSON structure (before base64 encoding):**

```json
{
  "endpoint": "/api/Webhooks/postEvent/{tenantId}",
  "payload": {
    "workflowGuid": "uuid-of-system-workflow",
    "chatInput": "User message content",
    "chatSessionId": "workflow-tab-123",
    "tabInstanceId": "user-conn-456",
    "context": "Workflow"
  }
}
```

**To store in Valkey:**

```bash
# Create base64-encoded payload
echo '{"endpoint":"/api/Webhooks/postEvent/my-tenant","payload":{"chatInput":"Hello"}}' | base64

# Store in Redis/Valkey
redis-cli SET my-hashkey "eyJlbmRwb2ludCI6Ii9hcGkvV2ViaG9va3MvcG9zdEV2ZW50L215LXRlbmFudCIsInBheWxvYWQiOnsiY2hhdElucHV0IjoiSGVsbG8ifX0="
```

### Response Flow

1. RITA backend fetches payload from Valkey and decodes base64
2. Backend calls the endpoint specified in payload (no JWT auth)
3. Workflow executes, calls `/api/SignalR/pushMessage` → host receives via SignalR
4. Workflow also sends to RITA API → iframe receives via SSE
5. Both channels show the same response

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

Creates public session and conversation.

**Request:**
```json
{
  "token": "your-iframe-token",
  "hashkey": "optional-valkey-key",
  "existingConversationId": "optional-uuid"
}
```

**Response:**
```json
{
  "valid": true,
  "publicUserId": "00000000-0000-0000-0000-000000000002",
  "conversationId": "uuid-of-new-conversation"
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
4. **Database** - Migration 138 applied (public-guest-user)
5. **Valkey/Redis** - Required for workflow execution

### Environment Variables

Same as main app - see `.env.example` in project root

## Known Limitations

1. **Same Domain Only** - Cannot embed cross-domain
2. **Shared User** - All conversations from same "user"
3. **No Personalization** - No user-specific settings

## Future Enhancements

- [ ] Feature restrictions for public user
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
