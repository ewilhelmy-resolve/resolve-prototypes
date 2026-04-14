-- Widen conversations RLS to include participants.
-- Before: only conversation owner (user_id) could access.
-- After: owner OR anyone in conversation_participants can access.
--
-- Messages RLS references conversations via subquery, so it automatically
-- inherits this wider access — no separate messages policy change needed.

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
