-- Conversation participants: allows multiple authenticated users within the
-- same organization to access and contribute to a single conversation.
--
-- Access model:
-- - Owner (conversations.user_id): full history, can manage participants
-- - Participant: messages from added_at forward, can read + write, no management
-- - Non-participant: no access (RLS blocks)

CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant')),
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- Index for RLS subquery: SELECT conversation_id FROM conversation_participants WHERE user_id = X AND organization_id = Y
-- PK is (conversation_id, user_id) so user_id-first lookups need a separate index.
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_org
    ON conversation_participants (user_id, organization_id);

-- RLS: participants can see the participant list of conversations they belong to
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see participants of their conversations"
    ON conversation_participants FOR ALL USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND (
            user_id = current_setting('app.current_user_id', true)::uuid
            OR conversation_id IN (
                SELECT cp2.conversation_id FROM conversation_participants cp2
                WHERE cp2.user_id = current_setting('app.current_user_id', true)::uuid
            )
        )
    );

-- Also allow conversation owners to see participants
-- (owner may not have a row in conversation_participants)
CREATE POLICY "Owners can see participants of their conversations"
    ON conversation_participants FOR ALL USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND conversation_id IN (
            SELECT id FROM conversations
            WHERE user_id = current_setting('app.current_user_id', true)::uuid
            AND organization_id = current_setting('app.current_organization_id', true)::uuid
        )
    );
