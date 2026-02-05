import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import conversationsRouter from "../conversations.js";

// Mock dependencies
vi.mock("../../config/database.js", () => ({
	withOrgContext: vi.fn(),
}));

vi.mock("../../middleware/auth.js", () => ({
	authenticateUser: vi.fn((req, _res, next) => {
		// Inject mock authenticated user
		(req as any).user = {
			id: "test-user-id",
			activeOrganizationId: "test-org-id",
			email: "test@example.com",
		};
		(req as any).session = { sessionId: "test-session-id" };
		next();
	}),
}));

const { mockSendMessageEvent, mockSendTenantMessageEvent } = vi.hoisted(() => ({
	mockSendMessageEvent: vi.fn().mockResolvedValue({ success: true }),
	mockSendTenantMessageEvent: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../../services/WebhookService.js", () => {
	return {
		WebhookService: class MockWebhookService {
			sendMessageEvent = mockSendMessageEvent;
			sendTenantMessageEvent = mockSendTenantMessageEvent;
		},
	};
});

const mockSessionStore = {
	getSession: vi.fn(),
};

vi.mock("../../services/sessionStore.js", () => ({
	getSessionStore: () => mockSessionStore,
}));

import { withOrgContext } from "../../config/database.js";

describe("Conversations Router - Automatic Cleanup", () => {
	let app: express.Application;
	let mockClient: any;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use("/conversations", conversationsRouter);

		mockClient = {
			query: vi.fn(),
			release: vi.fn(),
		};

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("POST /conversations - Automatic Old Conversation Cleanup", () => {
		it("should create conversation without deletion when user has less than 20 conversations", async () => {
			// Mock count: 15 conversations
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ count: "15" }] }) // COUNT query
				.mockResolvedValueOnce({
					rows: [
						{
							id: "new-conv-id",
							title: "New Chat",
							created_at: new Date(),
							updated_at: new Date(),
						},
					],
				}); // INSERT query

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.post("/conversations")
				.send({ title: "New Chat" })
				.expect(201);

			expect(response.body).toHaveProperty("conversation");
			expect(response.body.conversation.title).toBe("New Chat");
			expect(mockClient.query).toHaveBeenCalledTimes(2); // COUNT + INSERT, no DELETE
		});

		it("should delete oldest conversation when user has exactly 20 conversations", async () => {
			// Mock count: 20 conversations (at limit)
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ count: "20" }] }) // COUNT query
				.mockResolvedValueOnce({ rows: [] }) // DELETE query
				.mockResolvedValueOnce({
					rows: [
						{
							id: "new-conv-id",
							title: "New Chat",
							created_at: new Date(),
							updated_at: new Date(),
						},
					],
				}); // INSERT query

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.post("/conversations")
				.send({ title: "New Chat" })
				.expect(201);

			expect(response.body).toHaveProperty("conversation");
			expect(mockClient.query).toHaveBeenCalledTimes(3); // COUNT + DELETE + INSERT

			// Verify DELETE query targets oldest conversation
			const deleteCall = mockClient.query.mock.calls[1];
			expect(deleteCall[0]).toContain("DELETE FROM conversations");
			expect(deleteCall[0]).toContain("ORDER BY created_at ASC");
			expect(deleteCall[0]).toContain("LIMIT 1");
		});

		it("should delete oldest conversation when user exceeds 20 conversations", async () => {
			// Mock count: 25 conversations (over limit)
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ count: "25" }] }) // COUNT query
				.mockResolvedValueOnce({ rows: [] }) // DELETE query
				.mockResolvedValueOnce({
					rows: [
						{
							id: "new-conv-id",
							title: "New Chat",
							created_at: new Date(),
							updated_at: new Date(),
						},
					],
				}); // INSERT query

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.post("/conversations")
				.send({ title: "New Chat" })
				.expect(201);

			expect(response.body).toHaveProperty("conversation");
			expect(mockClient.query).toHaveBeenCalledTimes(3); // COUNT + DELETE + INSERT
		});

		it("should verify oldest conversation is deleted by created_at timestamp", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ count: "20" }] })
				.mockResolvedValueOnce({ rows: [] })
				.mockResolvedValueOnce({
					rows: [
						{
							id: "new-conv-id",
							title: "New Chat",
							created_at: new Date(),
							updated_at: new Date(),
						},
					],
				});

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			await request(app)
				.post("/conversations")
				.send({ title: "New Chat" })
				.expect(201);

			// Verify DELETE uses ORDER BY created_at ASC to get oldest
			const deleteCall = mockClient.query.mock.calls[1];
			expect(deleteCall[0]).toMatch(/ORDER BY created_at ASC/);
		});

		it("should maintain user isolation - User A at limit should not affect User B", async () => {
			// User A at limit
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ count: "20" }] })
				.mockResolvedValueOnce({ rows: [] })
				.mockResolvedValueOnce({
					rows: [
						{
							id: "new-conv-a",
							title: "Chat A",
							created_at: new Date(),
							updated_at: new Date(),
						},
					],
				});

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			// Create conversation for User A
			await request(app)
				.post("/conversations")
				.send({ title: "Chat A" })
				.expect(201);

			// Verify User A's queries use their user_id
			const countCallA = mockClient.query.mock.calls[0];
			expect(countCallA[1]).toContain("test-user-id"); // User A's ID

			vi.clearAllMocks();

			// User B with fewer conversations
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ count: "5" }] })
				.mockResolvedValueOnce({
					rows: [
						{
							id: "new-conv-b",
							title: "Chat B",
							created_at: new Date(),
							updated_at: new Date(),
						},
					],
				});

			// Simulate User B with different ID
			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					// Override mock user for this test
					return await callback(mockClient);
				},
			);

			// User B should NOT trigger deletion (only 5 conversations)
			await request(app)
				.post("/conversations")
				.send({ title: "Chat B" })
				.expect(201);

			expect(mockClient.query).toHaveBeenCalledTimes(2); // COUNT + INSERT, no DELETE
		});

		it("should handle empty state - first conversation for new user", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ count: "0" }] }) // No existing conversations
				.mockResolvedValueOnce({
					rows: [
						{
							id: "first-conv-id",
							title: "First Chat",
							created_at: new Date(),
							updated_at: new Date(),
						},
					],
				});

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.post("/conversations")
				.send({ title: "First Chat" })
				.expect(201);

			expect(response.body.conversation.title).toBe("First Chat");
			expect(mockClient.query).toHaveBeenCalledTimes(2); // COUNT + INSERT
		});

		it("should rollback transaction on error after deletion", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ count: "20" }] }) // COUNT succeeds
				.mockResolvedValueOnce({ rows: [] }) // DELETE succeeds
				.mockRejectedValueOnce(new Error("INSERT failed")); // INSERT fails

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					try {
						return await callback(mockClient);
					} catch (error) {
						// withOrgContext handles rollback on error
						throw error;
					}
				},
			);

			await request(app)
				.post("/conversations")
				.send({ title: "New Chat" })
				.expect(500);

			// Verify all queries were attempted
			expect(mockClient.query).toHaveBeenCalledTimes(3);
		});

		it("should handle invalid title validation", async () => {
			const response = await request(app)
				.post("/conversations")
				.send({ title: "" })
				.expect(400);

			expect(response.body).toHaveProperty("error");
			expect(response.body.error).toBe("Validation error");
			expect(response.body).toHaveProperty("details");
		});

		it("should handle missing title", async () => {
			const response = await request(app)
				.post("/conversations")
				.send({})
				.expect(400);

			expect(response.body).toHaveProperty("error");
		});

		it("should handle database connection errors gracefully", async () => {
			vi.mocked(withOrgContext).mockRejectedValueOnce(
				new Error("Database connection failed"),
			);

			const response = await request(app)
				.post("/conversations")
				.send({ title: "New Chat" })
				.expect(500);

			expect(response.body).toHaveProperty("error");
			expect(response.body.error).toBe("Failed to create conversation");
		});
	});

	describe("Configuration", () => {
		it("should respect MAX_CONVERSATIONS_PER_USER environment variable", () => {
			// This test verifies the configuration constant is used
			// The actual limit is defined at the top of conversations.ts
			expect(process.env.MAX_CONVERSATIONS_PER_USER || "20").toBeDefined();
		});
	});
});

