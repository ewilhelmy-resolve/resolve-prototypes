# RITA Go Iframe Integration (Public Guest Access)

Embeddable iframe version of RITA Go chat for integration into host pages on the same domain.

## Overview

The iframe version provides public access to RITA chat without requiring user authentication. All users interact through a shared `public-guest-user` account, with conversations isolated by `conversationId`. This is designed for same-domain deployment where the host page and RITA share the same origin.

## Routes

- `/iframe/chat` - New public conversation
- `/iframe/chat/:conversationId` - Existing conversation
- `/iframe/chat?intent-eid=<value>` - New conversation with intent tracking

## Key Features

1. **Public Access** - No Keycloak login required
2. **Guest User Model** - All users share `public-guest-user` account
3. **Minimal UI** - No sidebar, no navigation
4. **Session Auto-Creation** - Session created automatically on page load
5. **Intent EID Support** - Track conversation context via URL parameter
6. **Same-Domain Security** - Secure by virtue of shared origin

## Quick Start (Development)

### 1. Start Dev Servers

```bash
# Terminal 1: Start API server (required)
npm run dev:api

# Terminal 2: Start RITA client
npm run dev:client

# Terminal 3: Start iframe app host
npm run dev:iframe-app
```

### 2. Test Locally

Open directly: http://localhost:5173/iframe/chat

Or use the demo app: http://localhost:5174

## How It Works

### Public Guest User

All iframe conversations use a shared system user:

- **User ID**: `00000000-0000-0000-0000-000000000002`
- **Org ID**: `00000000-0000-0000-0000-000000000001`
- **Email**: `public-guest@internal.system`

This user is created via database migration and has restricted permissions.

### Session Flow

1. User loads `/iframe/chat`
2. Frontend calls `POST /api/iframe/validate-instantiation`
3. Backend creates session for `public-guest-user`
4. Backend creates conversation, returns `conversationId`
5. Session cookie set, chat renders
6. User can send messages immediately

### No Authentication Required

Unlike the main RITA app:
- No Keycloak redirect
- No login page
- No JWT tokens
- Session created automatically

## Integration Example

### Basic HTML Integration

```html
<iframe
  src="https://your-domain.com/iframe/chat?intent-eid=ticket-123"
  style="width: 100%; height: 600px; border: none;"
></iframe>
```

### Dynamic Integration with JavaScript

```javascript
const iframe = document.createElement('iframe');
iframe.src = `https://your-domain.com/iframe/chat?intent-eid=${intentId}`;
iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
document.getElementById('chat-container').appendChild(iframe);
```

## Intent EID Parameter

The `intent-eid` parameter allows tracking conversation context:

- **Ticket Support**: `intent-eid=ticket-urgent-001`
- **User Onboarding**: `intent-eid=onboarding-new-user`
- **Workflow Designer**: `intent-eid=activity-designer-001`

### Behavior

- Parsed from URL query params
- Logged for audit purposes
- Available for future analytics integration

## Security Model

### Same-Domain Deployment

- Host page and RITA must share the same origin
- Session cookies work automatically
- No cross-domain concerns

### Public User Restrictions (Planned)

Public users should have limited access:
- No file uploads
- No data source connections
- Limited conversation history
- No organization settings access

Use `isPublicUser()` helper to check:

```typescript
import { isPublicUser } from '@/services/IframeService';

