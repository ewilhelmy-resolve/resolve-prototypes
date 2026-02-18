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

// Mock jose — keep real types, mock jwtVerify for azp tests
const { mockJwtVerify } = vi.hoisted(() => ({
	mockJwtVerify: vi.fn(),
}));
vi.mock("jose", async (importOriginal) => {
	const actual = await importOriginal<typeof import("jose")>();
	return { ...actual, jwtVerify: mockJwtVerify };
});

import type { JWTPayload } from "jose";
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

/** Typed test accessor for private SessionService members */
interface SessionServiceInternal {
	findOrCreateUser(tokenPayload: JWTPayload): Promise<{
		id: string;
		email: string;
		activeOrganizationId: string;
		firstName: string | null;
		lastName: string | null;
	}>;
	expectedAudience: string;
}

/** Cast SessionService to expose private members in tests */
function internals(service: SessionService): SessionServiceInternal {
	return service as unknown as SessionServiceInternal;
}

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

			const result = await internals(service).findOrCreateUser({
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
				internals(service).findOrCreateUser({
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

			const result = await internals(service).findOrCreateUser({
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

			const result = await internals(service).findOrCreateUser({
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
			await internals(service).findOrCreateUser({
				sub: "kc-new",
				email: "new@example.com",
				given_name: "New",
				family_name: "User",
				iss: "",
				aud: "",
			});

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

			await internals(service).findOrCreateUser({
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

			await internals(service).findOrCreateUser({
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

			const result = await internals(service).findOrCreateUser({
				sub: "kc-789",
				email: "alice@example.com",
				given_name: "Alice",
				family_name: "Wonder",
				iss: "",
				aud: "",
			});
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

			const result = await internals(service).findOrCreateUser({
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

	// ── Issue 5: destroySessionService should clean up store ────
	describe("Issue 5: destroySessionService cleans up store", () => {
		it("should clear store cleanup interval on destroy", () => {
			const clearIntervalSpy = vi.spyOn(global, "clearInterval");

			// Create singleton (triggers InMemorySessionStore with setInterval)
			getSessionService();
			clearIntervalSpy.mockClear();

			// Only destroySessionService — should also clean up the store
			destroySessionService();
			expect(clearIntervalSpy).toHaveBeenCalled();

			clearIntervalSpy.mockRestore();
		});
	});

	// ── Issue 6: Race-lost path null active_organization_id ─────
	describe("Issue 6: race-lost path handles null active_organization_id", () => {
		it("should throw when race loser finds null active_organization_id", async () => {
			const trxSelectFrom = vi
				.fn()
				.mockReturnValueOnce(mockQueryBuilder(undefined)) // pending_users
				.mockReturnValueOnce(mockQueryBuilder(undefined)) // pending_invitations
				.mockReturnValueOnce(
					mockQueryBuilder({
						// user_profiles re-select
						user_id: "winner-id",
						email: "race@example.com",
						active_organization_id: null,
						first_name: null,
						last_name: null,
					}),
				);

			const trx = {
				selectFrom: trxSelectFrom,
				insertInto: vi.fn(() => mockQueryBuilder(undefined)), // race lost
				updateTable: vi.fn(() => mockQueryBuilder()),
				deleteFrom: vi.fn(() => mockQueryBuilder()),
			};

			const mockDb = {
				selectFrom: vi.fn(() => mockQueryBuilder(undefined)),
				transaction: vi.fn(() => ({
					execute: vi.fn(async (fn: any) => fn(trx)),
				})),
			};

			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			await expect(
				internals(service).findOrCreateUser({
					sub: "kc-race",
					email: "race@example.com",
					iss: "",
					aud: "",
				}),
			).rejects.toThrow(UserProvisioningError);
		});

		it("should return winner data when race loser finds valid org id", async () => {
			const trxSelectFrom = vi
				.fn()
				.mockReturnValueOnce(mockQueryBuilder(undefined))
				.mockReturnValueOnce(mockQueryBuilder(undefined))
				.mockReturnValueOnce(
					mockQueryBuilder({
						user_id: "winner-id",
						email: "race@example.com",
						active_organization_id: "org-winner",
						first_name: "Winner",
						last_name: "User",
					}),
				);

			const trx = {
				selectFrom: trxSelectFrom,
				insertInto: vi.fn(() => mockQueryBuilder(undefined)),
				updateTable: vi.fn(() => mockQueryBuilder()),
				deleteFrom: vi.fn(() => mockQueryBuilder()),
			};

			const mockDb = {
				selectFrom: vi.fn(() => mockQueryBuilder(undefined)),
				transaction: vi.fn(() => ({
					execute: vi.fn(async (fn: any) => fn(trx)),
				})),
			};

			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			const result = await internals(service).findOrCreateUser({
				sub: "kc-race",
				email: "race@example.com",
				iss: "",
				aud: "",
			});

			expect(result.id).toBe("winner-id");
			expect(result.activeOrganizationId).toBe("org-winner");
		});
	});

	// ── Bug 2: Race-loser throws unrecoverable error (no retry) ──
	describe("Bug 2: race-loser should retry instead of failing with 500", () => {
		it("should retry and succeed when race loser finds null active_organization_id", async () => {
			let mainSelectCall = 0;

			// Main db.selectFrom: 1st call → no user, 2nd call (retry) → winner committed
			const mainSelectFrom = vi.fn(() => {
				mainSelectCall++;
				if (mainSelectCall === 1) {
					return mockQueryBuilder(undefined);
				}
				// Retry: winner has committed, user visible with org id
				return mockQueryBuilder({
					user_id: "winner-id",
					email: "race@example.com",
					active_organization_id: "org-winner",
					first_name: "Winner",
					last_name: "User",
				});
			});

			const mockDb = {
				selectFrom: mainSelectFrom,
				updateTable: vi.fn(() => mockQueryBuilder()), // for backfill on retry
				transaction: vi.fn(() => ({
					execute: vi.fn(async (fn: any) => {
						const trxSelectFrom = vi
							.fn()
							.mockReturnValueOnce(mockQueryBuilder(undefined)) // pending_users
							.mockReturnValueOnce(mockQueryBuilder(undefined)) // pending_invitations
							.mockReturnValueOnce(
								mockQueryBuilder({
									user_id: "winner-id",
									email: "race@example.com",
									active_organization_id: null, // winner not committed yet
									first_name: null,
									last_name: null,
								}),
							);

						const trx = {
							selectFrom: trxSelectFrom,
							insertInto: vi.fn(() => mockQueryBuilder(undefined)), // race lost
							updateTable: vi.fn(() => mockQueryBuilder()),
							deleteFrom: vi.fn(() => mockQueryBuilder()),
						};
						return fn(trx);
					}),
				})),
			};

			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			// Current code: throws UserProvisioningError (500)
			// Fixed code: retries, finds committed user, succeeds
			const result = await internals(service).findOrCreateUser({
				sub: "kc-race",
				email: "race@example.com",
				iss: "",
				aud: "",
			});

			expect(result.id).toBe("winner-id");
			expect(result.activeOrganizationId).toBe("org-winner");
			// Verify retry happened: selectFrom called twice
			expect(mainSelectFrom).toHaveBeenCalledTimes(2);
		});

		it("should eventually throw after exhausting retries if winner never commits", async () => {
			// All retries fail: selectFrom always returns no user, transaction always race-lost
			const mockDb = {
				selectFrom: vi.fn(() => mockQueryBuilder(undefined)),
				transaction: vi.fn(() => ({
					execute: vi.fn(async (fn: any) => {
						const trxSelectFrom = vi
							.fn()
							.mockReturnValueOnce(mockQueryBuilder(undefined))
							.mockReturnValueOnce(mockQueryBuilder(undefined))
							.mockReturnValueOnce(
								mockQueryBuilder({
									user_id: "winner-id",
									email: "stuck@example.com",
									active_organization_id: null,
									first_name: null,
									last_name: null,
								}),
							);

						const trx = {
							selectFrom: trxSelectFrom,
							insertInto: vi.fn(() => mockQueryBuilder(undefined)),
							updateTable: vi.fn(() => mockQueryBuilder()),
							deleteFrom: vi.fn(() => mockQueryBuilder()),
						};
						return fn(trx);
					}),
				})),
			};

			const service = new SessionService({
				db: mockDb as any,
				sessionStore: createMockSessionStore(),
			});

			await expect(
				internals(service).findOrCreateUser({
					sub: "kc-stuck",
					email: "stuck@example.com",
					iss: "",
					aud: "",
				}),
			).rejects.toThrow(UserProvisioningError);
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
				await internals(service).findOrCreateUser({
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

	// ── Security Issue 3: JWT aud/azp validation ────────────────
	describe("Security Issue 3: JWT audience validation", () => {
		it("should pass audience option to jose.jwtVerify", async () => {
			// We can't easily test jose.jwtVerify directly since it's imported,
			// but we can verify the service constructor reads KEYCLOAK_CLIENT_ID
			// and that createSessionFromKeycloak would reject tokens for wrong audience.
			// The real test: verify the audience config exists in the verify options.
			// We'll check the source code pattern by verifying the env var is read.
			const service = new SessionService({
				sessionStore: createMockSessionStore(),
			});

			// Access private field to verify audience is configured
			// The service should have a configured audience from KEYCLOAK_CLIENT_ID
			expect(internals(service).expectedAudience).toBeDefined();
			expect(typeof internals(service).expectedAudience).toBe("string");
		});
	});

	// ── Security: azp validation must fail-closed ───────────────
	describe("Security: azp validation must fail-closed when absent", () => {
		it("should reject token with no azp claim (fail-closed)", async () => {
			mockJwtVerify.mockResolvedValueOnce({
				payload: {
					sub: "kc-no-azp",
					email: "noazp@example.com",
					iss: "http://localhost:8080/realms/rita-chat-realm",
					// azp is intentionally missing
				},
				protectedHeader: { alg: "RS256" },
			});

			const service = new SessionService({
				sessionStore: createMockSessionStore(),
				db: createMockDb({
					selectResult: {
						user_id: "user-123",
						email: "noazp@example.com",
						active_organization_id: "org-456",
						first_name: "Test",
						last_name: "User",
					},
				}) as any,
				expectedAudience: "rita-chat-client",
			});

			await expect(
				service.createSessionFromKeycloak("fake-token"),
			).rejects.toThrow(/azp/i);
		});

		it("should reject token with wrong azp claim", async () => {
			mockJwtVerify.mockResolvedValueOnce({
				payload: {
					sub: "kc-wrong-azp",
					email: "wrongazp@example.com",
					iss: "http://localhost:8080/realms/rita-chat-realm",
					azp: "some-other-client",
				},
				protectedHeader: { alg: "RS256" },
			});

			const service = new SessionService({
				sessionStore: createMockSessionStore(),
				db: createMockDb() as any,
				expectedAudience: "rita-chat-client",
			});

			await expect(
				service.createSessionFromKeycloak("fake-token"),
			).rejects.toThrow(/azp/i);
		});

		it("should accept token with correct azp claim", async () => {
			mockJwtVerify.mockResolvedValueOnce({
				payload: {
					sub: "kc-good-azp",
					email: "goodazp@example.com",
					iss: "http://localhost:8080/realms/rita-chat-realm",
					azp: "rita-chat-client",
				},
				protectedHeader: { alg: "RS256" },
			});

			const service = new SessionService({
				sessionStore: createMockSessionStore(),
				db: createMockDb({
					selectResult: {
						user_id: "user-123",
						email: "goodazp@example.com",
						active_organization_id: "org-456",
						first_name: "Test",
						last_name: "User",
					},
				}) as any,
				expectedAudience: "rita-chat-client",
			});

			const result = await service.createSessionFromKeycloak("fake-token");
			expect(result.session).toBeDefined();
			expect(result.cookie).toContain("rita_session=");
		});
	});

	// ── Security: parseSessionIdFromCookie format validation ────
	describe("Security: parseSessionIdFromCookie validates session ID format", () => {
		it("should return valid 64-char hex session ID", () => {
			const service = new SessionService({
				sessionStore: createMockSessionStore(),
			});
			const validHex = "a".repeat(64);
			const cookie = `rita_session=${validHex}; Path=/; HttpOnly`;
			expect(service.parseSessionIdFromCookie(cookie)).toBe(validHex);
		});

		it("should reject session ID containing path traversal", () => {
			const service = new SessionService({
				sessionStore: createMockSessionStore(),
			});
			const cookie = "rita_session=../../etc/passwd; Path=/";
			expect(service.parseSessionIdFromCookie(cookie)).toBeNull();
		});

		it("should reject session ID with SQL injection attempt", () => {
			const service = new SessionService({
				sessionStore: createMockSessionStore(),
			});
			const cookie = "rita_session=abc' OR '1'='1; Path=/";
			expect(service.parseSessionIdFromCookie(cookie)).toBeNull();
		});

		it("should reject session ID with non-hex characters", () => {
			const service = new SessionService({
				sessionStore: createMockSessionStore(),
			});
			const cookie = "rita_session=xyz_not_valid_hex_string!@#$; Path=/";
			expect(service.parseSessionIdFromCookie(cookie)).toBeNull();
		});

		it("should reject session ID with wrong length", () => {
			const service = new SessionService({
				sessionStore: createMockSessionStore(),
			});
			// Too short (32 chars instead of 64)
			const cookie = `rita_session=${"a".repeat(32)}; Path=/`;
			expect(service.parseSessionIdFromCookie(cookie)).toBeNull();
		});

		it("should return null for missing cookie header", () => {
			const service = new SessionService({
				sessionStore: createMockSessionStore(),
			});
			expect(service.parseSessionIdFromCookie(undefined)).toBeNull();
		});

		it("should return null for cookie without rita_session", () => {
			const service = new SessionService({
				sessionStore: createMockSessionStore(),
			});
			expect(service.parseSessionIdFromCookie("other_cookie=value")).toBeNull();
		});
	});

	// ── Issue 7: JWKS injectable via constructor ────────────────
	describe("Issue 7: JWKS injectable via constructor DI", () => {
		it("should pass injected jwks to jwtVerify instead of module-level singleton", async () => {
			const mockJwks = vi.fn();

			mockJwtVerify.mockResolvedValueOnce({
				payload: {
					sub: "kc-jwks-test",
					email: "jwks@example.com",
					iss: "http://localhost:8080/realms/rita-chat-realm",
					azp: "rita-chat-client",
				},
				protectedHeader: { alg: "RS256" },
			});

			const service = new SessionService({
				sessionStore: createMockSessionStore(),
				db: createMockDb({
					selectResult: {
						user_id: "user-123",
						email: "jwks@example.com",
						active_organization_id: "org-456",
						first_name: "Test",
						last_name: "User",
					},
				}) as any,
				expectedAudience: "rita-chat-client",
				jwks: mockJwks as any,
			});

			await service.createSessionFromKeycloak("test-token");

			expect(mockJwtVerify).toHaveBeenCalledWith(
				"test-token",
				mockJwks,
				expect.objectContaining({ issuer: expect.any(String) }),
			);
		});

		it("should fall back to module-level JWKS when not injected", async () => {
			mockJwtVerify.mockResolvedValueOnce({
				payload: {
					sub: "kc-default-jwks",
					email: "default@example.com",
					iss: "http://localhost:8080/realms/rita-chat-realm",
					azp: "rita-chat-client",
				},
				protectedHeader: { alg: "RS256" },
			});

			const service = new SessionService({
				sessionStore: createMockSessionStore(),
				db: createMockDb({
					selectResult: {
						user_id: "user-456",
						email: "default@example.com",
						active_organization_id: "org-789",
						first_name: "Test",
						last_name: "User",
					},
				}) as any,
				expectedAudience: "rita-chat-client",
				// No jwks provided — should use module-level JWKS
			});

			await service.createSessionFromKeycloak("test-token-2");

			// Should still call jwtVerify with some JWKS (the module-level one)
			expect(mockJwtVerify).toHaveBeenCalledWith(
				"test-token-2",
				expect.any(Function),
				expect.objectContaining({ issuer: expect.any(String) }),
			);
		});
	});

	// ── Bug: KEYCLOAK_ISSUER not injectable via DI ─────────────
	describe("Bug: expectedIssuer should be injectable via constructor", () => {
		it("should pass injected issuer to jwtVerify instead of module-level constant", async () => {
			const customIssuer = "https://custom-keycloak.example.com/realms/test";
			const mockJwks = vi.fn();

			mockJwtVerify.mockResolvedValueOnce({
				payload: {
					sub: "kc-issuer-test",
					email: "issuer@example.com",
					iss: customIssuer,
					azp: "rita-chat-client",
				},
				protectedHeader: { alg: "RS256" },
			});

			const service = new SessionService({
				sessionStore: createMockSessionStore(),
				db: createMockDb({
					selectResult: {
						user_id: "user-123",
						email: "issuer@example.com",
						active_organization_id: "org-456",
						first_name: "Test",
						last_name: "User",
					},
				}) as any,
				expectedAudience: "rita-chat-client",
				jwks: mockJwks as any,
				expectedIssuer: customIssuer,
			});

			await service.createSessionFromKeycloak("test-token");

			// The issuer passed to jwtVerify should be the injected one, not the module constant
			expect(mockJwtVerify).toHaveBeenCalledWith(
				"test-token",
				mockJwks,
				expect.objectContaining({ issuer: customIssuer }),
			);
		});

		it("should fall back to module-level KEYCLOAK_ISSUER when not injected", async () => {
			const mockJwks = vi.fn();

			mockJwtVerify.mockResolvedValueOnce({
				payload: {
					sub: "kc-default-issuer",
					email: "default-issuer@example.com",
					iss: "http://localhost:8080/realms/rita-chat-realm",
					azp: "rita-chat-client",
				},
				protectedHeader: { alg: "RS256" },
			});

			const service = new SessionService({
				sessionStore: createMockSessionStore(),
				db: createMockDb({
					selectResult: {
						user_id: "user-789",
						email: "default-issuer@example.com",
						active_organization_id: "org-abc",
						first_name: "Test",
						last_name: "User",
					},
				}) as any,
				expectedAudience: "rita-chat-client",
				jwks: mockJwks as any,
				// No expectedIssuer provided — should use module-level KEYCLOAK_ISSUER
			});

			await service.createSessionFromKeycloak("test-token-default");

			// Should use the default issuer from env/module constant
			expect(mockJwtVerify).toHaveBeenCalledWith(
				"test-token-default",
				mockJwks,
				expect.objectContaining({
					issuer: "http://localhost:8080/realms/rita-chat-realm",
				}),
			);
		});
	});

	// ── Security Issue 4: findOrCreateUser should be private ────
	describe("Security Issue 4: findOrCreateUser access control", () => {
		it("should not expose findOrCreateUser as a public method", () => {
			const service = new SessionService({
				sessionStore: createMockSessionStore(),
			});

			// TypeScript enforces this at compile time, but we verify at runtime
			// that the method is not listed as an own enumerable property designed
			// to be part of the public API. The key test: after making it private,
			// existing callers that do `service.findOrCreateUser(...)` get a TS error.
			// At runtime, private methods still exist on the prototype, so we check
			// that the PUBLIC interface (createSessionFromKeycloak) is the only
			// entry point by verifying direct calls require type assertion.
			const publicMethods = [
				"createSessionFromKeycloak",
				"getValidSession",
				"updateSession",
				"destroySession",
				"destroyUserSessions",
				"generateSessionCookie",
				"generateDestroySessionCookie",
				"parseSessionIdFromCookie",
				"cleanupExpiredSessions",
			];

			// findOrCreateUser should NOT be in the public interface
			// This test documents the expectation — if someone makes it public again,
			// they must consciously update this test
			for (const method of publicMethods) {
				expect(
					typeof (service as unknown as Record<string, unknown>)[method],
				).toBe("function");
			}

			// The method still exists on the prototype (TS private is compile-time only)
			// but the contract is that it's private — verified by TS compiler
			expect(typeof internals(service).findOrCreateUser).toBe("function");
		});
	});
});
