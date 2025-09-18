-- Create message_documents junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS message_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, document_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_message_documents_message_id ON message_documents(message_id);
CREATE INDEX IF NOT EXISTS idx_message_documents_document_id ON message_documents(document_id);