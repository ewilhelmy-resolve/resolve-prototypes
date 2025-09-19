-- Migration to add document upload support columns to rag_documents table
-- Date: 2025-08-28

-- Add new columns for document storage
ALTER TABLE rag_documents 
ADD COLUMN IF NOT EXISTS file_data BYTEA,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS callback_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS processed_markdown TEXT;

-- Create index for callback token lookups
CREATE INDEX IF NOT EXISTS idx_rag_docs_callback_token ON rag_documents(callback_token);

-- Create index for token expiry cleanup
CREATE INDEX IF NOT EXISTS idx_rag_docs_token_expires ON rag_documents(token_expires_at) WHERE token_expires_at IS NOT NULL;

-- Update comment on table
COMMENT ON TABLE rag_documents IS 'Stores both text content and uploaded documents for RAG processing';
COMMENT ON COLUMN rag_documents.file_data IS 'Raw binary document data (PDF, DOCX, etc.)';
COMMENT ON COLUMN rag_documents.file_type IS 'File extension/type (pdf, docx, txt, etc.)';
COMMENT ON COLUMN rag_documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN rag_documents.original_filename IS 'Original filename provided by user';
COMMENT ON COLUMN rag_documents.callback_token IS 'Token for actions platform callback authentication';
COMMENT ON COLUMN rag_documents.token_expires_at IS 'Expiry time for callback token';
COMMENT ON COLUMN rag_documents.processed_markdown IS 'Processed markdown content from actions platform';