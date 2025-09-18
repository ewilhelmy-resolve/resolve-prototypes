# Knowledge Article Document Upload & Replacement Plan

## Implementation Status: ✅ COMPLETED (2025-08-28)

### Implementation Summary
All core features have been implemented according to the stakeholder requirements. The system is ready to accept document uploads, store them in PostgreSQL, and send them to the actions platform for processing.

### Files Modified/Created:
1. **Database Migration**: `/src/database/05-add-document-upload-columns.sql`
2. **RAG API Router**: `/src/routes/ragApi.js` - Added document upload endpoints
3. **Document API Router**: `/src/routes/documentApi.js` - New file for document retrieval
4. **Dashboard UI**: `/src/client/pages/dashboard.html` - Updated file upload and display
5. **Webhook Integration**: `/src/utils/resolve-webhook.js` - Added sendDocumentProcessingEvent
6. **Styles**: `/src/client/styles/dashboard-styles.css` - Added document status styles
7. **Server**: `/server.js` - Mounted document API router

### Endpoints Implemented:
- ✅ POST `/api/rag/upload-document` - Upload documents with binary storage
- ✅ GET `/api/documents/:document_id` - Retrieve raw documents
- ✅ POST `/api/rag/document-callback/:document_id` - Receive processed markdown
- ✅ GET `/api/rag/documents` - List all documents for tenant
- ✅ GET `/api/rag/document-status/:document_id` - Check processing status
- ✅ POST `/api/rag/document-retry/:document_id` - Retry failed documents

### Testing Notes:
- Document upload tested successfully via curl and browser
- Binary storage confirmed working (BYTEA column)
- UI properly shows processing status with visual indicators
- Webhook events are sent (awaiting actions platform integration)

# Knowledge Article Document Upload & Replacement Plan
#
# Stakeholder Implementation Answers
#
# 1. **Storage Architecture:**
#    - Store documents in a BYTEA column (raw binary) in a staging table.
#    - Avoid base64 encoding (adds ~33% size bloat).
#    - Only use PostgreSQL Large Objects for multi-GB files or chunked/seekable streaming.
#
# 2. **Document Retrieval Endpoint:**
#    - GET `/api/documents/{document_id}` should return a raw binary stream with appropriate Content-Type.
#    - Do not use base64 or multipart unless required for future extensibility.
#
# 3. **Actions Platform Webhook:**
#    - The actual webhook URL for the actions platform should be provided/configured (not hardcoded here).
#    - Authentication is via the callback token; no additional auth required.
#    - Implement retry logic for webhook failures.
#
# 4. **Callback Token Generation:**
#    - Randomly generate callback tokens (see existing examples in codebase).
#    - Tokens should have a TTL of 1 hour or expire after use; store in the database for validation.
#    - One token per document, stored with document metadata.
#
# 5. **File Size Limits:**
#    - Maximum file size accepted: 100MB.
#    - No different limits for different file types at this time.
#
# 6. **UI/UX Details:**
#    - "Add More" button is already present on the dashboard.
#    - Users cannot upload multiple files at once; for multiples, upload a zip file.
#    - On document processing failure: update the knowledge base entry and UI with "failed" status; if upload fails before entry creation, show a "upload failed" toast (toasts already implemented).
#
# 7. **Knowledge Base Entry Schema:**
#    - Add a field to store the processed markdown.
#    - Track file type, size, and original filename for actions platform processing.
#    - Version control for document replacements is out of scope; users can add new or delete existing documents.
#
# 8. **Document Replacement:**
#    - Replacement of existing documents is out of scope at this time.
#
# 9. **Actions Platform Webhook URL Configuration:**
#    - Use same configuration as existing chat webhook (AUTOMATION_WEBHOOK_URL environment variable)
#    - Webhook URL: process.env.AUTOMATION_WEBHOOK_URL (same as chat messages)
#    - Authorization: process.env.AUTOMATION_AUTH (same Basic auth header as chat)
#    - Implementation: Use existing ResolveWebhook class from src/utils/resolve-webhook.js
#
# 10. **Database Schema Details:**
#    - Extend existing rag_documents table with new columns for file storage
#    - Required new columns:
#      - file_data BYTEA (for raw binary document storage)
#      - file_type VARCHAR(50) (e.g., 'pdf', 'docx', 'txt')
#      - file_size INTEGER (size in bytes)
#      - original_filename VARCHAR(255) (user's original filename)
#      - callback_token VARCHAR(64) (for callback authentication)
#      - token_expires_at TIMESTAMP (token expiry time)
#      - processed_markdown TEXT (store the processed markdown from actions platform)
#    - Status field already exists in table
#
# 11. **Callback Token Validation:**
#    - Pass callback token in Authorization header
#    - Format: Authorization: Bearer <callback_token>
#    - Validate against token stored in rag_documents table
#
# 12. **Error Recovery:**
#    - On webhook failure after retries: Mark document status as "failed"
#    - Allow manual retry through UI (add retry button for failed documents)
#    - Use existing rag_webhook_failures table for retry queue
#
# 13. **Existing "Add More" Button:**
#    - Located in src/client/pages/dashboard.html (line 174)
#    - Function openAddModal() already exists (line 511)
#    - Currently handles CSV, TXT, PDF, ZIP, JSON uploads
#    - Modify to support all specified file types
#    - Uses existing upload endpoint pattern
#
# 14. **Document URL Construction:**
#    - Base URL configuration: Use APP_URL environment variable (same as chat callback URLs)
#    - Fallback: 'http://localhost:5000' if APP_URL not set
#    - Can also check system_config table for 'app_url' value
#    - Full URL pattern: ${APP_URL}/api/documents/{document_id}
#

