-- Deterministic seed data for e2e validation
-- All IDs are fixed — see constants.ts for the canonical list
--
-- Run via: pnpm db:reset (which truncates, re-migrates, then executes this)
--
-- NOTE: Migration 140 creates the public org/user with ON CONFLICT DO NOTHING,
-- so those records will exist after migrations run. This seed only adds test data.

-- ── Test Organization ──────────────────────────────────────────────────────────

INSERT INTO organizations (id, name, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Test Organization',
  '2025-01-15T10:00:00.000Z',
  '2025-01-15T10:00:00.000Z'
);

-- ── Test Users ─────────────────────────────────────────────────────────────────

-- Owner user (matches Keycloak testuser with fixed id aaaaaaaa-...)
INSERT INTO user_profiles (user_id, keycloak_id, email, first_name, last_name, active_organization_id, created_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'testuser@example.com',
  'Test',
  'User',
  '11111111-1111-1111-1111-111111111111',
  '2025-01-15T10:00:00.000Z'
);

-- Member user (matches Keycloak testmember with fixed id bbbbbbbb-...)
INSERT INTO user_profiles (user_id, keycloak_id, email, first_name, last_name, active_organization_id, created_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'testmember@example.com',
  'Test',
  'Member',
  '11111111-1111-1111-1111-111111111111',
  '2025-01-15T10:00:00.000Z'
);

-- ── Organization Members ───────────────────────────────────────────────────────

INSERT INTO organization_members (organization_id, user_id, role, is_active, joined_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'owner',
  true,
  '2025-01-15T10:00:00.000Z'
);

INSERT INTO organization_members (organization_id, user_id, role, is_active, joined_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'member',
  true,
  '2025-01-15T10:00:00.000Z'
);

-- ── Conversations ──────────────────────────────────────────────────────────────

-- Conversation 1: has messages (owned by owner user)
INSERT INTO conversations (id, organization_id, user_id, title, source, created_at, updated_at)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Test Conversation 1',
  'rita-chat',
  '2025-01-15T10:00:00.000Z',
  '2025-01-15T10:05:00.000Z'
);

-- Conversation 2: empty (owned by owner user)
INSERT INTO conversations (id, organization_id, user_id, title, source, created_at, updated_at)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Test Conversation 2',
  'rita-chat',
  '2025-01-15T10:10:00.000Z',
  '2025-01-15T10:10:00.000Z'
);

-- ── Messages (in Conversation 1) ──────────────────────────────────────────────

-- User message 1
INSERT INTO messages (id, organization_id, conversation_id, user_id, message, role, status, created_at)
VALUES (
  '66666666-6666-6666-6666-666666666661',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'Hello, I need help with my laptop',
  'user',
  'completed',
  '2025-01-15T10:01:00.000Z'
);

-- Assistant response 1
INSERT INTO messages (id, organization_id, conversation_id, user_id, message, role, status, created_at, processed_at)
VALUES (
  '66666666-6666-6666-6666-666666666662',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'I can help you with your laptop. What seems to be the issue?',
  'assistant',
  'completed',
  '2025-01-15T10:01:05.000Z',
  '2025-01-15T10:01:05.000Z'
);

-- User message 2
INSERT INTO messages (id, organization_id, conversation_id, user_id, message, role, status, created_at)
VALUES (
  '66666666-6666-6666-6666-666666666663',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'It keeps freezing when I open multiple applications',
  'user',
  'completed',
  '2025-01-15T10:02:00.000Z'
);

-- Assistant response 2
INSERT INTO messages (id, organization_id, conversation_id, user_id, message, role, status, created_at, processed_at)
VALUES (
  '66666666-6666-6666-6666-666666666664',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'That sounds like a memory issue. Let me check your system specifications and create a ticket for the IT team.',
  'assistant',
  'completed',
  '2025-01-15T10:02:05.000Z',
  '2025-01-15T10:02:05.000Z'
);
