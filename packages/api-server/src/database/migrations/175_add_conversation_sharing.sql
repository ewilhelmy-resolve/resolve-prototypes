-- Snapshot-based conversation sharing.
-- When a user shares a conversation, Rita creates an immutable snapshot of the
-- messages at share time in this table. Public readers fetch the snapshot by
-- opaque share_id; the live conversations/messages tables are never touched.
--
-- Why snapshot (not live pointer):
-- - Revoke = DELETE row → instant, no flag to forget to check
-- - No access control on the public read path (if row exists, it's public)
-- - New messages after share don't leak automatically
-- - Can be edge-cached / CDN-cached safely (frozen data)
-- - 404 for both "never shared" and "un-shared" — no existence leak

CREATE TABLE IF NOT EXISTS shared_conversations (
	share_id TEXT PRIMARY KEY,
	conversation_id UUID NOT NULL,
	title TEXT,
	messages JSONB NOT NULL,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE(conversation_id)
);

-- Index for disable flow: DELETE WHERE conversation_id = $1
CREATE INDEX IF NOT EXISTS idx_shared_conversations_conversation_id
	ON shared_conversations(conversation_id);