## Supported File Types for Knowledge Articles


The onboarding app will accept the following document types for upload, ensure they are stored in the database, and notify the actions platform endpoint for processing:

  
**Explicitly supported file types (as of August 2025):**
  - PDF (.pdf)
  - Microsoft Word (.doc, .docx)
  - Microsoft PowerPoint (.ppt, .pptx)
  - Microsoft Excel (.xls, .xlsx)
  - Rich Text Format (.rtf)
  - HTML (.html, .htm)
  - CSV (.csv)
  - Plain Text (.txt)
  - Images (.jpg, .jpeg, .png, .gif, .bmp, .tiff, .webp)
  - OpenDocument formats (.odt, .ods, .odp)
  - EPUB (.epub)
  - Markdown (.md)
  - XML (.xml)
  - JSON (.json)
  - LaTeX (.tex)
  - XPS (.xps)
  - MOBI (.mobi)
  - TIFF (.tiff)
  - SVG (.svg)
  - RTF (.rtf)
  - DOCM (.docm)
  - DOTX (.dotx)
  - PPTM (.pptm)
  - XLSM (.xlsm)
  - XLSB (.xlsb)
  - ODT (.odt)
  - ODS (.ods)
  - ODP (.odp)
  - VSDX (.vsdx)
  - VSD (.vsd)
  - PUB (.pub)
  - MHT (.mht)
  - MHTML (.mhtml)
  - EML (.eml)
  - MSG (.msg)

## Workflow Overview

1. **Customer Uploads Document**
   - User clicks "Add More" on the dashboard and uploads any supported file type.
   - The file is stored in the database (not on local disk).
   - A knowledge base entry is created with:
     - Document name
     - Status indicator: "Processing..."
     - Created date

2. **Notify Actions Platform (Event Payload)**
   - After storing the document and creating the knowledge base entry, send an event to the actions platform webhook endpoint.
   - The event payload must include all information needed for the actions platform to:
     1. Retrieve the document from the onboarding app via a GET request
     2. Send back the processed markdown via a POST request

   **Required fields:**
  - `source`: "onboarding"
  - `action`: "document-processing"
  - `document_id`: Unique identifier for retrieval
  - `document_url`: URL to GET the document (e.g., `/api/documents/{document_id}`)
  - `callback_url`: URL to POST the processed markdown (e.g., `/api/rag/document-callback/{document_id}`)
  - `callback_token`: Token for callback authentication

   **Example payload:**
     ```json
     {
       "source": "onboarding",
       "action": "document-processing",
       "document_id": "abc123",
       "document_url": "http://localhost:5000/api/documents/abc123",
       "callback_url": "http://localhost:5000/api/rag/document-callback/abc123",
       "callback_token": "ddfea82b7ebe3bb026aca323d0f717d22ae25718debc89d6568203e4c7719620"
     }
     ```

