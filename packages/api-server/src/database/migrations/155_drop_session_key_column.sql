-- Drop session_key column from conversations table
-- Conversation reuse is now via activity_contexts table using activityId from Valkey context
-- sessionKey is fleeting (changes every time), activityId is the stable identifier

DROP INDEX IF EXISTS idx_conversations_session_key;
ALTER TABLE conversations DROP COLUMN IF EXISTS session_key;
