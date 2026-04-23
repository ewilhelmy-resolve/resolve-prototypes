/**
 * Deterministic test data constants for e2e validation.
 *
 * All IDs are fixed so agents can hardcode them in Playwright CLI workflows.
 * These must match the Keycloak realm-export.json user IDs and base.sql seed data.
 */

// ── Organizations ──────────────────────────────────────────────────────────────
export const TEST_ORG_ID = "11111111-1111-1111-1111-111111111111";
export const TEST_ORG_NAME = "Test Organization";

/** Public system org (created by migration 140) */
export const PUBLIC_ORG_ID = "00000000-0000-0000-0000-000000000001";

// ── Users ──────────────────────────────────────────────────────────────────────

/** Owner user — matches Keycloak testuser */
export const TEST_OWNER = {
	userId: "22222222-2222-2222-2222-222222222222",
	keycloakId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
	email: "testuser@example.com",
	username: "testuser",
	password: "test",
	firstName: "Test",
	lastName: "User",
	role: "owner" as const,
};

/** Member user — matches Keycloak testmember */
export const TEST_MEMBER = {
	userId: "33333333-3333-3333-3333-333333333333",
	keycloakId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
	email: "testmember@example.com",
	username: "testmember",
	password: "test",
	firstName: "Test",
	lastName: "Member",
	role: "member" as const,
};

/** Public guest user (created by migration 140) */
export const PUBLIC_GUEST_USER_ID = "00000000-0000-0000-0000-000000000002";

// ── Conversations ──────────────────────────────────────────────────────────────
export const TEST_CONVERSATION_1 = {
	id: "44444444-4444-4444-4444-444444444444",
	title: "Test Conversation 1",
};

export const TEST_CONVERSATION_2 = {
	id: "55555555-5555-5555-5555-555555555555",
	title: "Test Conversation 2",
};

// ── Messages (deterministic IDs for conversation 1) ────────────────────────────
export const TEST_MESSAGES = {
	userMsg1: "66666666-6666-6666-6666-666666666661",
	assistantMsg1: "66666666-6666-6666-6666-666666666662",
	userMsg2: "66666666-6666-6666-6666-666666666663",
	assistantMsg2: "66666666-6666-6666-6666-666666666664",
};

// ── Timestamps (fixed for determinism) ─────────────────────────────────────────
export const SEED_TIMESTAMP = "2025-01-15T10:00:00.000Z";
