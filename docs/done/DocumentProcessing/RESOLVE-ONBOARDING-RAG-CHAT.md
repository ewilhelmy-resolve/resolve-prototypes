# RAG Complete Workflow Documentation

**For Actions Platform Team Implementation**

## Overview

This document describes the complete workflow for integrating RAG (Retrieval Augmented Generation) between the Onboarding Platform and Actions Platform.

## Simple Flow
1. User types message in Onboarding app
2. Onboarding forwards message to Actions Platform  
3. Actions Platform generates embedding from user's message
4. Actions Platform searches Onboarding's RAG vector database
5. Actions Platform returns formatted response to Onboarding chat window

## Visual Workflow

### Mermaid Diagram
```mermaid
sequenceDiagram
    participant User
    participant Onboarding as Resolve Onboarding
    participant Actions as Actions Platform
    participant Vector as Vector DB<br/>(Onboarding)
    participant AI as AI Model

    User->>Onboarding: Types message in RITA chat
    Note over Onboarding: Prepares webhook with<br/>callback_token & URLs
    
    Onboarding->>Actions: POST webhook with message<br/>+ callback_token<br/>+ vector_search_url<br/>+ callback_url
    Note over Actions: Webhook received<br/>HTTP 200 OK
    
    Actions->>AI: Generate embedding<br/>(1536 dimensions)
    AI-->>Actions: Query embedding
    
    Actions->>Vector: POST /api/rag/vector-search<br/>Header: X-Callback-Token<br/>Body: embedding + tenant_id
    Vector-->>Actions: Relevant chunks<br/>(similarity scores)
    
    Actions->>AI: Generate response<br/>with context
    AI-->>Actions: AI response text
    
    Actions->>Onboarding: POST callback_url<br/>Header: Bearer token<br/>Body: AI response + sources
    
    Onboarding->>User: Display response<br/>in chat window
```

### ASCII Box Diagram
```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│    USER     │      │ RESOLVE ONBOARDING│      │ ACTIONS PLATFORM│
│             │      │                  │      │                 │
│  RITA Chat  │      │   - Webhook      │      │  - Embedding    │
│             │      │   - Auth Tokens  │      │  - AI Response  │
└──────┬──────┘      └────────┬─────────┘      └────────┬────────┘
       │                      │                          │
       │ 1. Type message      │                          │
       ├─────────────────────>│                          │
       │                      │ 2. Send webhook          │
       │                      ├─────────────────────────>│
       │                      │   + callback_token       │
       │                      │   + vector_search_url    │
       │                      │   + callback_url         │
       │                      │                          │
       │                      │                          ├──────┐
       │                      │                          │      │ 3. Generate
       │                      │                          │<─────┘    Embedding
       │                      │                          │
       │                      │ 4. Search vectors        │
       │                      │<─────────────────────────┤
       │                      │   X-Callback-Token       │
       │                      │                          │
       │                      │ 5. Return chunks         │
       │                      ├─────────────────────────>│
       │                      │                          │
       │                      │                          ├──────┐
       │                      │                          │      │ 6. Generate
       │                      │                          │<─────┘    AI Response
       │                      │                          │
       │                      │ 7. Send AI response      │
       │                      │<─────────────────────────┤
       │                      │   Bearer token           │
       │                      │                          │
       │ 8. Display response  │                          │
       │<─────────────────────┤                          │
       │                      │                          │
```

## Detailed Implementation

### Step 1: User Sends Chat Message

When a user sends a message through the RITA chat interface, Onboarding Platform sends this webhook to Actions Platform:

**Webhook URL**: `https://actions-api-staging.resolve.io/api/Webhooks/postEvent/00F4F67D-3B92-4FD2-A574-7BE22C6BE796`

**Headers**:
```http
Authorization: Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj
Content-Type: application/json
```

**Payload**:
```json
{
  "source": "onboarding",
  "action": "process-chat-message",
  "userEmail": "user@example.com",
  "tenantId": "a1e73f85-a1ff-4cea-b279-2e93ce64df82",
  "conversation_id": "conv-uuid-here",
  "message_id": "msg-uuid-here",
  "customer_message": "How do I reset my password?",
  "callback_url": "http://platform.resolve.com/api/rag/chat-callback/{message_id}",
  "callback_token": "secure-token-for-this-message",
  "vector_search_url": "http://platform.resolve.com/api/rag/vector-search",
  "timestamp": "2024-01-29T10:30:00Z"
}
```

**Important Fields**:
- `callback_token`: Use this SAME token for both vector search AND chat callback
- `vector_search_url`: Endpoint to search the RAG database
- `message_id`: Include this in vector search for authentication
- `tenantId`: MUST be included in all requests for tenant isolation

