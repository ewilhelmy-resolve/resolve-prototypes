-- Drop deprecated document storage tables
-- These tables are replaced by the blob_metadata and blobs content-addressable storage system

-- Drop junction table first (has foreign keys)
DROP TABLE IF EXISTS message_documents CASCADE;

-- Drop old documents table
DROP TABLE IF EXISTS documents CASCADE;

-- Note: The new content-addressable storage system uses:
-- - blobs: Stores deduplicated binary content (migration 113)
-- - blob_metadata: Stores per-user/org file metadata (migration 113)
--
-- Document associations with messages are now handled by the external RAG service,
-- not by database junction tables.
