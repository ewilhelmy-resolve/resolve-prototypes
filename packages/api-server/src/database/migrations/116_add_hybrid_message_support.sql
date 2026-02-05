-- Migration: Add hybrid message support for structured Rita responses
-- This adds support for rich AI interactions (reasoning, sources, tasks, files)
-- while maintaining simple flat database storage

-- Add hybrid message support columns
ALTER TABLE messages ADD COLUMN metadata JSONB;
ALTER TABLE messages ADD COLUMN response_group_id UUID;

-- Create indexes for efficient queries
CREATE INDEX idx_messages_response_group ON messages (response_group_id) WHERE response_group_id IS NOT NULL;
CREATE INDEX idx_messages_metadata ON messages USING GIN (metadata) WHERE metadata IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN messages.metadata IS 'JSONB metadata for rich message types (reasoning, sources, tasks, files)';
COMMENT ON COLUMN messages.response_group_id IS 'Groups related messages together for cohesive AI responses';

-- Example usage:
-- Grouped assistant response with reasoning, text, and sources:
-- INSERT INTO messages (organization_id, conversation_id, user_id, role, message, metadata, response_group_id) VALUES
--   ('org-1', 'conv-1', 'user-1', 'assistant', '', '{"reasoning": {"content": "Let me analyze...", "duration": 3}}', 'group-123'),
--   ('org-1', 'conv-1', 'user-1', 'assistant', '## Analysis Complete\n\nFound 3 issues...', null, 'group-123'),
--   ('org-1', 'conv-1', 'user-1', 'assistant', '', '{"sources": [{"url": "https://docs.com", "title": "Guide"}]}', 'group-123');