3. **Document Retrieval Endpoint (GET /api/documents/:document_id)**
   - Create new endpoint to serve raw document files to actions platform
   - Retrieve document from rag_documents.file_data BYTEA column
   - Set appropriate Content-Type header based on file_type
   - Return raw binary stream
   - No authentication required (actions platform uses document_id as security)

4. **Receive Processed Markdown (POST Endpoint)**
   - The onboarding app must provide a POST endpoint for the actions platform to send back the processed markdown.
   - The endpoint should follow the pattern used in the callback URL (e.g., `/api/rag/document-callback/{document_id}`).
   - The actions platform will POST the processed markdown to this endpoint, including:
     - `document_id`: Unique identifier for the knowledge base entry
     - `tenant_id`: Tenant identifier
     - `markdown`: The processed markdown content
     - Any additional metadata as needed
   - On receiving the POST, the onboarding app should:
     - Validate the callback token
     - Update the corresponding knowledge base entry in the database with the new markdown
     - Change the status indicator to "Ready" or "Processed"
   - Example POST payload:
     ```json
     {
       "document_id": "abc123",
       "tenant_id": "94c484e8-8536-49ad-8a0a-95a21a148baa",
       "markdown": "# Customer Guide\nThis is the processed content..."
     }
     ```
  
## Implementation Details (Added 2025-08-28)

### 1. Database Schema Changes
```sql
-- Added to rag_documents table:
ALTER TABLE rag_documents 
ADD COLUMN file_data BYTEA,              -- Raw binary storage
ADD COLUMN file_type VARCHAR(50),        -- File extension
ADD COLUMN file_size INTEGER,            -- Size in bytes  
ADD COLUMN original_filename VARCHAR(255), -- User's filename
ADD COLUMN callback_token VARCHAR(64),   -- Auth token
ADD COLUMN token_expires_at TIMESTAMP,   -- Token TTL
ADD COLUMN processed_markdown TEXT;      -- Processed content
```

### 2. Upload Flow Implementation
1. User clicks "Add more" button in Knowledge Base section
2. File input accepts all specified types (40+ formats)
3. Document stored in PostgreSQL with status "processing"
4. Document immediately appears in UI with yellow processing indicator
5. Webhook sent to actions platform with document_id and callback URLs
6. System polls every 5 seconds for status updates
7. On callback receipt, status changes to "ready" (green) or "failed" (red)

### 3. Critical Implementation Decisions
- **Binary Storage**: Used BYTEA column type (not base64) per requirement
- **Content Column**: Had to provide placeholder value due to NOT NULL constraint
- **Multer**: Used multer.memoryStorage() for in-memory file handling
- **UI Integration**: Reused existing article-item format for consistency
- **Callback Security**: Bearer token in Authorization header, validated against DB

### 4. Known Issues Resolved
- **Initial 500 Error**: Fixed by adding required `content` column value
- **UI Display**: Fixed by using correct `articles-list` ID instead of `.knowledge-list`
- **Status Updates**: Implemented proper color coding and status text updates

### 5. Testing Verification
```bash
# Test upload (successful)
curl -X POST http://localhost:5000/api/rag/upload-document \
  -H "Cookie: sessionToken=TOKEN" \
  -F "document=@test.html"
# Response: {"success":true,"document_id":"...","status":"processing"}

# Document retrieval works
curl http://localhost:5000/api/documents/DOCUMENT_ID
# Returns: Raw binary file content

# Status checking works
curl http://localhost:5000/api/rag/document-status/DOCUMENT_ID
# Returns: Document status and metadata
```

### 6. Pending Items
- Actions platform webhook URL configuration (uses AUTOMATION_WEBHOOK_URL env var)
- Actual markdown processing by actions platform
- Testing of callback flow when actions platform is ready

### 7. UI/UX Implementation
- Documents show immediately with "PROCESSING • DOCUMENT" status
- Yellow icon/text while processing
- Green icon/text when ready
- Red icon/text with RETRY button on failure
- Article count updates automatically
- Existing documents load on page refresh

   
