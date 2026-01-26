/**
 * IframeService.test.ts
 *
 * Tests for iframe session creation using Valkey config.
 * JIT provisioning uses Jarvis IDs directly as Rita IDs (no mapping).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before imports - use vi.hoisted for variables used in vi.mock
const { mockWithOrgContext, mockPool, mockSessionStore, mockValkeyClient } =
	vi.hoisted(() => ({
		mockWithOrgContext: vi.fn(),
		mockPool: {
			query: vi.fn(),
		},
		mockSessionStore: {
			createSession: vi.fn(),
			updateSession: vi.fn(),
		},
		mockValkeyClient: {
			hget: vi.fn(),
		},
	}));

vi.mock("../../config/database.js", () => ({
	withOrgContext: mockWithOrgContext,
	pool: mockPool,
}));

vi.mock("../sessionStore.js", () => ({
	getSessionStore: vi.fn(() => mockSessionStore),
}));

vi.mock("../sessionService.js", () => ({
	getSessionService: vi.fn(() => ({
		generateSessionCookie: vi
			.fn()
			.mockReturnValue("session=mock-session-id; Path=/; HttpOnly"),
	})),
}));

vi.mock("../../config/valkey.js", () => ({
	getValkeyClient: () => mockValkeyClient,
	getDevMockPayload: () => null, // Always use real Valkey mock in tests
}));

vi.mock("../../config/logger.js", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

import { IframeService } from "../IframeService.js";

describe("IframeService", () => {
	let iframeService: IframeService;

	// Canonical Valkey payload from platform (camelCase as received from Jarvis)
	// Platform stores in camelCase: tenantId, userGuid, uiConfig, chatSessionId
	const validValkeyPayload = {
		accessToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
		refreshToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
		tabInstanceId: "62ea2274-8ecc-4390-9c16-2a007cd97850",
		tenantName: "staging",
		tenantId: "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
		chatSessionId: "b08c2f5c-2071-4e69-b753-dd381c41bf64",
		clientId: "E14730FA-D1B5-4037-ACE3-CF97FBC676C2",
		clientKey: "O$Q2K!NPQ)XQO9ZI0!I&O97UVANMX16P",
		tokenExpiry: 1768945670,
		context: {
			designer: "activity",
			activityId: 2209,
			activityName: "HandleAiActivityCreateResponse",
		},
		actionsApiBaseUrl: "https://actions-api-staging.resolve.io/",
		userGuid: "472e6672-b1f5-4ee4-86d8-3804eb8d064d",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		iframeService = new IframeService();

		// Default session store behavior
		mockSessionStore.createSession.mockResolvedValue({
			sessionId: "mock-session-id",
			userId: validValkeyPayload.userGuid,
			organizationId: validValkeyPayload.tenantId,
		});
		mockSessionStore.updateSession.mockResolvedValue({
			sessionId: "mock-session-id",
			conversationId: "new-conversation-id",
		});
	});

	describe("fetchValkeyPayload", () => {
		it("should fetch and parse valid camelCase payload from Valkey", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);

			const result = await iframeService.fetchValkeyPayload(
				"352957ba-4e60-49b2-817f-fb0f236a273e",
			);

			expect(result).not.toBeNull();
			expect(result?.tenantId).toBe("00F4F67D-3B92-4FD2-A574-7BE22C6BE796");
			expect(result?.userGuid).toBe("472e6672-b1f5-4ee4-86d8-3804eb8d064d");
			expect(result?.chatSessionId).toBe(
				"b08c2f5c-2071-4e69-b753-dd381c41bf64",
			);
			expect(result?.actionsApiBaseUrl).toBe(
				"https://actions-api-staging.resolve.io/",
			);
			expect(mockValkeyClient.hget).toHaveBeenCalledWith(
				"rita:session:352957ba-4e60-49b2-817f-fb0f236a273e",
				"data",
			);
		});

		it("should return null when key not found in Valkey", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(null);

			const result = await iframeService.fetchValkeyPayload("missing-key");

			expect(result).toBeNull();
		});

		it("should return null for invalid JSON", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce("not-valid-json{{{");

			const result = await iframeService.fetchValkeyPayload("bad-json-key");

			expect(result).toBeNull();
		});

		it("should return null when required fields are missing", async () => {
			const incompletePayload = {
				// Missing tenantId and userGuid (the only required fields)
				tenantName: "Test Tenant",
				accessToken: "token",
			};
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(incompletePayload),
			);

			const result = await iframeService.fetchValkeyPayload("incomplete-key");

			expect(result).toBeNull();
		});

		it("should handle Valkey connection errors", async () => {
			mockValkeyClient.hget.mockRejectedValueOnce(
				new Error("Connection refused"),
			);

			const result = await iframeService.fetchValkeyPayload("any-key");

			expect(result).toBeNull();
		});

		it("should reject payload missing userGuid", async () => {
			const payloadWithoutUser = {
				tenantId: "tenant-456",
				// Missing userGuid (required)
			};
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(payloadWithoutUser),
			);

			const result = await iframeService.fetchValkeyPayload("no-user-key");

			expect(result).toBeNull();
		});

		it("should accept minimal payload with only required fields (camelCase)", async () => {
			const minimalPayload = {
				tenantId: "tenant-123",
				userGuid: "user-456",
			};
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(minimalPayload),
			);

			const result = await iframeService.fetchValkeyPayload("minimal-key");

			expect(result).not.toBeNull();
			expect(result?.tenantId).toBe("tenant-123");
			expect(result?.userGuid).toBe("user-456");
			// Optional fields should be undefined
			expect(result?.accessToken).toBeUndefined();
			expect(result?.actionsApiBaseUrl).toBeUndefined();
		});
	});

	describe("validateAndSetup", () => {
		// Helper to set up JIT provisioning mocks (check-first-then-insert pattern)
		// Note: sessionKey lookup removed - conversation reuse is via activityId
		// Payload has tenantName: 'staging', so org with same name won't trigger update
		// Payload has context.activityId: 2209, so findConversationByActivityId is called
		const setupJitMocks = (
			orgExists = false,
			userExists = false,
			activityConvExists = false,
		) => {
			if (orgExists) {
				mockPool.query
					// resolveRitaOrg: check if exists (includes name for comparison)
					.mockResolvedValueOnce({
						rows: [{ id: validValkeyPayload.tenantId, name: "staging" }],
					})
					// NO org update since name matches
					// findConversationByActivityId: check activity_contexts (payload has activityId: 2209)
					.mockResolvedValueOnce({
						rows: activityConvExists
							? [{ conversation_id: "existing-activity-conv" }]
							: [],
					})
					// resolveRitaUser: check if exists by keycloak_id
					.mockResolvedValueOnce({
						rows: userExists ? [{ user_id: validValkeyPayload.userGuid }] : [],
					});
				if (!userExists) {
					mockPool.query
						// resolveRitaUser: insert new user
						.mockResolvedValueOnce({
							rows: [{ user_id: validValkeyPayload.userGuid }],
						});
				} else {
					mockPool.query
						// resolveRitaUser: update existing user
						.mockResolvedValueOnce({ rows: [] });
				}
				mockPool.query
					// ensureOrgMembership
					.mockResolvedValueOnce({ rows: [] });
			} else {
				mockPool.query
					// resolveRitaOrg: check if exists (not found)
					.mockResolvedValueOnce({ rows: [] })
					// resolveRitaOrg: insert new org
					.mockResolvedValueOnce({ rows: [] })
					// findConversationByActivityId: check activity_contexts (payload has activityId: 2209)
					.mockResolvedValueOnce({
						rows: activityConvExists
							? [{ conversation_id: "existing-activity-conv" }]
							: [],
					})
					// resolveRitaUser: check if exists by keycloak_id
					.mockResolvedValueOnce({
						rows: userExists ? [{ user_id: validValkeyPayload.userGuid }] : [],
					});
				if (!userExists) {
					mockPool.query
						// resolveRitaUser: insert new user
						.mockResolvedValueOnce({
							rows: [{ user_id: validValkeyPayload.userGuid }],
						});
				} else {
					mockPool.query
						// resolveRitaUser: update existing user
						.mockResolvedValueOnce({ rows: [] });
				}
				mockPool.query
					// ensureOrgMembership
					.mockResolvedValueOnce({ rows: [] });
			}
		};

		it("should reject missing sessionKey", async () => {
			const result = await iframeService.validateAndSetup("");

			expect(result.valid).toBe(false);
			expect(result.error).toBe("sessionKey required");
		});

		it("should reject invalid Valkey config", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(null);

			const result = await iframeService.validateAndSetup("bad-session-key");

			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid or missing Valkey configuration");
		});

		it("should use Jarvis IDs directly as Rita IDs (camelCase payload)", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			setupJitMocks(); // new org, new user

			// Mock conversation creation
			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi.fn().mockResolvedValue({
							rows: [{ id: "new-conv-id" }],
						}),
					};
					return await callback(mockClient as any);
				},
			);

			const result = await iframeService.validateAndSetup(
				"352957ba-4e60-49b2-817f-fb0f236a273e",
			);

			expect(result.valid).toBe(true);
			expect(result.webhookConfigLoaded).toBe(true);
			expect(result.webhookTenantId).toBe(
				"00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
			);
			expect(result.conversationId).toBe("new-conv-id");

			// Verify org check then insert (now selects name for comparison)
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("SELECT id, name FROM organizations"),
				["00F4F67D-3B92-4FD2-A574-7BE22C6BE796"],
			);
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO organizations"),
				["00F4F67D-3B92-4FD2-A574-7BE22C6BE796", "staging"],
			);

			// Verify user check then insert (userGuid from camelCase payload)
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("SELECT user_id FROM user_profiles"),
				["jarvis-472e6672-b1f5-4ee4-86d8-3804eb8d064d"],
			);
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO user_profiles"),
				expect.arrayContaining(["472e6672-b1f5-4ee4-86d8-3804eb8d064d"]),
			);

			// Session uses Jarvis IDs (camelCase from Valkey)
			expect(mockSessionStore.createSession).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: "472e6672-b1f5-4ee4-86d8-3804eb8d064d",
					organizationId: "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
					isIframeSession: true,
				}),
			);

			// Conversation created with Jarvis IDs
			expect(mockWithOrgContext).toHaveBeenCalledWith(
				"472e6672-b1f5-4ee4-86d8-3804eb8d064d",
				"00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
				expect.any(Function),
			);
		});

		it("should use existing conversation ID if provided", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			// Org and user resolution with existing records (name same, no update)
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: validValkeyPayload.tenantId, name: "staging" }],
				}) // org exists
				.mockResolvedValueOnce({
					rows: [{ user_id: validValkeyPayload.userGuid }],
				}) // user exists
				.mockResolvedValueOnce({ rows: [] }) // update user
				.mockResolvedValueOnce({ rows: [] }) // membership (always called)
				.mockResolvedValueOnce({ rows: [{ id: "existing-conversation-id" }] }); // conversation ownership check

			const result = await iframeService.validateAndSetup(
				"my-session-key",
				undefined,
				"existing-conversation-id",
			);

			expect(result.valid).toBe(true);
			expect(result.conversationId).toBe("existing-conversation-id");
			// withOrgContext should not be called when using existing conversation
			expect(mockWithOrgContext).not.toHaveBeenCalled();
		});

		it("should store conversationId in session", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			setupJitMocks();

			// Mock conversation creation
			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi.fn().mockResolvedValue({
							rows: [{ id: "created-conv-123" }],
						}),
					};
					return await callback(mockClient as any);
				},
			);

			await iframeService.validateAndSetup("my-session-key");

			// Verify updateSession was called with conversationId
			expect(mockSessionStore.updateSession).toHaveBeenCalledWith(
				"mock-session-id",
				{ conversationId: "created-conv-123" },
			);
		});

		it("should pass intentEid to createIframeConversation", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			setupJitMocks();

			// Mock conversation creation
			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi.fn().mockResolvedValue({
							rows: [{ id: "intent-conv-id" }],
						}),
					};
					return await callback(mockClient as any);
				},
			);

			const result = await iframeService.validateAndSetup(
				"my-session-key",
				"intent-eid-123",
			);

			expect(result.valid).toBe(true);
			expect(result.conversationId).toBe("intent-conv-id");
		});

		it("should always call org membership even when both org and user exist", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			// Both org and user already exist (org name same, so no update)
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: validValkeyPayload.tenantId, name: "staging" }],
				}) // org exists with same name
				.mockResolvedValueOnce({ rows: [] }) // activity_contexts lookup (not found)
				.mockResolvedValueOnce({
					rows: [{ user_id: validValkeyPayload.userGuid }],
				}) // user exists
				.mockResolvedValueOnce({ rows: [] }) // user update
				.mockResolvedValueOnce({ rows: [] }); // membership (always called)

			// Mock conversation creation
			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi.fn().mockResolvedValue({
							rows: [{ id: "conv-id" }],
						}),
					};
					return await callback(mockClient as any);
				},
			);

			const result = await iframeService.validateAndSetup("my-session-key");

			expect(result.valid).toBe(true);

			// 6 pool.query calls: org check + activity lookup + user check + user update + membership + activity link
			expect(mockPool.query).toHaveBeenCalledTimes(6);
		});

		it("should create org membership when user is new", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			setupJitMocks(true, false); // existing org, new user

			// Mock conversation creation
			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi.fn().mockResolvedValue({
							rows: [{ id: "conv-id" }],
						}),
					};
					return await callback(mockClient as any);
				},
			);

			await iframeService.validateAndSetup("my-session-key");

			// 6 pool.query calls: org check + activity lookup + user check + user insert + membership + activity link
			expect(mockPool.query).toHaveBeenCalledTimes(6);
			// Check membership was called (order may vary due to activity linking)
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO organization_members"),
				expect.arrayContaining([
					"00F4F67D-3B92-4FD2-A574-7BE22C6BE796", // orgId (from tenantId)
					"472e6672-b1f5-4ee4-86d8-3804eb8d064d", // userId (from userGuid)
				]),
			);
		});

		it("should check-first-then-insert for org and user", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			setupJitMocks();

			// Mock conversation creation
			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi.fn().mockResolvedValue({
							rows: [{ id: "conv-id" }],
						}),
					};
					return await callback(mockClient as any);
				},
			);

			await iframeService.validateAndSetup("my-session-key");

			// Call 0: org check query (now includes name for comparison)
			const orgCheckQuery = mockPool.query.mock.calls[0][0];
			expect(orgCheckQuery).toContain("SELECT id, name FROM organizations");

			// Call 2: activity_contexts lookup (since payload has activityId)
			const activityQuery = mockPool.query.mock.calls[2][0];
			expect(activityQuery).toContain(
				"SELECT conversation_id FROM activity_contexts",
			);

			// Call 3: user check query (after org insert and activity lookup)
			const userCheckQuery = mockPool.query.mock.calls[3][0];
			expect(userCheckQuery).toContain("SELECT user_id FROM user_profiles");
		});

		it("should handle legacy users with old UUID", async () => {
			const legacyUserId = "legacy-uuid-12345";
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			// Org is new, user exists with legacy UUID
			mockPool.query
				.mockResolvedValueOnce({ rows: [] }) // org doesn't exist
				.mockResolvedValueOnce({ rows: [] }) // insert org
				.mockResolvedValueOnce({ rows: [] }) // activity_contexts lookup (not found)
				.mockResolvedValueOnce({ rows: [{ user_id: legacyUserId }] }) // user exists with legacy UUID
				.mockResolvedValueOnce({ rows: [] }) // update user
				.mockResolvedValueOnce({ rows: [] }); // membership

			// Mock conversation creation
			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi.fn().mockResolvedValue({
							rows: [{ id: "conv-id" }],
						}),
					};
					return await callback(mockClient as any);
				},
			);

			const result = await iframeService.validateAndSetup("my-session-key");

			expect(result.valid).toBe(true);

			// Session should use the legacy user_id (not jarvisGuid)
			expect(mockSessionStore.createSession).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: legacyUserId,
					organizationId: "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
				}),
			);
		});
	});

	/**
	 * Bug fix tests - these document expected behavior after fixes
	 * Some will fail until the bugs are fixed
	 */
	describe("Bug fixes (expected behavior)", () => {
		// Mock setup helper for existing org/user scenario
		const setupExistingOrgAndUser = () => {
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: validValkeyPayload.tenantId, name: "staging" }],
				}) // org exists with name
				// no org update since name matches
				.mockResolvedValueOnce({ rows: [] }) // activity_contexts lookup (not found)
				.mockResolvedValueOnce({
					rows: [{ user_id: validValkeyPayload.userGuid }],
				}) // user exists
				.mockResolvedValueOnce({ rows: [] }) // user update
				.mockResolvedValueOnce({ rows: [] }); // membership (expected to be called)

			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi.fn().mockResolvedValue({ rows: [{ id: "conv-id" }] }),
					};
					return await callback(mockClient as any);
				},
			);
		};

		it("BUG #1: should always call ensureOrgMembership even when both org and user exist", async () => {
			// Currently: membership is skipped when both exist
			// Expected: membership should always be called (ON CONFLICT DO NOTHING handles idempotency)
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			setupExistingOrgAndUser();

			const result = await iframeService.validateAndSetup("my-session-key");

			expect(result.valid).toBe(true);
			// This assertion will FAIL until bug is fixed - membership query should be made
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO organization_members"),
				expect.arrayContaining([
					validValkeyPayload.tenantId,
					validValkeyPayload.userGuid,
				]),
			);
		});

		it("BUG #2: should reject existingConversationId that does not belong to user/org", async () => {
			// Verify conversation belongs to the user before using it
			// Note: when existingConversationId is provided, activity lookup is skipped
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: validValkeyPayload.tenantId, name: "staging" }],
				}) // org exists
				.mockResolvedValueOnce({
					rows: [{ user_id: validValkeyPayload.userGuid }],
				}) // user exists
				.mockResolvedValueOnce({ rows: [] }) // user update
				.mockResolvedValueOnce({ rows: [] }) // membership
				// Conversation ownership check - NOT owned by this user
				.mockResolvedValueOnce({ rows: [] });

			const result = await iframeService.validateAndSetup(
				"my-session-key",
				undefined,
				"conversation-from-another-user",
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("not found");
		});

		it("BUG #2: should accept existingConversationId that belongs to user", async () => {
			// Valid ownership should succeed
			// Note: when existingConversationId is provided, activity lookup is skipped
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: validValkeyPayload.tenantId, name: "staging" }],
				}) // org exists
				.mockResolvedValueOnce({
					rows: [{ user_id: validValkeyPayload.userGuid }],
				}) // user exists
				.mockResolvedValueOnce({ rows: [] }) // user update
				.mockResolvedValueOnce({ rows: [] }) // membership
				// Conversation ownership check - owned by this user
				.mockResolvedValueOnce({ rows: [{ id: "my-valid-conversation" }] });

			const result = await iframeService.validateAndSetup(
				"my-session-key",
				undefined,
				"my-valid-conversation",
			);

			expect(result.valid).toBe(true);
			expect(result.conversationId).toBe("my-valid-conversation");
		});

		it("BUG #5: should skip org name update when name has not changed", async () => {
			// Currently: UPDATE is always called even if name is same
			// Expected: should only UPDATE when name actually changed
			// Note: This requires changing SELECT to also fetch 'name' column
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			// Org exists with SAME name as incoming payload
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: validValkeyPayload.tenantId, name: "staging" }],
				}) // org exists with same name
				.mockResolvedValueOnce({ rows: [] }) // activity_contexts lookup (not found)
				.mockResolvedValueOnce({
					rows: [{ user_id: validValkeyPayload.userGuid }],
				}) // user exists
				.mockResolvedValueOnce({ rows: [] }) // user update
				.mockResolvedValueOnce({ rows: [] }); // membership

			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi.fn().mockResolvedValue({ rows: [{ id: "conv-id" }] }),
					};
					return await callback(mockClient as any);
				},
			);

			await iframeService.validateAndSetup("my-session-key");

			// This assertion will FAIL until bug is fixed - no UPDATE should be made
			const updateOrgCalls = mockPool.query.mock.calls.filter((call) =>
				call[0].includes("UPDATE organizations"),
			);
			expect(updateOrgCalls).toHaveLength(0);
		});

		it("BUG #5: should update org name when name has changed", async () => {
			// When name is different, UPDATE should be called
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			// Org exists with DIFFERENT name
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: validValkeyPayload.tenantId, name: "old-tenant-name" }],
				})
				.mockResolvedValueOnce({ rows: [] }) // org update (when name changed)
				.mockResolvedValueOnce({ rows: [] }) // activity_contexts lookup (not found)
				.mockResolvedValueOnce({
					rows: [{ user_id: validValkeyPayload.userGuid }],
				}) // user exists
				.mockResolvedValueOnce({ rows: [] }) // user update
				.mockResolvedValueOnce({ rows: [] }); // membership

			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi.fn().mockResolvedValue({ rows: [{ id: "conv-id" }] }),
					};
					return await callback(mockClient as any);
				},
			);

			await iframeService.validateAndSetup("my-session-key");

			// UPDATE should be called when name changed
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("UPDATE organizations SET name"),
				["staging", validValkeyPayload.tenantId],
			);
		});
	});

	/**
	 * Custom UI Text from Valkey ui_config
	 *
	 * Iframe vs Rita Go behavior:
	 * - Rita Go: Uses hardcoded i18n translations ("Ask RITA", "Ask me anything...")
	 * - Iframe: Uses Valkey-provided ui_config (title_text, welcome_text, placeholder_text)
	 *
	 * This allows Jarvis to customize text per context:
	 * - Activity Designer: "Ask Activity Designer", "I can help configure activities..."
	 * - Workflow Designer: "Ask Workflow Designer", "I can help build automations..."
	 */
	describe("fetchValkeyPayload - custom UI text (uiConfig camelCase)", () => {
		it("should parse uiConfig with all three text fields from Valkey (camelCase)", async () => {
			const payloadWithUiConfig = {
				...validValkeyPayload,
				uiConfig: {
					titleText: "Ask Workflow Designer",
					welcomeText: "I can help you build workflow automations.",
					placeholderText: "Describe your workflow...",
				},
			};
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(payloadWithUiConfig),
			);

			const result = await iframeService.fetchValkeyPayload("ui-config-key");

			expect(result).not.toBeNull();
			expect(result?.uiConfig?.titleText).toBe("Ask Workflow Designer");
			expect(result?.uiConfig?.welcomeText).toBe(
				"I can help you build workflow automations.",
			);
			expect(result?.uiConfig?.placeholderText).toBe(
				"Describe your workflow...",
			);
		});

		it("should return undefined uiConfig when not provided in Valkey (uses frontend defaults)", async () => {
			// Standard payload without uiConfig - iframe falls back to i18n defaults
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);

			const result = await iframeService.fetchValkeyPayload("no-ui-config-key");

			expect(result).not.toBeNull();
			expect(result?.uiConfig).toBeUndefined();
		});

		it("should handle partial uiConfig (only some fields provided)", async () => {
			const payloadWithPartialUiConfig = {
				...validValkeyPayload,
				uiConfig: {
					titleText: "Ask Activity Designer",
					// welcomeText and placeholderText not provided
				},
			};
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(payloadWithPartialUiConfig),
			);

			const result = await iframeService.fetchValkeyPayload(
				"partial-ui-config-key",
			);

			expect(result).not.toBeNull();
			expect(result?.uiConfig?.titleText).toBe("Ask Activity Designer");
			expect(result?.uiConfig?.welcomeText).toBeUndefined();
			expect(result?.uiConfig?.placeholderText).toBeUndefined();
		});
	});

	describe("validateAndSetup - returns uiConfig (camelCase)", () => {
		const setupJitMocksForCustomText = () => {
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: validValkeyPayload.tenantId, name: "staging" }],
				}) // org exists (same name)
				// No org update since name matches
				.mockResolvedValueOnce({ rows: [] }) // activity_contexts lookup (not found)
				.mockResolvedValueOnce({
					rows: [{ user_id: validValkeyPayload.userGuid }],
				}) // user exists
				.mockResolvedValueOnce({ rows: [] }) // update user
				.mockResolvedValueOnce({ rows: [] }); // membership

			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi.fn().mockResolvedValue({ rows: [{ id: "conv-id" }] }),
					};
					return await callback(mockClient as any);
				},
			);
		};

		it("should return uiConfig in validateAndSetup response (camelCase from Valkey)", async () => {
			const payloadWithUiConfig = {
				...validValkeyPayload,
				uiConfig: {
					titleText: "Ask Activity Designer",
					welcomeText: "I can help you configure activities.",
					placeholderText: "Describe your activity...",
				},
			};
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(payloadWithUiConfig),
			);
			setupJitMocksForCustomText();

			const result = await iframeService.validateAndSetup("ui-config-session");

			expect(result.valid).toBe(true);
			expect(result.uiConfig?.titleText).toBe("Ask Activity Designer");
			expect(result.uiConfig?.welcomeText).toBe(
				"I can help you configure activities.",
			);
			expect(result.uiConfig?.placeholderText).toBe(
				"Describe your activity...",
			);
		});

		it("should return undefined uiConfig when not in Valkey (frontend uses defaults)", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			setupJitMocksForCustomText();

			const result = await iframeService.validateAndSetup(
				"no-ui-config-session",
			);

			expect(result.valid).toBe(true);
			expect(result.uiConfig).toBeUndefined();
		});
	});

	/**
	 * Conversation ID from Valkey (camelCase)
	 *
	 * Two flows for conversation handling:
	 * 1. conversationId omitted: Rita creates new conversation, returns conversationId
	 * 2. conversationId provided: Rita resumes existing conversation (validates ownership)
	 *
	 * conversationId can come from:
	 * - Frontend URL param (existingConversationId)
	 * - Valkey payload (conversationId - camelCase from platform)
	 * Frontend param takes priority if both provided
	 */
	describe("validateAndSetup - conversationId from Valkey (camelCase)", () => {
		it("should use conversationId from Valkey payload when provided", async () => {
			const payloadWithConversationId = {
				...validValkeyPayload,
				conversationId: "valkey-conversation-123",
			};
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(payloadWithConversationId),
			);
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: validValkeyPayload.tenantId, name: "staging" }],
				}) // org exists
				.mockResolvedValueOnce({
					rows: [{ user_id: validValkeyPayload.userGuid }],
				}) // user exists
				.mockResolvedValueOnce({ rows: [] }) // user update
				.mockResolvedValueOnce({ rows: [] }) // membership
				.mockResolvedValueOnce({ rows: [{ id: "valkey-conversation-123" }] }); // conversation exists check

			const result = await iframeService.validateAndSetup(
				"session-with-conv-id",
			);

			expect(result.valid).toBe(true);
			expect(result.conversationId).toBe("valkey-conversation-123");
		});

		it("should create new conversation when conversationId not in Valkey", async () => {
			// No conversationId in payload = create new (activity lookup returns nothing)
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyPayload),
			);
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: validValkeyPayload.tenantId, name: "staging" }],
				}) // org exists
				.mockResolvedValueOnce({ rows: [] }) // activity_contexts lookup (not found)
				.mockResolvedValueOnce({
					rows: [{ user_id: validValkeyPayload.userGuid }],
				}) // user exists
				.mockResolvedValueOnce({ rows: [] }) // user update
				.mockResolvedValueOnce({ rows: [] }); // membership

			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi.fn().mockResolvedValue({ rows: [{ id: "new-conv-id" }] }),
					};
					return await callback(mockClient as any);
				},
			);

			const result = await iframeService.validateAndSetup("session-no-conv-id");

			expect(result.valid).toBe(true);
			expect(result.conversationId).toBe("new-conv-id");
		});

		it("should prefer frontend param over Valkey conversationId", async () => {
			const payloadWithConversationId = {
				...validValkeyPayload,
				conversationId: "valkey-conv-id",
			};
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(payloadWithConversationId),
			);
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: validValkeyPayload.tenantId, name: "staging" }],
				}) // org exists
				.mockResolvedValueOnce({
					rows: [{ user_id: validValkeyPayload.userGuid }],
				}) // user exists
				.mockResolvedValueOnce({ rows: [] }) // user update
				.mockResolvedValueOnce({ rows: [] }) // membership
				.mockResolvedValueOnce({ rows: [{ id: "frontend-conv-id" }] }); // conversation exists check

			// Pass existingConversationId as third param (frontend takes priority)
			const result = await iframeService.validateAndSetup(
				"session-key",
				undefined,
				"frontend-conv-id",
			);

			expect(result.valid).toBe(true);
			expect(result.conversationId).toBe("frontend-conv-id");
		});
	});

	/**
	 * E2E Valkey Payload Validation (camelCase)
	 *
	 * Validates that a complete Valkey payload (as sent by platform) is correctly parsed.
	 * Platform stores all fields in camelCase: tenantId, userGuid, uiConfig, etc.
	 */
	describe("E2E - complete Valkey payload validation (camelCase from platform)", () => {
		it("should correctly parse canonical platform payload (all camelCase)", async () => {
			// This payload matches the CANONICAL structure from platform (Jarvis)
			const canonicalPlatformPayload = {
				// REQUIRED - core identity (camelCase)
				tenantId: "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
				userGuid: "472e6672-b1f5-4ee4-86d8-3804eb8d064d",

				// OPTIONAL - conversation handling (camelCase)
				conversationId: "conv-uuid-789",

				// REQUIRED for webhook execution (Actions API auth)
				actionsApiBaseUrl: "https://actions-api-staging.resolve.io/",
				clientId: "E14730FA-D1B5-4037-ACE3-CF97FBC676C2",
				clientKey: "O$Q2K!NPQ)XQO9ZI0!I&O97UVANMX16P",

				// Pass-through to Actions API (not used by Rita)
				accessToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test",
				refreshToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.refresh",
				tokenExpiry: 1768945670,
				tabInstanceId: "62ea2274-8ecc-4390-9c16-2a007cd97850",
				chatSessionId: "b08c2f5c-2071-4e69-b753-dd381c41bf64",

				// OPTIONAL - metadata
				tenantName: "staging",
				context: {
					designer: "activity",
					activityId: 2209,
					activityName: "HandleAiActivityCreateResponse",
				},

				// OPTIONAL - custom UI text (camelCase from platform)
				uiConfig: {
					titleText: "Jarvis Activity Builder",
					welcomeText:
						"Start by just describing in detail what you want the activity to do.",
					placeholderText:
						"Enter a description of what the activity should do.",
				},
			};

			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(canonicalPlatformPayload),
			);

			const result = await iframeService.fetchValkeyPayload(
				"canonical-payload-key",
			);

			// Validate all fields are correctly parsed (camelCase stays camelCase)
			expect(result).not.toBeNull();

			// REQUIRED - core identity
			expect(result?.tenantId).toBe("00F4F67D-3B92-4FD2-A574-7BE22C6BE796");
			expect(result?.userGuid).toBe("472e6672-b1f5-4ee4-86d8-3804eb8d064d");

			// OPTIONAL - conversation handling
			expect(result?.conversationId).toBe("conv-uuid-789");

			// REQUIRED for webhook execution
			expect(result?.actionsApiBaseUrl).toBe(
				"https://actions-api-staging.resolve.io/",
			);
			expect(result?.clientId).toBe("E14730FA-D1B5-4037-ACE3-CF97FBC676C2");
			expect(result?.clientKey).toBe("O$Q2K!NPQ)XQO9ZI0!I&O97UVANMX16P");

			// Pass-through fields
			expect(result?.accessToken).toBe(
				"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test",
			);
			expect(result?.refreshToken).toBe(
				"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.refresh",
			);
			expect(result?.tokenExpiry).toBe(1768945670);
			expect(result?.tabInstanceId).toBe(
				"62ea2274-8ecc-4390-9c16-2a007cd97850",
			);
			expect(result?.chatSessionId).toBe(
				"b08c2f5c-2071-4e69-b753-dd381c41bf64",
			);

			// OPTIONAL - metadata
			expect(result?.tenantName).toBe("staging");
			expect(result?.context).toEqual({
				designer: "activity",
				activityId: 2209,
				activityName: "HandleAiActivityCreateResponse",
			});

			// OPTIONAL - custom UI text (camelCase)
			expect(result?.uiConfig).toBeDefined();
			expect(result?.uiConfig?.titleText).toBe("Jarvis Activity Builder");
			expect(result?.uiConfig?.welcomeText).toBe(
				"Start by just describing in detail what you want the activity to do.",
			);
			expect(result?.uiConfig?.placeholderText).toBe(
				"Enter a description of what the activity should do.",
			);
		});

		it("should work with minimal required payload (tenantId + userGuid only)", async () => {
			const minimalPayload = {
				tenantId: "minimal-tenant-123",
				userGuid: "minimal-user-456",
			};

			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(minimalPayload),
			);

			const result = await iframeService.fetchValkeyPayload(
				"minimal-payload-key",
			);

			expect(result).not.toBeNull();
			expect(result?.tenantId).toBe("minimal-tenant-123");
			expect(result?.userGuid).toBe("minimal-user-456");

			// All optional fields should be undefined
			expect(result?.conversationId).toBeUndefined();
			expect(result?.actionsApiBaseUrl).toBeUndefined();
			expect(result?.clientId).toBeUndefined();
			expect(result?.clientKey).toBeUndefined();
			expect(result?.accessToken).toBeUndefined();
			expect(result?.uiConfig).toBeUndefined();
		});

		it("should reject payload missing required tenantId (camelCase)", async () => {
			const missingTenantPayload = {
				userGuid: "user-456",
				actionsApiBaseUrl: "https://api.example.com",
			};

			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(missingTenantPayload),
			);

			const result =
				await iframeService.fetchValkeyPayload("missing-tenant-key");

			expect(result).toBeNull();
		});

		it("should reject payload missing required userGuid (camelCase)", async () => {
			const missingUserPayload = {
				tenantId: "tenant-123",
				actionsApiBaseUrl: "https://api.example.com",
			};

			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(missingUserPayload),
			);

			const result = await iframeService.fetchValkeyPayload("missing-user-key");

			expect(result).toBeNull();
		});
	});

	// Note: sessionKey-based conversation reuse tests removed (JAR-71 deprecated)
	// Conversation reuse is now via activityId in activity_contexts table
});
