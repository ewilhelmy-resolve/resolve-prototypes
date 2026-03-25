-- Add user_id to activity_contexts so each user gets their own conversation per activity
-- Fixes: "Conversation not found" when User B opens same activity as User A

-- Add user_id column (nullable for backfill)
ALTER TABLE activity_contexts ADD COLUMN user_id UUID;

-- Backfill from linked conversation
UPDATE activity_contexts ac
SET user_id = c.user_id
FROM conversations c
WHERE ac.conversation_id = c.id;

-- Make non-nullable
ALTER TABLE activity_contexts ALTER COLUMN user_id SET NOT NULL;

-- Replace unique constraint: per-activity-per-org → per-activity-per-org-per-user
ALTER TABLE activity_contexts
  DROP CONSTRAINT activity_contexts_activity_id_organization_id_key;
ALTER TABLE activity_contexts
  ADD CONSTRAINT activity_contexts_activity_org_user_key
  UNIQUE(activity_id, organization_id, user_id);

-- Replace index
DROP INDEX idx_activity_contexts_lookup;
CREATE INDEX idx_activity_contexts_lookup
  ON activity_contexts(activity_id, organization_id, user_id);
