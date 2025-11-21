# RITA Go Iframe Integration

Embeddable iframe version of RITA Go chat for integration into external applications.

## Overview

The iframe version provides a minimal chat interface without sidebar, navigation, or header chrome. Perfect for embedding RITA into existing workflows, helpdesk systems, or custom applications.

## Routes

- `/iframe/chat` - New conversation
- `/iframe/chat/:conversationId` - Existing conversation
- `/iframe/chat?intent-eid=<value>` - New conversation with intent tracking

## Key Differences from Main App

1. **No Sidebar** - Clean, minimal layout
2. **No Navigation** - Focus on chat only
3. **No Knowledge Base Requirement** - Works without uploaded files (configurable)
4. **Intent EID Support** - Tracks conversation context via URL parameter

## Quick Start (Development)

### 1. Start Dev Servers

```bash
# Terminal 1: Start RITA client
npm run dev:client

# Terminal 2: Start iframe demo
npm run dev:iframe-demo
```

### 2. Test Locally

1. Open main app and login: http://localhost:5173/chat
2. Open iframe demo: http://localhost:5174
3. Test different intent-eid values

## Integration Example

### Basic HTML Integration

```html
<iframe
  src="https://your-rita-domain.com/iframe/chat?intent-eid=ticket-123"
  style="width: 100%; height: 600px; border: none;"
  allow="microphone; clipboard-write; clipboard-read"
></iframe>
```

### Dynamic Integration with JavaScript

```javascript
// Create iframe dynamically
const iframe = document.createElement('iframe');
iframe.src = `https://your-rita-domain.com/iframe/chat?intent-eid=${intentId}`;
iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
iframe.allow = 'microphone; clipboard-write; clipboard-read';

// Replace existing element
document.getElementById('chat-container').appendChild(iframe);
```

## Intent EID Parameter

The `intent-eid` parameter allows tracking conversation context:

- **Ticket Support**: `intent-eid=ticket-urgent-001`
- **User Onboarding**: `intent-eid=onboarding-new-user`
- **Sales Inquiry**: `intent-eid=sales-inquiry-123`

### Current Behavior

- Parsed from URL query params
- Logged to console for debugging
- **TODO**: Store in conversation metadata (backend implementation needed)

## Authentication

### Current State (v1)

**Same-Domain Only**
- Uses Keycloak authentication
- Shares session cookies with main app
- Requires user to be logged in
- Works only when iframe and parent are same domain

### Limitations

- ❌ Cannot embed in external domains (cross-origin)
- ❌ No token-based auth
- ❌ Requires Keycloak redirect flow

### Planned (v2) - Token-Based Auth

**Goal**: Cross-domain iframe embedding with token authentication

**Implementation TODO**:
1. Backend: Generate OTC (One-Time Code) endpoint
2. Backend: Exchange OTC for session endpoint
3. Backend: Redis storage for OTCs (5min TTL)
4. Frontend: Handle `?otc=xxx` parameter in IframeChatPage
5. Frontend: Exchange OTC for session on mount
6. Parent: Generate OTC from authenticated session
7. Security: Origin validation, rate limiting, audit logging

**Example Flow**:
```javascript
// Parent page generates OTC
const response = await fetch('/api/auth/generate-rita-otc', {
  method: 'POST',
  credentials: 'include'
});
const { otc } = await response.json();

// Pass OTC to iframe
iframe.src = `https://rita.yourdomain.com/iframe/chat?intent-eid=xxx&otc=${otc}`;
```

## Security Considerations

### CSP (Content Security Policy)

Parent page must allow iframe embedding:

```
Content-Security-Policy: frame-src https://your-rita-domain.com
```

### CORS

RITA backend must whitelist parent domains for API calls (when token auth is implemented).

### Sandbox Restrictions

Consider iframe sandbox attributes:
```html
<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
```

## Testing

### Demo Application

The `packages/iframe-demo` provides a testing environment:

**Features**:
- Quick test scenarios (ticket, onboarding, sales)
- Configurable intent-eid input
- Visual URL display
- Side-by-side comparison option

**Usage**:
```bash
npm run dev:iframe-demo
# Opens http://localhost:5174
```

### Manual Testing Checklist

- [ ] New conversation starts correctly
- [ ] Intent-eid appears in logs
- [ ] Message sending works
- [ ] SSE real-time updates work
- [ ] Citations render properly
- [ ] Reasoning display works
- [ ] Responsive layout works
- [ ] Authentication flow works
- [ ] No console errors

## Production Deployment

### Prerequisites

1. **HTTPS Required** - Browsers block HTTP iframes in HTTPS pages
2. **Authentication** - Implement token-based auth for cross-domain
3. **CORS Configuration** - Whitelist allowed parent domains
4. **Rate Limiting** - Prevent abuse of iframe endpoints
5. **Monitoring** - Track iframe usage and errors

### Environment Variables

Same as main app - see `.env.example` in packages/client

### Build

```bash
npm run build
# Builds both api-server and client
```

## Known Issues

1. **Auth Required** - User must be logged in to main app first (same-domain only)
2. **No PostMessage** - No parent-iframe communication yet
3. **No Theming** - Cannot customize colors from parent
4. **Intent EID Not Stored** - Logged but not persisted to backend

## Future Enhancements

- [ ] Token-based authentication (OTC flow)
- [ ] PostMessage API for parent-iframe communication
- [ ] Custom theming via URL parameters
- [ ] Backend storage of intent-eid in conversation metadata
- [ ] Error boundary and fallback UI
- [ ] Multiple iframe instances on same page
- [ ] Conversation persistence across page reloads
- [ ] Analytics tracking for iframe usage

## Support

For issues or questions, see project documentation in `/CLAUDE.md`
