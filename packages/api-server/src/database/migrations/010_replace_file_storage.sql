-- Replace file storage: Remove Supabase dependency and store files in database
-- This migration replaces the existing documents table structure

-- Drop the old documents table and recreate with new schema
DROP TABLE IF EXISTS message_documents;
DROP TABLE IF EXISTS documents;

-- Create new documents table with database storage
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- File metadata
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- Size in bytes (sufficient for 50KB default limit)
  mime_type TEXT NOT NULL,

  -- File content storage
  file_content BYTEA, -- Binary file data stored directly in database
  content TEXT, -- Text content for articles/direct input

  -- External service integration
  document_id UUID, -- External service document reference
  metadata JSONB DEFAULT '{}', -- Extensible document properties

  -- Processing pipeline
  processed_markdown TEXT, -- RAG pipeline output

  -- Status and timestamps
  status TEXT DEFAULT 'uploaded', -- 'uploaded', 'processing', 'processed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate message_documents junction table
CREATE TABLE message_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, document_id)
);

-- Indexes for performance
CREATE INDEX idx_documents_organization_id ON documents(organization_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_file_name ON documents(file_name);

-- Message-document junction table indexes
CREATE INDEX idx_message_documents_message_id ON message_documents(message_id);
CREATE INDEX idx_message_documents_document_id ON message_documents(document_id);

-- Add constraint to ensure either file_content OR content is present (not both null)
ALTER TABLE documents ADD CONSTRAINT documents_content_check
  CHECK (file_content IS NOT NULL OR content IS NOT NULL);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();