### Step 2: Generate Embedding

Actions Platform generates an embedding from the customer's message.

**Requirements**:
- Embedding MUST be exactly 1536 dimensions
- Use the `customer_message` field from the webhook

### Step 3: Search Vector Database

Search the Onboarding RAG database using the SAME callback_token:

**Endpoint**: Use the `vector_search_url` from webhook  
**Method**: POST  
**Headers**:
```http
X-Callback-Token: {callback_token from webhook}
Content-Type: application/json
```

**Request Body**:
```json
{
  "query_embedding": [/* 1536 float values */],
  "tenant_id": "a1e73f85-a1ff-4cea-b279-2e93ce64df82",
  "message_id": "msg-uuid-here",
  "limit": 5,
  "threshold": 0.7
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "document_id": "d5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
      "chunk_text": "To reset your password, go to the login page and click 'Forgot Password'. Enter your email address and we'll send you a reset link...",
      "chunk_index": 42,
      "similarity": 0.92,
      "metadata": {
        "page_number": 5,
        "section": "account-management",
        "original_filename": "user-guide.pdf"
      }
    }
  ],
  "execution_time_ms": 45
}
```

### Step 4: Generate AI Response

Use the search results as context to generate an appropriate AI response based on:
- The user's original message (`customer_message` from webhook)
- The relevant context from the vector search results
- Any additional business logic or rules

### Step 5: Send Response Back to Onboarding

Send the AI response back via the callback URL:

**Endpoint**: Use the `callback_url` from webhook  
**Method**: POST  
**Headers**:
```http
Authorization: Bearer {callback_token from webhook}
Content-Type: application/json
```

**Request Body**:
```json
{
  "conversation_id": "conv-uuid-here",
  "tenant_id": "a1e73f85-a1ff-4cea-b279-2e93ce64df82",
  "ai_response": "To reset your password, please follow these steps:\n1. Go to the login page\n2. Click on 'Forgot Password'\n3. Enter your email address\n4. Check your email for a reset link\n5. Follow the link to create a new password",
  "sources": [
    {
      "document_id": "d5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
      "chunk_text": "To reset your password, go to the login page...",
      "similarity": 0.92
    }
  ],
  "processing_time_ms": 2500
}
```

## Implementation Notes

1. **Process the webhook** from Step 1
2. **Generate 1536-dimension embedding** from the customer message
3. **Search the vector database** using the provided endpoint and token
4. **Generate an AI response** using the search results as context
5. **Send the response** back via the callback URL

**Important**: Always return HTTP 200 to acknowledge webhook receipt, regardless of processing outcome.

## Testing

### Test Vector Search
```bash
# Test with 1536-dimension embedding array
curl -X POST http://platform.resolve.com/api/rag/vector-search \
  -H "X-Callback-Token: test-callback-token" \
  -H "Content-Type: application/json" \
  -d '{
    "query_embedding": [/* array of 1536 float values */],
    "tenant_id": "test-tenant-id",
    "message_id": "test-message-id",
    "limit": 5
  }'
```

### Test Chat Callback
```bash
curl -X POST http://platform.resolve.com/api/rag/chat-callback/test-message-id \
  -H "Authorization: Bearer test-callback-token" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "test-conv-id",
    "tenant_id": "test-tenant-id",
    "ai_response": "This is a test response",
    "sources": []
  }'
```

## Important Security Notes

1. **Tenant Isolation**: Always include `tenant_id` in every request. The system filters all data by tenant.
2. **Token Usage**: Use the same `callback_token` for both vector search and chat callback
3. **Message Validation**: Include `message_id` in vector search for additional validation
4. **HTTP Support**: All endpoints support HTTP (not just HTTPS) for internal communication
5. **Timeout**: Set 30-second timeouts on all API calls

## Error Handling

| Error | Response | Action |
|-------|----------|--------|
| Vector search fails | Continue without context | Generate general AI response |
| Invalid token | 401 Unauthorized | Check token matches webhook |
| Tenant mismatch | 403 Forbidden | Verify tenant_id consistency |
| Embedding wrong size | 400 Bad Request | Ensure 1536 dimensions |
| Timeout | Request timeout | Implement retry with backoff |

## Summary

1. **One Token**: Use the `callback_token` from the webhook for everything
2. **Include message_id**: Add it to vector search requests for authentication
3. **Maintain tenant_id**: Include it in every request for isolation
4. **1536 Dimensions**: Embeddings must be exactly 1536 floats (OpenAI ada-002)
5. **HTTP OK**: All endpoints work with HTTP

---

*Last Updated: 2025-08-30*  
*Version: 2.0 - Simplified Single Token Approach*