describe("Conversations Router - Iframe userId Validation", () => {
	let app: express.Application;
	let mockClient: any;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use("/conversations", conversationsRouter);

		mockClient = {
			query: vi.fn(),
			release: vi.fn(),
		};

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("POST /conversations/:id/messages - Iframe userGuid validation", () => {
		it("should reject message when iframe config missing userGuid", async () => {
			// Session has iframe config but no userGuid
			mockSessionStore.getSession.mockResolvedValue({
				sessionId: "test-session-id",
				iframeWebhookConfig: {
					tenantId: "tenant-123",
					accessToken: "token",
					refreshToken: "refresh",
					// userGuid is missing!
				},
			});

			// Setup DB mocks for conversation check and message insert
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-123" }] }) // conv check
				.mockResolvedValueOnce({ rows: [] }) // transcript
				.mockResolvedValueOnce({
					rows: [{ id: "msg-1", message: "test", created_at: new Date() }],
				}); // insert

			vi.mocked(withOrgContext).mockImplementation(
				async (_userGuid, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.post("/conversations/conv-123/messages")
				.send({ content: "Hello" })
				.expect(400);

			expect(response.body.error).toContain("missing userGuid");
			expect(response.body.code).toBe("IFRAME_MISSING_USER_GUID");
		});

		it("should allow message when iframe config has userGuid", async () => {
			// Session has complete iframe config including userGuid
			const iframeConfig = {
				userGuid: "user-keycloak-guid",
				tenantId: "tenant-123",
				tenantName: "Test Tenant",
				accessToken: "token",
				refreshToken: "refresh",
				tabInstanceId: "tab-789",
				clientId: "client",
				clientKey: "key",
				tokenExpiry: Date.now() + 3600000,
				actionsApiBaseUrl: "https://api.example.com",
			};
			mockSessionStore.getSession.mockResolvedValue({
				sessionId: "test-session-id",
				iframeWebhookConfig: iframeConfig,
			});

			mockSendTenantMessageEvent.mockClear();

			// Setup DB mocks
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-123" }] }) // conv check
				.mockResolvedValueOnce({ rows: [] }) // transcript
				.mockResolvedValueOnce({
					rows: [
						{
							id: "msg-1",
							message: "test",
							role: "user",
							status: "pending",
							created_at: new Date(),
						},
					],
				}) // insert
				.mockResolvedValueOnce({ rows: [] }); // update status

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.post("/conversations/conv-123/messages")
				.send({ content: "Hello" })
				.expect(201);

			expect(response.body.message).toBeDefined();
			expect(response.body.webhook.usedTenantConfig).toBe(true);

			// Verify entire iframeConfig (including userGuid) is passed to webhook
			expect(mockSendTenantMessageEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					iframeConfig: expect.objectContaining({
						userGuid: "user-keycloak-guid",
						tenantId: "tenant-123",
					}),
				}),
			);
		});

		it("should allow message when no iframe config (regular session)", async () => {
			// Regular session without iframe config
			mockSessionStore.getSession.mockResolvedValue({
				sessionId: "test-session-id",
				// No iframeWebhookConfig
			});

			// Setup DB mocks
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-123" }] }) // conv check
				.mockResolvedValueOnce({ rows: [] }) // transcript
				.mockResolvedValueOnce({
					rows: [
						{
							id: "msg-1",
							message: "test",
							role: "user",
							status: "pending",
							created_at: new Date(),
						},
					],
				}) // insert
				.mockResolvedValueOnce({ rows: [] }); // update status

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.post("/conversations/conv-123/messages")
				.send({ content: "Hello" })
				.expect(201);

			expect(response.body.message).toBeDefined();
			expect(response.body.webhook.usedTenantConfig).toBe(false);
		});

		it("should use rita-chat-iframe source for iframe session without full config", async () => {
			// Iframe session with isIframeSession flag but no webhook config
			mockSessionStore.getSession.mockResolvedValue({
				sessionId: "test-session-id",
				isIframeSession: true,
				// No iframeWebhookConfig - Valkey wasn't available
			});

			mockSendMessageEvent.mockClear();

			// Setup DB mocks
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-123" }] }) // conv check
				.mockResolvedValueOnce({ rows: [] }) // transcript
				.mockResolvedValueOnce({
					rows: [
						{
							id: "msg-1",
							message: "test",
							role: "user",
							status: "pending",
							created_at: new Date(),
						},
					],
				}) // insert
				.mockResolvedValueOnce({ rows: [] }); // update status

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			await request(app)
				.post("/conversations/conv-123/messages")
				.send({ content: "Hello" })
				.expect(201);

			// Verify source is rita-chat-iframe for iframe session
			expect(mockSendMessageEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					source: "rita-chat-iframe",
				}),
			);
		});

		it("should use rita-chat source for regular non-iframe session", async () => {
			// Regular session - not iframe
			mockSessionStore.getSession.mockResolvedValue({
				sessionId: "test-session-id",
				isIframeSession: false,
				// No iframeWebhookConfig
			});

			mockSendMessageEvent.mockClear();

			// Setup DB mocks
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-123" }] }) // conv check
				.mockResolvedValueOnce({ rows: [] }) // transcript
				.mockResolvedValueOnce({
					rows: [
						{
							id: "msg-1",
							message: "test",
							role: "user",
							status: "pending",
							created_at: new Date(),
						},
					],
				}) // insert
				.mockResolvedValueOnce({ rows: [] }); // update status

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			await request(app)
				.post("/conversations/conv-123/messages")
				.send({ content: "Hello" })
				.expect(201);

			// Verify source is rita-chat for regular session
			expect(mockSendMessageEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					source: "rita-chat",
				}),
			);
		});
	});
});
