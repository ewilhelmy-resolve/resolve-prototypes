# Resolve Onboarding Platform Integration Documentation

## Overview
This directory contains all documentation for integrating with the Actions Platform from the Resolve Onboarding system.

## Document Structure

### Core Integration Documents

1. **[RESOLVE-ONBOARDING-RAG-CHAT.md](./RESOLVE-ONBOARDING-RAG-CHAT.md)**
   - Complete workflow for RAG-powered chat interactions
   - User message → Actions Platform → Vector Search → AI Response
   - Single token authentication approach
   - Full implementation examples

2. **[RESOLVE-ONBOARDING-DOCUMENT-PROCESSING.md](./RESOLVE-ONBOARDING-DOCUMENT-PROCESSING.md)**
   - Document upload and processing workflow
   - PDF/Document → Markdown conversion → Vector embeddings
   - Callback endpoints for processed content
   - Support for 35+ file types

3. **[RESOLVE-ONBOARDING-QUICK-REFERENCE.md](./RESOLVE-ONBOARDING-QUICK-REFERENCE.md)**
   - Quick implementation guide with code examples
   - Common patterns and best practices
   - Testing commands and troubleshooting

## Integration Types

### 1. RAG Chat Integration (`RESOLVE-ONBOARDING-RAG-CHAT.md`)
**Purpose**: Enable AI-powered chat responses using vector search on knowledge base

**Flow**:
```
User Message → Onboarding → Actions Platform → Vector Search → AI Response → User
```

**Key Endpoints**:
- Webhook: `POST /api/Webhooks/postEvent/{id}`
- Vector Search: `POST /api/rag/vector-search`
- Chat Callback: `POST /api/rag/chat-callback/{message_id}`

### 2. Document Processing (`RESOLVE-ONBOARDING-DOCUMENT-PROCESSING.md`)
**Purpose**: Process uploaded documents into searchable vector embeddings

**Flow**:
```
Document Upload → Actions Platform → Markdown + Vectors → Knowledge Base
```

**Key Callbacks**:
- Markdown: `POST /api/rag/document-callback/{document_id}`
- Vectors: `POST /api/rag/callback/{callback_id}`

## Authentication

All integrations use token-based authentication:

- **Chat Messages**: Single `callback_token` for both vector search and response
- **Document Processing**: Permanent `callback_token` that never expires
- **Tenant Isolation**: All requests include `tenant_id` for data isolation

## Quick Start

For new implementations:

1. **Chat Integration**: Start with `RESOLVE-ONBOARDING-RAG-CHAT.md`
2. **Document Processing**: Use `RESOLVE-ONBOARDING-DOCUMENT-PROCESSING.md`
3. **Code Examples**: Refer to `RESOLVE-ONBOARDING-QUICK-REFERENCE.md`

## Environment URLs

- **Staging**: `https://actions-api-staging.resolve.io`
- **Production**: `https://actions-api.resolve.io`
- **Onboarding Platform**: Configured via `APP_URL` environment variable

## Security Requirements

1. **Always include `tenant_id`** in every request
2. **Use provided tokens** exactly as received in webhooks
3. **Validate tenant isolation** before processing
4. **Support HTTP** for internal communication

## Support

- GitHub Issues: `/issues`
- Slack: #platform-integration

---

*Last Updated: 2025-08-30*