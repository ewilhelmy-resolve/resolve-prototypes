-- Migration to add conversation modeling

-- 1. Create the 'conversations' table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References auth.users(id) from Supabase
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a trigger to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();


-- Indexes for performance
CREATE INDEX idx_conversations_organization_id ON conversations(organization_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);

-- 2. Add 'conversation_id' to the 'messages' table
ALTER TABLE messages
ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Create an index on the new column
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- 3. Add RLS policies for the new 'conversations' table
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can only access conversations from their active organization
CREATE POLICY "Users can access conversations from their active organization" ON conversations
  FOR ALL USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
  );

-- Users can only create conversations in their active organization
CREATE POLICY "Users can create conversations in their active organization" ON conversations
  FOR INSERT WITH CHECK (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND user_id = current_setting('app.current_user_id', true)::uuid
  );
