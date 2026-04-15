-- Widen conversations RLS to include participants.
-- Before: only conversation owner (user_id) could access.
-- After: owner OR anyone in conversation_participants can access.
--
-- Messages RLS is updated separately in migration 178 with operation-specific
-- policies (SELECT/INSERT/UPDATE) that delegate to this conversations policy
-- via subquery composition. The INSERT policy on conversations from migration
-- 108 ("Users can create conversations for themselves") is intentionally NOT
-- dropped — participants should not create conversations as other users.

DROP POLICY IF EXISTS "Users can access their own conversations" ON conversations;

CREATE POLICY "Users can access own or participated conversations" ON conversations
    FOR ALL USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND (
            user_id = current_setting('app.current_user_id', true)::uuid
            OR id IN (
                SELECT conversation_id FROM conversation_participants
                WHERE user_id = current_setting('app.current_user_id', true)::uuid
                AND organization_id = current_setting('app.current_organization_id', true)::uuid
            )
        )
    );
