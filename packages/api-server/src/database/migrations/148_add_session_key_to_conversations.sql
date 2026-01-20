-- Add session_key column to link iframe conversations to Valkey sessions
-- Enables conversation reuse when same sessionKey is used (PLAT-3286)

ALTER TABLE conversations ADD COLUMN session_key TEXT;

-- Partial unique index for efficient lookups (only iframe conversations have session_key)
-- Unique constraint ensures one conversation per sessionKey
CREATE UNIQUE INDEX idx_conversations_session_key
ON conversations(session_key) WHERE session_key IS NOT NULL;