if (isPublicUser(userId)) {
  // Apply restrictions
}
```

## API Endpoints

### POST /api/iframe/validate-instantiation

Creates public session and conversation.

**Request:**
```json
{
  "token": "your-iframe-token",
  "intentEid": "optional-tracking-id"
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

## PostMessage API

Enable host pages to communicate with the RITA iframe programmatically.

### Message Protocol

#### Host → Iframe

| Type | Payload | Description |
|------|---------|-------------|
| `SEND_MESSAGE` | `{ content, chatSessionId?, tabInstanceId? }` | Send message to RITA API only |
| `EXECUTE_WORKFLOW` | `{ jwt, workflowGuid, chatInput, chatSessionId, tabInstanceId, context }` | Execute via Actions API |
| `GET_STATUS` | - | Request current status |
| `CLEAR_CHAT` | - | Clear chat (future) |

#### Iframe → Host

| Type | Payload | Description |
|------|---------|-------------|
| `READY` | - | Iframe initialized, ready for commands |
| `ACK` | `{ requestId, success, eventId?, error? }` | Command acknowledged (eventId for workflows) |
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

## Actions API Integration (Workflow Execution)

For workflow execution, RITA Go iframe calls the Actions API directly with JWT auth passed from the host.

### Architecture

```
Host (Jarvis) → postMessage(EXECUTE_WORKFLOW) → RITA Go iframe
                                                      ↓
                                            POST /api/Workflows/executeSystemWorkflow
                                                      ↓
                                              Actions API (staging)
                                                      ↓
                         ┌────────────────────────────┴────────────────────────────┐
                         ↓                                                         ↓
              SignalR pushMessage → Host                               RITA API → SSE → iframe
```

### Execute Workflow Example

```javascript
// Host sends EXECUTE_WORKFLOW to iframe
iframe.contentWindow.postMessage({
  type: 'EXECUTE_WORKFLOW',
  payload: {
    jwt: 'Bearer eyJ...',              // JWT token for Actions API
    workflowGuid: 'uuid-of-workflow',  // System workflow GUID
    chatInput: 'User message',         // What the user typed
    chatSessionId: 'workflow-tab-123', // Jarvis workflow tab ID
    tabInstanceId: 'user-conn-456',    // Jarvis user connection ID
    context: 'Workflow',               // 'Workflow' or 'ActivityDesigner'
  },
  requestId: crypto.randomUUID()
}, '*');

// Listen for ACK with eventId
window.addEventListener('message', (event) => {
  if (event.data.type === 'ACK' && event.data.eventId) {
    console.log('Workflow started:', event.data.eventId);
  }
});
```

### Response Flow

1. User message displayed immediately in iframe (optimistic)
2. Actions API called with JWT → returns EventId
3. Workflow executes, calls `/api/SignalR/pushMessage` → host receives via SignalR
4. Workflow also sends to RITA API → iframe receives via SSE
5. Both channels show the same response

### Environment Variables

```env
VITE_ACTIONS_API_URL=https://actions-api-staging.resolve.io
```

### Security

- JWT passed from host via postMessage (not stored in iframe)
- Origin validation required in production
- iframe token still required for session initialization
- JWT used only for Actions API calls

## Testing

### Built-in Demo Page

The `/embeddemo` route provides a built-in testing environment that deploys with the main app:

**URL**: `http://localhost:5173/embeddemo`

**Features**:
- No separate dev server needed
- JWT input for workflow execution
- Workflow GUID and context selection
- Event log with color-coded entries
- Send Message and Execute Workflow controls

**Usage**:
```bash
# Just start the client (no separate demo server needed)
npm run dev:client
# Open http://localhost:5173/embeddemo
```

### Legacy Demo Application (deprecated)

The `packages/iframe-app` provides a standalone testing environment:

```bash
npm run dev:iframe-app
# Opens http://localhost:5174
```

Note: Prefer using `/embeddemo` as it deploys with the main app.

### Manual Testing Checklist

- [ ] Page loads without login redirect
- [ ] New conversation created automatically
- [ ] Intent-eid appears in server logs
- [ ] Message sending works
- [ ] SSE real-time updates work
- [ ] No console errors

## Production Deployment

### Prerequisites

1. **Same Domain** - Host and RITA on same origin
2. **HTTPS** - Required for production
3. **API Server** - Must be running with iframe routes
4. **Database** - Migration 138 applied (public-guest-user)

### Environment Variables

Same as main app - see `.env.example` in packages/client

## Known Limitations

1. **Same Domain Only** - Cannot embed cross-domain
2. **Shared User** - All conversations from same "user"
3. **No Personalization** - No user-specific settings

## Future Enhancements

- [ ] Feature restrictions for public user
- [x] PostMessage API for parent-iframe communication
- [ ] Custom theming via URL parameters
- [ ] Analytics tracking for intent-eid
- [ ] Conversation TTL auto-cleanup
- [ ] Rate limiting per intent-eid
- [ ] Workflow state feedback to host (ritasendcompletemessage activity)

## Related Files

- `packages/api-server/src/services/IframeService.ts` - Backend service
- `packages/api-server/src/routes/iframe.routes.ts` - API endpoint
- `packages/client/src/pages/IframeChatPage.tsx` - Iframe chat page
- `packages/client/src/pages/EmbedDemoPage.tsx` - Built-in demo page (/embeddemo)
- `packages/client/src/services/iframeApi.ts` - Frontend API client (RITA API)
- `packages/client/src/services/actionsApi.ts` - Actions API client (workflow execution)
- `packages/client/src/hooks/useIframeMessaging.ts` - PostMessage handler hook
- `packages/iframe-app/index.html` - Legacy demo (deprecated)
