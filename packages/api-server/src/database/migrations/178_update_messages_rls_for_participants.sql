-- Update messages RLS policies to support conversation participants.
--
-- Before: messages policies subqueried conversations with explicit
-- `AND user_id = current_user`, which ANDs with conversations RLS
-- and kills the participant access branch.
--
-- After: messages policies subquery conversations with ONLY organization_id.
-- The conversations RLS (updated in migration 177) handles the
-- owner-or-participant check. This way participants can read, insert,
-- and update messages in conversations they've been added to.

DROP POLICY IF EXISTS "Users can view messages from their own conversations" ON messages;
CREATE POLICY "Users can view messages from accessible conversations" ON messages
  FOR SELECT USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND conversation_id IN (
      SELECT id FROM conversations
      WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
    )
  );

DROP POLICY IF EXISTS "Users can create messages in their own conversations" ON messages;
CREATE POLICY "Users can create messages in accessible conversations" ON messages
  FOR INSERT WITH CHECK (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND conversation_id IN (
      SELECT id FROM conversations
      WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
    )
  );

DROP POLICY IF EXISTS "Users can update messages in their own conversations" ON messages;
CREATE POLICY "Users can update messages in accessible conversations" ON messages
  FOR UPDATE USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND conversation_id IN (
      SELECT id FROM conversations
      WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
    )
  );
