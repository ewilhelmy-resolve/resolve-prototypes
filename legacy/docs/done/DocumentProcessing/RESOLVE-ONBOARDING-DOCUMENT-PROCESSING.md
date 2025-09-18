# Actions Platform Integration Documentation

## Overview

This document describes the webhook payloads sent from the Resolve Onboarding platform to the Actions platform, and the expected callback formats for document processing and vectorization.

## Quick Token Reference

⚠️ **CRITICAL**: The `callback_token` from the webhook MUST be used for ALL callbacks to Resolve:
- **Markdown Callback**: Use as `Authorization: Bearer {callback_token}`
- **Vector Callback**: Use as `X-Callback-Token: {callback_token}`
- **Document Download**: Use as `Authorization: Bearer {callback_token}`

**Important**: Document callback tokens are **permanent** and never expire. Once generated, they can be used indefinitely to allow external systems to interact with documents at any time.

**Common Error**: Using any token other than the one provided in the webhook will result in 401 Unauthorized.

## Table of Contents

1. [Document Processing Webhook](#document-processing-webhook)
2. [Callback Endpoints](#callback-endpoints)
3. [Authentication](#authentication)
4. [Error Handling](#error-handling)
5. [Complete Flow Example](#complete-flow-example)

---

## Document Processing Webhook

When a customer uploads a document via the manage button, the Onboarding platform sends the following webhook to the Actions platform.

### Endpoint
```
POST https://actions-api-staging.resolve.io/api/Webhooks/postEvent/00F4F67D-3B92-4FD2-A574-7BE22C6BE796
```

### Headers
```http
Authorization: Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj
Content-Type: application/json
```

### Payload Structure

```json
{
  "source": "onboarding",
  "action": "document-processing",
  "tenant_id": "uuid",
  "document_id": "uuid",
  "document_url": "https://platform.resolve.com/api/documents/{document_id}",
  "callback_url": "https://platform.resolve.com/api/rag/document-callback/{document_id}",
  "markdown_callback_url": "https://platform.resolve.com/api/rag/document-callback/{document_id}",
  "vector_callback_url": "https://platform.resolve.com/api/rag/callback/{callback_id}",
  "callback_token": "secure-token-string",
  "file_type": "pdf",
  "file_size": 1024000,
  "original_filename": "user-guide.pdf"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | string | Yes | Always `"onboarding"` - identifies the source system |
| `action` | string | Yes | Always `"document-processing"` - identifies the action type |
| `tenant_id` | UUID | Yes | Unique identifier for the tenant/customer who owns the document |
| `document_id` | UUID | Yes | Unique identifier for this document |
| `document_url` | string | Yes | URL where Actions platform can download the original document binary |
| `callback_url` | string | Yes | Legacy callback URL (kept for backward compatibility) |
| `markdown_callback_url` | string | Yes | URL for sending processed markdown content |
| `vector_callback_url` | string | Yes | URL for sending vectorized chunks |
| `callback_token` | string | Yes | Authentication token for callbacks (permanent, never expires) |
| `file_type` | string | Yes | File extension without dot (e.g., "pdf", "docx", "txt") |
| `file_size` | integer | Yes | File size in bytes |
| `original_filename` | string | Yes | Original name of the uploaded file |

### Supported File Types

```
pdf, doc, docx, ppt, pptx, xls, xlsx, rtf, html, htm, csv, txt, 
jpg, jpeg, png, gif, bmp, tiff, webp, odt, ods, odp, epub, md, 
xml, json, tex, xps, mobi, svg, docm, dotx, pptm, xlsm, xlsb, 
vsdx, vsd, pub, mht, mhtml, eml, msg
```

---

## Callback Endpoints

The Actions platform should make callbacks to these endpoints after processing the document.

### 1. Markdown Callback

**Purpose**: Send the fully processed document as markdown text

**Endpoint**: Value from `markdown_callback_url` field  
**Method**: POST  
**Timeout**: 30 seconds recommended

#### Request Headers
```http
Authorization: Bearer {callback_token}
Content-Type: application/json
```

#### Request Body
```json
{
  "tenant_id": "uuid",
  "document_id": "uuid",
  "markdown": "# Document Title\n\nProcessed markdown content...",
  "metadata": {
    "page_count": 10,
    "word_count": 5000,
    "processing_time_ms": 2500,
    "extraction_method": "ocr|text|hybrid"
  }
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenant_id` | UUID | Yes | Must match the tenant_id from the original webhook |
| `document_id` | UUID | Yes | Must match the document_id from the original webhook |
| `markdown` | string | Yes | Full document content converted to markdown format |
| `metadata` | object | No | Optional processing metadata |
| `metadata.page_count` | integer | No | Number of pages in original document |
| `metadata.word_count` | integer | No | Total word count |
| `metadata.processing_time_ms` | integer | No | Time taken to process in milliseconds |
| `metadata.extraction_method` | string | No | Method used: "ocr", "text", or "hybrid" |

#### Expected Response
```json
{
  "success": true,
  "message": "Document processed successfully",
  "document_id": "uuid"
}
```

### 2. Vector Callback

**Purpose**: Send vectorized chunks with embeddings

**Endpoint**: Value from `vector_callback_url` field  
**Method**: POST  
**Timeout**: 30 seconds recommended

#### Request Headers
```http
X-Callback-Token: {callback_token}
Content-Type: application/json
```

#### Request Body
```json
{
  "document_id": "uuid",
  "tenant_id": "uuid",
  "vectors": [
    {
      "chunk_text": "This is the actual text of the chunk that was vectorized...",
      "embedding": [0.0234, -0.0123, 0.0456, ...],
      "chunk_index": 0,
      "metadata": {
        "page_number": 1,
        "section": "introduction",
        "char_start": 0,
        "char_end": 500,
        "chunk_strategy": "semantic|fixed|paragraph"
      }
    },
    {
      "chunk_text": "This is the second chunk of text...",
      "embedding": [0.0345, -0.0234, 0.0567, ...],
      "chunk_index": 1,
      "metadata": {
        "page_number": 1,
        "section": "introduction",
        "char_start": 501,
        "char_end": 1000,
        "chunk_strategy": "semantic"
      }
    }
  ],
  "processing_metadata": {
    "total_chunks": 25,
    "chunk_size": 500,
    "chunk_overlap": 50,
    "embedding_model": "text-embedding-ada-002",
    "embedding_dimension": 1536
  }
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document_id` | UUID | Yes | Must match the document_id from the original webhook |
| `tenant_id` | UUID | Yes | Must match the tenant_id from the original webhook |
| `vectors` | array | Yes | Array of vectorized chunks |
| `vectors[].chunk_text` | string | Yes | The actual text content of this chunk |
| `vectors[].embedding` | array[float] | Yes | 1536-dimensional embedding vector (OpenAI format) |
| `vectors[].chunk_index` | integer | Yes | Sequential index of this chunk (0-based) |
| `vectors[].metadata` | object | No | Optional metadata for the chunk |
| `vectors[].metadata.page_number` | integer | No | Page number where chunk appears |
| `vectors[].metadata.section` | string | No | Document section identifier |
| `vectors[].metadata.char_start` | integer | No | Character position start in original |
| `vectors[].metadata.char_end` | integer | No | Character position end in original |
| `vectors[].metadata.chunk_strategy` | string | No | Strategy used: "semantic", "fixed", or "paragraph" |
| `processing_metadata` | object | No | Optional processing configuration |
| `processing_metadata.total_chunks` | integer | No | Total number of chunks created |
| `processing_metadata.chunk_size` | integer | No | Target chunk size in characters |
| `processing_metadata.chunk_overlap` | integer | No | Overlap between chunks |
| `processing_metadata.embedding_model` | string | No | Model used for embeddings |
| `processing_metadata.embedding_dimension` | integer | No | Vector dimension (must be 1536) |

#### Expected Response
```json
{
  "success": true,
  "vectors_stored": 25
}
```

---

## Authentication

### CRITICAL: Callback Token Usage

⚠️ **IMPORTANT**: Each webhook includes a unique `callback_token` that MUST be used when making callbacks to the Resolve platform. Using any other token will result in a 401 Unauthorized error.

### Understanding the Callback Token

When the Resolve platform sends a document processing webhook, it includes a `callback_token` field:

```json
{
  "document_id": "4910bbcb-7398-4632-960e-59e0e3a9a63a",
  "callback_token": "a1b2c3d4e5f6...", // THIS TOKEN MUST BE USED FOR CALLBACKS
  "callback_url": "...",
  // ... other fields
}
```

**This specific token MUST be used when calling back to Resolve for this document.**

### Token Characteristics

- **Format**: 64-character hexadecimal string (generated using crypto.randomBytes(32).toString('hex'))
- **Validity**: **Permanent** - tokens never expire
- **Uniqueness**: Each document gets a unique token
- **Storage**: Stored in `rag_documents.callback_token` (token_expires_at is always NULL)
- **Persistence**: Tokens remain valid even after document processing is complete

### How to Use the Token for Different Callbacks

#### 1. Markdown Callback (Document Processing Result)
When sending processed markdown back to Resolve:

```http
POST {markdown_callback_url from webhook}
Authorization: Bearer {callback_token from webhook}
Content-Type: application/json

{
  "tenant_id": "{tenant_id from webhook}",
  "document_id": "{document_id from webhook}",
  "markdown": "processed content..."
}
```

#### 2. Vector Callback (Embeddings)
When sending vector embeddings back to Resolve:

```http
POST {vector_callback_url from webhook}
X-Callback-Token: {callback_token from webhook}
Content-Type: application/json

{
  "document_id": "{document_id from webhook}",
  "tenant_id": "{tenant_id from webhook}",
  "vectors": [...]
}
```

### Common Authentication Errors

#### Error: 401 Unauthorized - "Invalid callback token"
**Cause**: Using wrong token (not the one from the webhook)
**Solution**: Use the exact `callback_token` value from the original webhook payload

#### Error: 403 Forbidden - "Tenant mismatch"
**Cause**: tenant_id in callback doesn't match the original
**Solution**: Use the same tenant_id from the webhook

### Token Verification Process

The Resolve platform validates callbacks by:
1. Extracting token from Authorization header (Bearer) or X-Callback-Token header
2. Looking up the document by document_id
3. Comparing provided token with stored `callback_token`
4. Verifying tenant_id matches

### Security Considerations

- **Never reuse tokens**: Each document processing gets a unique token
- **Token scope**: Token is only valid for the specific document_id it was issued for
- **No expiry**: Tokens are permanent to allow asynchronous processing and reprocessing at any time
- **Token persistence**: Tokens remain valid after document processing for future updates
- **HTTPS required**: All callbacks must use HTTPS in production
- **Request limits**: Body size limited to 100MB, timeout after 30 seconds

---

## Error Handling

### Callback Retry Strategy

If a callback fails, the Actions platform should implement the following retry strategy:

1. **Initial attempt**: Immediate
2. **First retry**: After 1 minute
3. **Second retry**: After 5 minutes
4. **Third retry**: After 15 minutes
5. **Mark as failed**: After 3 failed retries

### Error Response Formats

#### Authentication Error (401)
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired callback token"
}
```

#### Not Found Error (404)
```json
{
  "error": "Document not found",
  "message": "Document with ID {document_id} does not exist"
}
```

#### Validation Error (400)
```json
{
  "error": "INVALID_DIMENSION",
  "message": "Expected 1536 dimensions, received 768",
  "document_id": "uuid",
  "chunk_index": 5
}
```

#### Server Error (500)
```json
{
  "error": "Internal server error",
  "message": "Failed to store vectors"
}
```

---

## Complete Flow Example

### Step 1: Customer Uploads Document

Customer uploads `company-handbook.pdf` (2MB) via the manage button.

### Step 2: Onboarding Platform Sends Webhook

⚠️ **CRITICAL**: Note the `callback_token` in this webhook - this EXACT token must be used for all callbacks!

```bash
POST https://actions-api-staging.resolve.io/api/Webhooks/postEvent/00F4F67D-3B92-4FD2-A574-7BE22C6BE796
Authorization: Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj

{
  "source": "onboarding",
  "action": "document-processing",
  "tenant_id": "a1e73f85-a1ff-4cea-b279-2e93ce64df82",
  "document_id": "d5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "document_url": "https://platform.resolve.com/api/documents/d5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "markdown_callback_url": "https://platform.resolve.com/api/rag/document-callback/d5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "vector_callback_url": "https://platform.resolve.com/api/rag/callback/abc123def456",
  "callback_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2", // <-- SAVE THIS TOKEN!
  "file_type": "pdf",
  "file_size": 2097152,
  "original_filename": "company-handbook.pdf"
}
```

### Step 3: Actions Platform Downloads Document

✅ **CORRECT**: Using the callback_token from the webhook for authentication

```bash
GET https://platform.resolve.com/api/documents/d5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0
Authorization: Bearer a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### Step 4: Actions Platform Sends Markdown Callback

✅ **CORRECT**: Using the SAME callback_token from Step 2

```bash
POST https://platform.resolve.com/api/rag/document-callback/d5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0
Authorization: Bearer a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
Content-Type: application/json

{
  "tenant_id": "a1e73f85-a1ff-4cea-b279-2e93ce64df82",  # Must match webhook
  "document_id": "d5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0", # Must match webhook
  "markdown": "# Company Handbook\n\n## Chapter 1: Introduction\n\nWelcome to our company...\n\n## Chapter 2: Policies\n\n### 2.1 Code of Conduct\n...",
  "metadata": {
    "page_count": 45,
    "word_count": 12500,
    "processing_time_ms": 3200,
    "extraction_method": "text"
  }
}
```

❌ **WRONG**: Using a different token would result in 401 Unauthorized:
```bash
# DO NOT DO THIS - Using wrong token
Authorization: Bearer 6a9d2f75f8acc095cbf5f92ac3e775ec6a2d5703f38e2da0934a86ab35628616
# Response: 401 Unauthorized - "Invalid callback token"
```

### Step 5: Actions Platform Sends Vector Callback

✅ **CORRECT**: Using the SAME callback_token from Step 2 (in different header)

```bash
POST https://platform.resolve.com/api/rag/callback/abc123def456
X-Callback-Token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
Content-Type: application/json

{
  "document_id": "d5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0", # Must match webhook
  "tenant_id": "a1e73f85-a1ff-4cea-b279-2e93ce64df82",   # Must match webhook
  "vectors": [
    {
      "chunk_text": "Welcome to our company. This handbook contains all the essential information...",
      "embedding": [0.0234, -0.0123, 0.0456, /* ... 1533 more values ... */],
      "chunk_index": 0,
      "metadata": {
        "page_number": 1,
        "section": "introduction",
        "char_start": 0,
        "char_end": 500
      }
    },
    // ... more chunks ...
  ],
  "processing_metadata": {
    "total_chunks": 125,
    "chunk_size": 500,
    "chunk_overlap": 50,
    "embedding_model": "text-embedding-ada-002",
    "embedding_dimension": 1536
  }
}
```

### Step 6: Document Ready for Search

Once both callbacks are successful:
- Document status changes to `"ready"`
- Markdown is available for viewing
- Vectors are indexed for semantic search
- Customer can query their knowledge base

---

## Document Status Lifecycle

The document progresses through these statuses:

1. **`uploading`** - File being uploaded by customer
2. **`processing`** - Webhook sent to Actions platform
3. **`markdown_received`** - Markdown callback completed
4. **`vectors_received`** - Vector callback completed  
5. **`ready`** - Both callbacks successful, document ready for use
6. **`failed`** - Processing failed after retries
7. **`vectors_deleted`** - Vectors manually deleted (document still viewable)

---

## Testing Endpoints

For testing the integration, you can use these endpoints to verify the callbacks are working:

### Get Document Markdown
```bash
GET /api/tenant/{tenant_id}/documents/{document_id}/markdown
Cookie: sessionToken={user_session_token}
```

### Get Vector Statistics
```bash
GET /api/tenant/{tenant_id}/vectors/stats
Cookie: sessionToken={user_session_token}
```

### Search Vectors (Called by Actions Platform)
```bash
POST /api/rag/vector-search
X-Callback-Token: {tenant_callback_token}

{
  "query_embedding": [/* 1536 floats */],
  "tenant_id": "uuid",
  "limit": 5,
  "threshold": 0.7
}
```

---

## Rate Limits and Quotas

### Webhook Limits
- Max payload size: 10MB
- Timeout: 10 seconds
- Retry attempts: 3

### Callback Limits
- Max payload size: 100MB
- Timeout: 30 seconds per callback
- Max vectors per callback: 1000
- Max chunk text size: 10KB per chunk

### Storage Quotas (per tenant)
- Max documents: 10,000
- Max vectors: 1,000,000
- Max document size: 100MB
- Max markdown size: 10MB per document

---

## Contact and Support

For integration support or questions:
- Technical Issues: Create an issue at https://github.com/resolve/onboarding-platform/issues
- API Status: https://status.resolve.io
- Integration Testing: Use staging environment first

---

*Last Updated: 2024-01-29*
*Version: 1.0.0*