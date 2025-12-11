-- Drop RAG tables that are managed by external Barista service
-- These tables are not queried or managed by the Rita API server
-- The API server only uses rag_webhook_failures for webhook retry logic
-- All other RAG operations are handled by the external Barista service via webhooks

-- IMPORTANT: This migration is designed to be safe and idempotent
-- All tables are dropped with CASCADE to handle any remaining foreign key constraints
-- IF EXISTS ensures the migration can be run multiple times without errors

-- ====================
-- LEGACY RAG TABLES (Replaced by new Rita architecture)
-- ====================

-- Drop rag_conversations table (REPLACED by conversations table in migration 106)
-- Old schema: id (SERIAL), conversation_id (UUID), tenant_id, user_email, status, context (JSONB)
-- New schema: id (UUID PK), organization_id (FK), user_id (UUID), title, timestamps
-- Key improvements: proper foreign keys, row-level security, auto-updating timestamps
DROP TABLE IF EXISTS rag_conversations CASCADE;

-- Drop rag_messages table (REPLACED by messages table in migrations 101, 109, 116)
-- Old schema: id (SERIAL), conversation_id, tenant_id, role, message, response_time_ms
-- New schema: id (UUID PK), organization_id (FK), conversation_id (FK), user_id, role, message,
--             status tracking, metadata (JSONB), response_group_id, timestamps
-- Key improvements: proper foreign keys, hybrid message support, status workflow, pagination indexes
DROP TABLE IF EXISTS rag_messages CASCADE;

-- Drop rag_documents table (REPLACED by blob_metadata + blobs in migration 113)
-- Old schema: id (SERIAL), tenant_id, document_id, callback_id, content (TEXT), metadata, status
-- New schema: blob_metadata (UUID PK, organization_id FK, user_id, filename, mime_type, status, metadata)
--             + blobs (content-addressable storage with SHA-256 deduplication)
-- Key improvements: content deduplication, proper file metadata separation, organization isolation
DROP TABLE IF EXISTS rag_documents CASCADE;

-- Drop rag_vectors table (managed by Barista)
-- Vector embeddings (pgvector) for semantic search managed entirely by external service
DROP TABLE IF EXISTS rag_vectors CASCADE;

-- Drop rag_tenant_tokens table (managed by Barista)
-- Callback tokens for Barista service managed entirely by external service
DROP TABLE IF EXISTS rag_tenant_tokens CASCADE;

-- ====================
-- RETAINED RAG TABLE
-- ====================

-- rag_webhook_failures is RETAINED
-- This table is actively used by the API server for webhook retry logic
-- See: services/WebhookService.ts:258, services/DataSourceWebhookService.ts:194

-- ====================
-- VERIFICATION
-- ====================

-- Log completion (for migration tracking)
DO $$
BEGIN
  RAISE NOTICE 'Migration 128: Successfully dropped 5 external RAG service tables';
  RAISE NOTICE '  - Dropped: rag_conversations, rag_documents, rag_messages, rag_vectors, rag_tenant_tokens';
  RAISE NOTICE '  - Retained: rag_webhook_failures (used by API server for webhook retry logic)';
END $$;