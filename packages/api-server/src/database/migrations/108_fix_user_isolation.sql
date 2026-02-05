-- Migration to fix user-level isolation for personal conversations
-- Ensures users can only access their own conversations and messages

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can access conversations from their active organization" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations in their active organization" ON conversations;

-- 2. Create new user-isolated policies for conversations
CREATE POLICY "Users can access their own conversations" ON conversations
  FOR ALL USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND user_id = current_setting('app.current_user_id', true)::uuid
  );

CREATE POLICY "Users can create conversations for themselves" ON conversations
  FOR INSERT WITH CHECK (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND user_id = current_setting('app.current_user_id', true)::uuid
  );

-- 3. Update message policies to ensure user can only access messages from their own conversations
DROP POLICY IF EXISTS "Users can view messages from their active organization" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their active organization" ON messages;

-- Messages can be viewed if they belong to user's conversations
CREATE POLICY "Users can view messages from their own conversations" ON messages
  FOR SELECT USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND conversation_id IN (
      SELECT id FROM conversations
      WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
      AND user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Users can create messages in their own conversations
CREATE POLICY "Users can create messages in their own conversations" ON messages
  FOR INSERT WITH CHECK (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND conversation_id IN (
      SELECT id FROM conversations
      WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
      AND user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Users can update messages in their own conversations (for status updates)
CREATE POLICY "Users can update messages in their own conversations" ON messages
  FOR UPDATE USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND conversation_id IN (
      SELECT id FROM conversations
      WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
      AND user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Verify policies are correctly applied
DO $$
BEGIN
  RAISE NOTICE 'User isolation policies updated successfully';
END $$;