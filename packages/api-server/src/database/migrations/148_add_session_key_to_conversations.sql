-- Add session_key and source columns to conversations (JAR-71)
-- session_key: DROPPED in migration 155. Conversation reuse is via activity_contexts
--   table (migration 154) using context.activityId from Valkey.
-- source: tracks conversation origin for cleanup/analytics

ALTER TABLE conversations ADD COLUMN session_key TEXT;
ALTER TABLE conversations ADD COLUMN source TEXT;

-- Partial unique index for efficient lookups (only iframe conversations have session_key)
CREATE UNIQUE INDEX idx_conversations_session_key
ON conversations(session_key) WHERE session_key IS NOT NULL;

-- Index for cleanup queries: find all iframe conversations
CREATE INDEX idx_conversations_source ON conversations(source) WHERE source IS NOT NULL;

-- Source values:
--   'rita_go'   - RITA Go web app conversations
--   'jarvis'    - Jarvis iframe embed conversations
--   'workflows' - JIRITA workflow conversations
--   NULL        - legacy/pre-migration conversations (default)
