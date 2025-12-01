# RITA Iframe Demo

Demo application for testing the iframe-embeddable version of RITA Go chat.

## Overview

This package provides a simple HTML host page that embeds the RITA iframe chat for testing purposes. The iframe version strips away navigation, sidebar, and other UI chrome, leaving only the core chat interface.

## Features

- Configurable `intent-eid` parameter
- Quick test scenarios (ticket support, onboarding, sales)
- Visual URL display for debugging
- Responsive iframe container
- Clean, styled demo interface

## Usage

### Start the Demo Server

From the project root:

```bash
npm run dev:iframe-demo
```

Or from this package directory:

```bash
npm run dev
```

The demo will open at: http://localhost:5174

### Prerequisites

The RITA client must be running for the iframe to load:

```bash
# From project root
npm run dev:client

# Or from packages/client
npm run dev
```

The client runs on port 5173 by default.

## Testing

### Test Scenarios

The demo includes quick-test buttons for common scenarios:

1. **Ticket Support** - `intent-eid=ticket-urgent-001`
2. **User Onboarding** - `intent-eid=onboarding-new-user`
3. **Sales Inquiry** - `intent-eid=sales-inquiry-123`
4. **No Intent EID** - Tests iframe without parameters

### Custom Intent EID

Enter any custom value in the input field and click "Load Iframe" to test:

- Format: Any string (alphanumeric, hyphens, underscores recommended)
- Examples: `session-abc`, `customer-789`, `support-ticket-456`

## Architecture

### Iframe URL Structure

```
http://localhost:5173/iframe/chat?intent-eid=<value>
http://localhost:5173/iframe/chat/<conversationId>?intent-eid=<value>
```

### Intent EID Usage

The `intent-eid` parameter is:
- Parsed from URL query params
- Logged to console for debugging
- Available for conversation metadata (future implementation)
- Used for tracking and analytics

## Current Limitations

### Authentication

The iframe currently uses the same Keycloak authentication as the main app. This means:
- User must be logged in to main RITA app
- Session cookies are shared between iframe and parent
- **TODO**: Implement token-based auth for iframe embedding

### Conversation Metadata

Intent EID is currently logged but not stored:
- **TODO**: Update `useCreateConversation` to accept metadata
- **TODO**: Update backend API to store `intent_eid` in conversation
- **TODO**: Add analytics tracking for intent-based conversations

## Development

### Project Structure

```
packages/iframe-demo/
├── package.json       # Package config and scripts
├── vite.config.ts     # Vite dev server config
├── index.html         # Demo host page
└── README.md          # This file
```

### Configuration

To change the RITA base URL, edit `RITA_BASE_URL` in `index.html`:

```javascript
const RITA_BASE_URL = 'http://localhost:5173'; // or production URL
```

## Deployment

For production embedding:

1. Update `RITA_BASE_URL` to production domain
2. Configure CORS/CSP headers on RITA server
3. Implement token-based authentication
4. Add rate limiting for iframe endpoints
5. Set up analytics tracking

## Future Enhancements

- [ ] Token-based authentication
- [ ] PostMessage API for parent-iframe communication
- [ ] Theming support (light/dark mode)
- [ ] Custom branding per intent-eid
- [ ] Error boundary and fallback UI
- [ ] Responsive sizing controls
- [ ] Multiple iframe instances on same page
