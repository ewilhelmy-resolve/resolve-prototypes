# Mock Service Documentation

This directory contains documentation specific to the Rita Mock Service (`packages/mock-service/`).

## Structure

Package-specific docs live here. For project-wide documentation, see [`docs/`](../../../docs/):
- `architecture/` - Infrastructure & integrations
- `core/` - System fundamentals
- `features/` - Feature implementations
- `setup/` - Environment & config
- `archived/` - Shipped implementation plans

## Overview

The Mock Service is a lightweight HTTP server used for development and testing. It simulates external services that Rita integrates with, particularly:
- **Barista** - RAG vector search service
- **External Webhook Endpoints** - Event notification consumers

## Purpose

The Mock Service allows developers to:
1. **Test Webhook Integration** without requiring actual external services
2. **Simulate Various Response Scenarios** (success, failure, timeout)
3. **Validate Payload Structures** before production deployment
4. **Debug Integration Issues** locally

## Quick Links

### Core Documentation
- [Main Project Docs](../../../docs/) - Root-level documentation
- [Mock Service Validation](../../../docs/archived/mock_service_validation.md) - Testing guide (archived)

## Development

### Running Locally
```bash
cd packages/mock-service
npm install
npm run dev
```

### Environment Variables
See `.env.example` for configuration:
- `PORT` - Service port (default: 3002)
- `LOG_LEVEL` - Logging verbosity

### Running with Docker
```bash
# From project root
docker compose up mock-service
```

## Endpoints

### POST /webhook
Receives webhook notifications from Rita API Server.

**Request Body:**
```json
{
  "source": "rita-documents",
  "action": "document_deleted",
  "tenant_id": "org-123",
  "blob_id": "abc123...",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook received",
  "payload": { ... }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "mock-service",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Simulating Scenarios

### Success Response
Normal operation - returns 200 OK:
```bash
curl -X POST http://localhost:3002/webhook \
  -H "Content-Type: application/json" \
  -d '{"source": "rita-documents", "action": "test"}'
```

### Simulating Failure
Stop the service to test failure handling:
```bash
# Stop mock-service
docker compose stop mock-service

# Trigger webhook from Rita - should handle failure gracefully
```

### Simulating Timeout
Configure a delay in the mock service response (future enhancement).

## Testing with Rita

The Mock Service is used in Rita's integration tests:

```bash
# From api-server
npm test  # Runs tests that use mock-service for webhooks
```

See test files in `packages/api-server/tests/` for examples.

## Logs and Debugging

The Mock Service logs all incoming requests:
```
[2024-01-15T10:30:00Z] POST /webhook
Payload: { source: "rita-documents", action: "document_deleted", ... }
Response: { success: true }
```

View logs:
```bash
# Docker logs
docker compose logs mock-service -f

# Local development
# Logs output to console
```

## Future Enhancements

Planned features for the Mock Service:
- **Configurable Response Delays** - Simulate slow external services
- **Response Scenario Modes** - Toggle between success/failure/timeout
- **Request History UI** - Web interface to view received webhooks
- **Payload Validation** - Validate webhook payloads against schema
- **RAG Vector Search Simulation** - Mock Barista's vector search responses

## Contributing

When adding new mock endpoints:
1. Document in this README
2. Add example requests/responses
3. Update tests that depend on the endpoint
4. Keep responses simple and predictable

For documentation standards, see [Main Docs README](../../../docs/README.md).
