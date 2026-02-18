/**
 * sessionService.test.ts
 *
 * Tests for SessionService bug fixes:
 * - Cookie Max-Age (seconds vs milliseconds)
 * - Name backfill (overwrites existing names)
 * - Null active_organization_id handling
 * - Cookie/session duration mismatch
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before imports
const { mockDb, mockSessionStore, mockJose } = vi.hoisted(() => {
	const mockDb = {
		selectFrom: vi.fn(),
		insertInto: vi.fn(),
		updateTable: vi.fn(),
		deleteFrom: vi.fn(),
		transaction: vi.fn(),
	};

	const mockSessionStore = {
		createSession: vi.fn(),
		getSession: vi.fn(),
		updateSession: vi.fn(),
		deleteSession: vi.fn(),
		deleteUserSessions: vi.fn(),
		refreshSessionAccess: vi.fn(),
		cleanupExpiredSessions: vi.fn(),
	};

	const mockJose = {
		jwtVerify: vi.fn(),
		createRemoteJWKSet: vi.fn().mockReturnValue("mock-jwks"),
	};

	return { mockDb, mockSessionStore, mockJose };
});

vi.mock("../../config/kysely.js", () => ({
	db: mockDb,
}));

vi.mock("../sessionStore.js", () => ({
	getSessionStore: vi.fn(() => mockSessionStore),
}));

vi.mock("jose", () => ({
	jwtVerify: mockJose.jwtVerify,
	createRemoteJWKSet: mockJose.createRemoteJWKSet,
}));

vi.mock("../../config/logger.js", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

import { SessionService } from "../sessionService.js";

describe("SessionService", () => {
	let service: SessionService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new SessionService();
	});

	describe("Bug #1: generateSessionCookie Max-Age uses milliseconds instead of seconds", () => {
		it("should set Max-Age in seconds (86400 for 24h), not milliseconds", () => {
			const cookie = service.generateSessionCookie("test-session-id");
			const maxAgeMatch = cookie.match(/Max-Age=(\d+)/);

			expect(maxAgeMatch).not.toBeNull();
			const maxAge = Number(maxAgeMatch![1]);

			// Max-Age should be 86400 seconds (24 hours), NOT 86400000 milliseconds
			expect(maxAge).toBe(86400);
			expect(maxAge).not.toBe(86400000);
		});

		it("should produce a cookie that expires in ~24 hours, not ~1000 days", () => {
			const cookie = service.generateSessionCookie("test-session-id");
			const maxAgeMatch = cookie.match(/Max-Age=(\d+)/);
			const maxAgeSeconds = Number(maxAgeMatch![1]);

			// 24 hours = 86400 seconds. Must be less than 7 days (604800s) at most.
			expect(maxAgeSeconds).toBeLessThanOrEqual(604800);
		});
	});

	describe("Bug #2: Name backfill overwrites existing names with null", () => {
		/**
		 * Scenario: User has first_name="John" but last_name=null.
		 * Token has firstName=null but lastName="Smith".
		 * Bug: The update sets BOTH fields, overwriting "John" with null.
		 * Expected: Only the missing field (last_name) should be updated.
		 */
		it("should NOT overwrite existing first_name when only last_name is missing", async () => {
			// Setup: existing user with first_name but no last_name
			const existingUser = {
				user_id: "user-123",
				active_organization_id: "org-456",
				email: "test@example.com",
				first_name: "John",
				last_name: null,
			};

			// Build chainable mock for selectFrom
			const selectChain: Record<string, any> = {};
			selectChain.select = vi.fn().mockReturnValue(selectChain);
			selectChain.where = vi.fn().mockReturnValue(selectChain);
			selectChain.executeTakeFirst = vi.fn().mockResolvedValue(existingUser);
			mockDb.selectFrom.mockReturnValue(selectChain);

			// Track what gets passed to .set() in the update
			let updateSetArg: any = null;
			const updateChain: Record<string, any> = {};
			updateChain.set = vi.fn().mockImplementation((arg: any) => {
				updateSetArg = arg;
				return updateChain;
			});
			updateChain.where = vi.fn().mockReturnValue(updateChain);
			updateChain.execute = vi.fn().mockResolvedValue([]);
			mockDb.updateTable.mockReturnValue(updateChain);

			// Token payload: has last_name but NOT first_name
			const tokenPayload = {
				sub: "kc-123",
				email: "test@example.com",
				given_name: undefined, // no first name in token
				family_name: "Smith",
			};

			await service.findOrCreateUser(tokenPayload as any);

			// Update should have been called (last_name was missing and token has it)
			expect(updateSetArg).not.toBeNull();
			// The update must only contain last_name, NOT first_name
			expect(updateSetArg.last_name).toBe("Smith");
			expect(updateSetArg).not.toHaveProperty("first_name");
		});

		it("should NOT overwrite existing last_name when only first_name is missing", async () => {
			const existingUser = {
				user_id: "user-123",
				active_organization_id: "org-456",
				email: "test@example.com",
				first_name: null,
				last_name: "Doe",
			};

			const selectChain: Record<string, any> = {};
			selectChain.select = vi.fn().mockReturnValue(selectChain);
			selectChain.where = vi.fn().mockReturnValue(selectChain);
			selectChain.executeTakeFirst = vi.fn().mockResolvedValue(existingUser);
			mockDb.selectFrom.mockReturnValue(selectChain);

			let updateSetArg: any = null;
			const updateChain: Record<string, any> = {};
			updateChain.set = vi.fn().mockImplementation((arg: any) => {
				updateSetArg = arg;
				return updateChain;
			});
			updateChain.where = vi.fn().mockReturnValue(updateChain);
			updateChain.execute = vi.fn().mockResolvedValue([]);
			mockDb.updateTable.mockReturnValue(updateChain);

			const tokenPayload = {
				sub: "kc-123",
				email: "test@example.com",
				given_name: "Jane",
				family_name: undefined, // no last name in token
			};

			await service.findOrCreateUser(tokenPayload as any);

			// Update should have been called (first_name was missing and token has it)
			expect(updateSetArg).not.toBeNull();
			// The update must only contain first_name, NOT last_name
			expect(updateSetArg.first_name).toBe("Jane");
			expect(updateSetArg).not.toHaveProperty("last_name");
		});

		it("should not update if both names already exist", async () => {
			const existingUser = {
				user_id: "user-123",
				active_organization_id: "org-456",
				email: "test@example.com",
				first_name: "John",
				last_name: "Doe",
			};

			const selectChain: Record<string, any> = {};
			selectChain.select = vi.fn().mockReturnValue(selectChain);
			selectChain.where = vi.fn().mockReturnValue(selectChain);
			selectChain.executeTakeFirst = vi.fn().mockResolvedValue(existingUser);
			mockDb.selectFrom.mockReturnValue(selectChain);

			const tokenPayload = {
				sub: "kc-123",
				email: "test@example.com",
				given_name: "Different",
				family_name: "Name",
			};

			await service.findOrCreateUser(tokenPayload as any);

			// Should NOT call updateTable at all — both names exist
			expect(mockDb.updateTable).not.toHaveBeenCalled();
		});
	});

	describe("Bug #3: Null active_organization_id cast to string", () => {
		it("should throw when active_organization_id is null", async () => {
			const existingUser = {
				user_id: "user-123",
				active_organization_id: null,
				email: "test@example.com",
				first_name: "John",
				last_name: "Doe",
			};

			const selectChain: Record<string, any> = {};
			selectChain.select = vi.fn().mockReturnValue(selectChain);
			selectChain.where = vi.fn().mockReturnValue(selectChain);
			selectChain.executeTakeFirst = vi.fn().mockResolvedValue(existingUser);
			mockDb.selectFrom.mockReturnValue(selectChain);

			const tokenPayload = {
				sub: "kc-123",
				email: "test@example.com",
				given_name: "John",
				family_name: "Doe",
			};

			// Should throw rather than silently returning null cast as string
			await expect(
				service.findOrCreateUser(tokenPayload as any),
			).rejects.toThrow("no active organization");
		});
	});

	describe("Bug #4: Cookie duration mismatch with session duration", () => {
		it("should use session duration for cookie Max-Age when provided", async () => {
			const fourHoursMs = 4 * 60 * 60 * 1000;

			// Setup mocks for createSessionFromKeycloak
			mockJose.jwtVerify.mockResolvedValue({
				payload: {
					sub: "kc-123",
					email: "test@example.com",
					given_name: "John",
					family_name: "Doe",
				},
			});

			// Mock findOrCreateUser path (existing user)
			const selectChain: Record<string, any> = {};
			selectChain.select = vi.fn().mockReturnValue(selectChain);
			selectChain.where = vi.fn().mockReturnValue(selectChain);
			selectChain.executeTakeFirst = vi.fn();
			// First call: user_profiles lookup by keycloak_id
			selectChain.executeTakeFirst.mockResolvedValueOnce({
				user_id: "user-123",
				active_organization_id: "org-456",
				email: "test@example.com",
				first_name: "John",
				last_name: "Doe",
			});
			// Second call: user_profiles for firstName/lastName
			selectChain.executeTakeFirst.mockResolvedValueOnce({
				first_name: "John",
				last_name: "Doe",
			});
			mockDb.selectFrom.mockReturnValue(selectChain);

			mockSessionStore.createSession.mockResolvedValue({
				sessionId: "test-session-id",
				userId: "user-123",
				organizationId: "org-456",
				userEmail: "test@example.com",
			});

			const result = await service.createSessionFromKeycloak(
				"fake-jwt-token",
				fourHoursMs,
			);

			const maxAgeMatch = result.cookie.match(/Max-Age=(\d+)/);
			const maxAgeSeconds = Number(maxAgeMatch![1]);

			// Cookie should expire at the same time as the session (4 hours = 14400 seconds)
			const fourHoursSeconds = 4 * 60 * 60;
			expect(maxAgeSeconds).toBe(fourHoursSeconds);
		});

		it("should default to 24h when no custom duration provided", () => {
			const cookie = service.generateSessionCookie("test-session-id");
			const maxAgeMatch = cookie.match(/Max-Age=(\d+)/);
			const maxAgeSeconds = Number(maxAgeMatch![1]);
			expect(maxAgeSeconds).toBe(86400);
		});
	});

	describe("generateDestroySessionCookie", () => {
		it("should generate a cookie with Max-Age=0", () => {
			const cookie = service.generateDestroySessionCookie();
			expect(cookie).toContain("Max-Age=0");
			expect(cookie).toContain("rita_session=");
		});
	});

	describe("parseSessionIdFromCookie", () => {
		it("should parse session ID from valid cookie header", () => {
			const sessionId = service.parseSessionIdFromCookie(
				"rita_session=abc123; other=value",
			);
			expect(sessionId).toBe("abc123");
		});

		it("should return null for missing cookie header", () => {
			expect(service.parseSessionIdFromCookie(undefined)).toBeNull();
		});

		it("should return null when rita_session is not present", () => {
			expect(service.parseSessionIdFromCookie("other=value")).toBeNull();
		});
	});
});
