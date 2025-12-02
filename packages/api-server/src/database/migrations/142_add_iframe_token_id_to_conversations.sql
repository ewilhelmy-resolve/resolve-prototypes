-- Add iframe_token_id to conversations for audit trail
-- Links iframe conversations to their source token

ALTER TABLE conversations
ADD COLUMN iframe_token_id UUID REFERENCES iframe_tokens(id);

-- Partial index for efficient queries on iframe conversations only
CREATE INDEX idx_conversations_iframe_token_id
ON conversations(iframe_token_id) WHERE iframe_token_id IS NOT NULL;
