# API Server Documentation

This directory contains documentation specific to the Rita API Server (`packages/api-server/`).

## Structure

```
docs/
├── active/      # In-progress features and bugs
├── v1/          # Production-ready documentation
└── archived/    # Deprecated documentation
```

## Overview

The Rita API Server is a TypeScript/Node.js backend service that provides:
- RESTful API endpoints for Rita Go frontend
- Server-Sent Events (SSE) for real-time updates
- PostgreSQL database integration
- RabbitMQ message queue integration
- Keycloak authentication and authorization
- Webhook notifications to external services (Barista)

## Quick Links

### Core Documentation
- [Main Project Docs](../../../docs/) - Root-level documentation
- [Architecture](../../../docs/v1/architecture/) - System design and architecture
- [Setup Guides](../../../docs/v1/setup/) - Environment configuration

### API Server Specific
- `src/routes/` - API endpoint definitions
- `src/services/` - Business logic and external integrations
- `src/types/` - TypeScript type definitions
- `src/middleware/` - Express middleware (auth, error handling)

## Development

### Running Locally
```bash
cd packages/api-server
npm install
npm run dev
```

### Environment Variables
See `.env.example` for required configuration:
- `DATABASE_URL` - PostgreSQL connection string
- `KEYCLOAK_*` - Authentication configuration
- `RABBITMQ_URL` - Message queue connection
- `AUTOMATION_WEBHOOK_URL` - External webhook endpoint
- `AUTOMATION_AUTH` - Webhook authentication header

### Testing
```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
```

## Key Concepts

### Server-Sent Events (SSE)
The API server uses SSE to push real-time updates to connected clients:
- Message creation events
- Document processing events
- Conversation updates
- System notifications

### Webhook System
The server sends webhook notifications to external services (Barista) for:
- Document upload events (`document_uploaded`)
- Document deletion events (`document_deleted`)
- Message creation events (`message_created`)

See `src/types/webhook.ts` and `src/services/WebhookService.ts` for implementation details.

### Content-Addressable Storage
Document storage uses a blobbifier pattern:
- Blobs stored once with SHA-256 hash as identifier
- Multiple metadata entries can reference same blob
- Reference counting for safe cleanup
- Automatic deduplication

## Contributing

When adding new features:
1. Create documentation in `docs/active/`
2. Update API endpoint documentation
3. Add TypeScript types in `src/types/`
4. Include unit tests
5. Update this README if needed

For documentation standards, see [Main Docs README](../../../docs/README.md).
