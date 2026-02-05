-- Activity contexts table: links Jarvis activities to conversations
-- Enables same activity to always use same conversation across sessions

CREATE TABLE activity_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id INTEGER NOT NULL,
  organization_id UUID NOT NULL,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(activity_id, organization_id)
);

CREATE INDEX idx_activity_contexts_lookup
ON activity_contexts(activity_id, organization_id);
