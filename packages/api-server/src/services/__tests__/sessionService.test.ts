/**
 * sessionService.test.ts
 *
 * Regression tests for audit fixes in sessionService.
 * Each describe block maps to a specific issue that was fixed.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

// Mock modules that throw on import without env vars
vi.mock("../../config/kysely.js", () => ({ db: {} }));
vi.mock("../../config/logger.js", () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
	destroySessionService,
	getSessionService,
	SessionService,
	UserProvisioningError,
} from "../sessionService.js";
import {
	destroySessionStore,
	type Session,
	type SessionStore,
} from "../sessionStore.js";

// Helper: build a chainable Kysely mock that resolves to a value
function mockQueryBuilder(
	resolvedValue: unknown = undefined,
): Record<string, unknown> {
	const builder: Record<string, unknown> = {};
	const self: Record<string, unknown> = new Proxy(builder, {
		get(_target, prop) {
			if (prop === "executeTakeFirst")
				return () => Promise.resolve(resolvedValue);
			if (prop === "executeTakeFirstOrThrow")
				return () => Promise.resolve(resolvedValue);
			if (prop === "execute") return () => Promise.resolve(resolvedValue ?? []);
			// All other methods return the proxy for chaining
			return (): Record<string, unknown> => self;
		},
	});
	return self;
}

// Helper: create a mock Kysely DB
function createMockDb(overrides?: {
	selectResult?: unknown;
	insertResult?: unknown;
	updateResult?: unknown;
	transactionFn?: (trx: unknown) => Promise<unknown>;
}) {
	const trxProxy = {
		selectFrom: () => mockQueryBuilder(overrides?.selectResult),
		insertInto: () => mockQueryBuilder(overrides?.insertResult),
		updateTable: () => mockQueryBuilder(overrides?.updateResult),
		deleteFrom: () => mockQueryBuilder(),
	};

	return {
		selectFrom: vi.fn(() => mockQueryBuilder(overrides?.selectResult)),
		insertInto: vi.fn(() => mockQueryBuilder(overrides?.insertResult)),
		updateTable: vi.fn(() => mockQueryBuilder(overrides?.updateResult)),
		deleteFrom: vi.fn(() => mockQueryBuilder()),
		transaction: vi.fn(() => ({
			execute: vi.fn(async (fn: (trx: unknown) => Promise<unknown>) => {
				if (overrides?.transactionFn) {
					return overrides.transactionFn(trxProxy);
				}
				return fn(trxProxy);
			}),
		})),
	} as unknown;
}

// Helper: create a mock SessionStore
function createMockSessionStore(session?: Partial<Session>): SessionStore {
	const defaultSession: Session = {
		sessionId: "test-session-id",
		userId: "user-123",
		organizationId: "org-456",
		userEmail: "test@example.com",
		expiresAt: new Date(Date.now() + 86400000),
		createdAt: new Date(),
		lastAccessedAt: new Date(),
		...session,
	};
	return {
		createSession: vi.fn(async () => defaultSession),
		getSession: vi.fn(async () => defaultSession),
		getSessionByConversationId: vi.fn(async () => null),
		updateSession: vi.fn(async () => defaultSession),
		deleteSession: vi.fn(async () => true),
		deleteUserSessions: vi.fn(async () => 1),
		refreshSessionAccess: vi.fn(async () => defaultSession),
		cleanupExpiredSessions: vi.fn(async () => 0),
	};
}

describe("sessionService", () => {
	afterEach(() => {
		destroySessionService();
		destroySessionStore();
		vi.restoreAllMocks();
	});

	// ── Issue 3: Error cause preserved ──────────────────────────
	describe("Issue 3: UserProvisioningError preserves cause", () => {
		it("should store original error as cause", () => {
			const original = new Error("DB connection failed");
			const err = new UserProvisioningError("Failed to provision", original);

			expect(err.message).toBe("Failed to provision");
			expect(err.name).toBe("UserProvisioningError");
			expect(err.cause).toBe(original);
			expect(err).toBeInstanceOf(Error);
		});

		it("should preserve non-Error cause values", () => {
			const err = new UserProvisioningError("fail", "string-cause");
			expect(err.cause).toBe("string-cause");
		});
	});

	// ── Issue 11: Singleton cleanup ─────────────────────────────
	describe("Issue 11: destroySessionService resets singleton", () => {
		it("should return new instance after destroy", () => {
			const first = getSessionService();
			const same = getSessionService();
			expect(first).toBe(same);

			destroySessionService();
			const fresh = getSessionService();
			expect(fresh).not.toBe(first);
		});
	});

	// ── Issue 7: DI constructor injection ───────────────────────
	describe("Issue 7: dependency injection", () => {
		it("should use injected sessionStore", async () => {
			const mockStore = createMockSessionStore();
			const service = new SessionService({ sessionStore: mockStore });

			const session = await service.getValidSession("test-id");
			expect(mockStore.getSession).toHaveBeenCalledWith("test-id");
			expect(session).not.toBeNull();
		});

		it("should use injected db for findOrCreateUser", async () => {
			const mockDb = createMockDb({
				selectResult: {
					user_id: "user-123",
					email: "test@example.com",
					active_organization_id: "org-456",
					first_name: "John",
					last_name: "Doe",
				},
			});
			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			const result = await service.findOrCreateUser({
				sub: "kc-123",
				email: "test@example.com",
				given_name: "John",
				family_name: "Doe",
				iss: "",
				aud: "",
			});

			expect(result.id).toBe("user-123");
			expect(result.email).toBe("test@example.com");
			// Verify it used injected db, not the real one
			expect((mockDb as any).selectFrom).toHaveBeenCalled();
		});
	});

	// ── Issue 9: Null safety on active_organization_id ──────────
	describe("Issue 9: null safety on active_organization_id", () => {
		it("should throw when existing user has no active organization", async () => {
			const mockDb = createMockDb({
				selectResult: {
					user_id: "user-123",
					email: "test@example.com",
					active_organization_id: null, // null!
					first_name: "John",
					last_name: "Doe",
				},
			});
			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			await expect(
				service.findOrCreateUser({
					sub: "kc-123",
					email: "test@example.com",
					iss: "",
					aud: "",
				}),
			).rejects.toThrow("User has no active organization");
		});
	});

	// ── Issue 6: No redundant name query ────────────────────────
	describe("Issue 6: findOrCreateUser returns names", () => {
		it("should return firstName and lastName for existing user", async () => {
			const mockDb = createMockDb({
				selectResult: {
					user_id: "user-123",
					email: "test@example.com",
					active_organization_id: "org-456",
					first_name: "Jane",
					last_name: "Smith",
				},
			});
			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			const result = await service.findOrCreateUser({
				sub: "kc-123",
				email: "test@example.com",
				given_name: "Jane",
				family_name: "Smith",
				iss: "",
				aud: "",
			});

			expect(result.firstName).toBe("Jane");
			expect(result.lastName).toBe("Smith");
		});

		it("should return null names when DB has no names", async () => {
			const mockDb = createMockDb({
				selectResult: {
					user_id: "user-123",
					email: "test@example.com",
					active_organization_id: "org-456",
					first_name: null,
					last_name: null,
				},
			});
			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			const result = await service.findOrCreateUser({
				sub: "kc-123",
				email: "test@example.com",
				iss: "",
				aud: "",
			});

			expect(result.firstName).toBeNull();
			expect(result.lastName).toBeNull();
		});
	});

	// ── Issue 8: Cookie maxAge respects param ───────────────────
	describe("Issue 8: cookie maxAge from sessionDurationMs", () => {
		it("should use custom maxAgeMs when provided", () => {
			const service = new SessionService({
				sessionStore: createMockSessionStore(),
			});
			const cookie = service.generateSessionCookie("sess-id", 3600000);

			expect(cookie).toContain("Max-Age=3600");
			expect(cookie).toContain("rita_session=sess-id");
		});

		it("should default to 24h when maxAgeMs not provided", () => {
			const service = new SessionService({
				sessionStore: createMockSessionStore(),
			});
			const cookie = service.generateSessionCookie("sess-id");
			const expected24hSec = 24 * 60 * 60;

			expect(cookie).toContain(`Max-Age=${expected24hSec}`);
		});
	});

	// ── Issue 1 + 4: Transaction reads + race condition ─────────
	describe("Issue 1 + 4: stale reads and race condition", () => {
		it("should read pending data inside transaction via trx", async () => {
			const trxSelectFrom = vi.fn(() => mockQueryBuilder(undefined));
			const trxInsertInto = vi.fn(() =>
				mockQueryBuilder({ user_id: "new-user-id" }),
			);
			const trxUpdateTable = vi.fn(() => mockQueryBuilder());
			const trxDeleteFrom = vi.fn(() => mockQueryBuilder());

			const mockDb = {
				// First call: selectFrom("user_profiles") for existing user check → not found
				selectFrom: vi.fn(() => mockQueryBuilder(undefined)),
				transaction: vi.fn(() => ({
					execute: vi.fn(async (fn: any) => {
						const trx = {
							selectFrom: trxSelectFrom,
							insertInto: trxInsertInto,
							updateTable: trxUpdateTable,
							deleteFrom: trxDeleteFrom,
						};
						// Override insertInto for organizations to return id
						trxInsertInto
							.mockReturnValueOnce(mockQueryBuilder({ user_id: "new-user-id" })) // user_profiles insert
							.mockReturnValueOnce(mockQueryBuilder({ id: "org-new" })); // organizations insert
						trxSelectFrom
							.mockReturnValueOnce(mockQueryBuilder({ company: "TestCo" })) // pending_users
							.mockReturnValueOnce(mockQueryBuilder([])); // pending_invitations (returns array)
						return fn(trx);
					}),
				})),
			};

			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			// This calls findOrCreateUser which should use trx inside transaction
			try {
				await service.findOrCreateUser({
					sub: "kc-new",
					email: "new@example.com",
					given_name: "New",
					family_name: "User",
					iss: "",
					aud: "",
				});
			} catch (e) {
				expect(e).toBeInstanceOf(Error);
			}

			// Key assertion: transaction was called (reads happen inside it)
			expect(mockDb.transaction).toHaveBeenCalled();
			// trxSelectFrom was called for pending_users and pending_invitations
			expect(trxSelectFrom).toHaveBeenCalled();
		});
	});

	// ── Bug: backfillUserNames overwrites existing names with null ──
	describe("backfillUserNames should not overwrite existing names with null", () => {
		it("should only fill missing last_name without overwriting existing first_name", async () => {
			// DB has first_name="John", last_name=null
			// Token has firstName=null, lastName="Doe"
			// Expected: UPDATE sets only last_name="Doe", first_name stays "John"
			const setCalls: Record<string, unknown>[] = [];
			const captureSetMock = () => {
				const builder: Record<string, unknown> = {};
				const self: Record<string, unknown> = new Proxy(builder, {
					get(_target, prop) {
						if (prop === "set")
							return (val: Record<string, unknown>) => {
								setCalls.push(val);
								return self;
							};
						if (prop === "executeTakeFirst")
							return () => Promise.resolve(undefined);
						if (prop === "executeTakeFirstOrThrow")
							return () => Promise.resolve(undefined);
						if (prop === "execute") return () => Promise.resolve([]);
						return () => self;
					},
				});
				return self;
			};

			const mockDb = {
				selectFrom: vi.fn(() =>
					mockQueryBuilder({
						user_id: "user-123",
						email: "john@example.com",
						active_organization_id: "org-456",
						first_name: "John",
						last_name: null,
					}),
				),
				updateTable: vi.fn(() => captureSetMock()),
			};

			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			await service.findOrCreateUser({
				sub: "kc-123",
				email: "john@example.com",
				given_name: undefined, // token has no first name
				family_name: "Doe",
				iss: "",
				aud: "",
			});

			// backfill should have been called
			expect(mockDb.updateTable).toHaveBeenCalled();
			// The SET should NOT contain first_name: null (would overwrite "John")
			expect(setCalls).toHaveLength(1);
			expect(setCalls[0]).not.toHaveProperty("first_name");
			expect(setCalls[0]).toEqual({ last_name: "Doe" });
		});

		it("should only fill missing first_name without overwriting existing last_name", async () => {
			// DB has first_name=null, last_name="Smith"
			// Token has firstName="Jane", lastName=null
			const setCalls: Record<string, unknown>[] = [];
			const captureSetMock = () => {
				const builder: Record<string, unknown> = {};
				const self: Record<string, unknown> = new Proxy(builder, {
					get(_target, prop) {
						if (prop === "set")
							return (val: Record<string, unknown>) => {
								setCalls.push(val);
								return self;
							};
						if (prop === "executeTakeFirst")
							return () => Promise.resolve(undefined);
						if (prop === "executeTakeFirstOrThrow")
							return () => Promise.resolve(undefined);
						if (prop === "execute") return () => Promise.resolve([]);
						return () => self;
					},
				});
				return self;
			};

			const mockDb = {
				selectFrom: vi.fn(() =>
					mockQueryBuilder({
						user_id: "user-456",
						email: "jane@example.com",
						active_organization_id: "org-789",
						first_name: null,
						last_name: "Smith",
					}),
				),
				updateTable: vi.fn(() => captureSetMock()),
			};

			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			await service.findOrCreateUser({
				sub: "kc-456",
				email: "jane@example.com",
				given_name: "Jane",
				family_name: undefined,
				iss: "",
				aud: "",
			});

			expect(mockDb.updateTable).toHaveBeenCalled();
			expect(setCalls).toHaveLength(1);
			expect(setCalls[0]).not.toHaveProperty("last_name");
			expect(setCalls[0]).toEqual({ first_name: "Jane" });
		});
	});

	// ── Bug: stale data returned after backfill ─────────────────
	describe("findOrCreateUser should return fresh names after backfill", () => {
		it("should return backfilled names, not stale DB values", async () => {
			// DB has first_name=null, last_name=null
			// Token has firstName="Alice", lastName="Wonder"
			// After backfill, return should show "Alice"/"Wonder", not null/null
			const mockDb = createMockDb({
				selectResult: {
					user_id: "user-789",
					email: "alice@example.com",
					active_organization_id: "org-abc",
					first_name: null,
					last_name: null,
				},
			});

			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			const result = await service.findOrCreateUser({
				sub: "kc-789",
				email: "alice@example.com",
				given_name: "Alice",
				family_name: "Wonder",
				iss: "",
				aud: "",
			});

			// Bug: currently returns null/null (stale existingUser values)
			expect(result.firstName).toBe("Alice");
			expect(result.lastName).toBe("Wonder");
		});

		it("should preserve existing DB names when token has no names", async () => {
			// DB has both names, token has none → no backfill, return DB values
			const mockDb = createMockDb({
				selectResult: {
					user_id: "user-aaa",
					email: "bob@example.com",
					active_organization_id: "org-bbb",
					first_name: "Bob",
					last_name: "Builder",
				},
			});

			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			const result = await service.findOrCreateUser({
				sub: "kc-aaa",
				email: "bob@example.com",
				given_name: undefined,
				family_name: undefined,
				iss: "",
				aud: "",
			});

			expect(result.firstName).toBe("Bob");
			expect(result.lastName).toBe("Builder");
		});
	});

	// ── Issue 3: Error wrapping in findOrCreateUser ─────────────
	describe("Issue 3: error wrapping in provisioning", () => {
		it("should wrap transaction errors in UserProvisioningError with cause", async () => {
			const dbError = new Error("unique_violation");
			const mockDb = {
				selectFrom: vi.fn(() => mockQueryBuilder(undefined)), // no existing user
				transaction: vi.fn(() => ({
					execute: vi.fn(async () => {
						throw dbError;
					}),
				})),
			};

			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			try {
				await service.findOrCreateUser({
					sub: "kc-fail",
					email: "fail@example.com",
					iss: "",
					aud: "",
				});
				expect.fail("Should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(UserProvisioningError);
				expect((error as UserProvisioningError).cause).toBe(dbError);
				expect((error as UserProvisioningError).message).toBe(
					"Failed to provision new user.",
				);
			}
		});
	});
});
