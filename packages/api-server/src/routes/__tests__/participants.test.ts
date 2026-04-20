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
		(req as any).user = {
			id: "test-user-id",
			activeOrganizationId: "test-org-id",
			email: "test@example.com",
		};
		(req as any).session = { sessionId: "test-session-id" };
		next();
	}),
}));

vi.mock("../../services/WebhookService.js", () => {
	return {
		WebhookService: class MockWebhookService {
			sendMessageEvent = vi.fn().mockResolvedValue({ success: true });
			sendTenantMessageEvent = vi.fn().mockResolvedValue({ success: true });
		},
	};
});

vi.mock("../../services/sessionStore.js", () => ({
	getSessionStore: () => ({
		getSession: vi.fn(),
	}),
}));

import { withOrgContext } from "../../config/database.js";

describe("Participants API", () => {
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

	// =========================================================================
	// GET /conversations/:conversationId/participants
	// =========================================================================
	describe("GET /conversations/:conversationId/participants", () => {
		it("returns 200 with owner + participants list", async () => {
			mockClient.query
				.mockResolvedValueOnce({
					rows: [{ id: "conv-1", user_id: "test-user-id" }],
				}) // conv check
				.mockResolvedValueOnce({
					rows: [
						{
							user_id: "participant-1",
							role: "participant",
							added_at: "2026-01-01T00:00:00Z",
							email: "p1@example.com",
							first_name: "Alice",
							last_name: "Smith",
						},
					],
				}); // participants query

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.get("/conversations/conv-1/participants")
				.expect(200);

			expect(response.body.owner).toBe("test-user-id");
			expect(response.body.participants).toHaveLength(1);
			expect(response.body.participants[0].user_id).toBe("participant-1");
		});

		it("returns 404 when conversation not found (RLS blocks)", async () => {
			mockClient.query.mockResolvedValueOnce({ rows: [] }); // conv check empty

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.get("/conversations/conv-missing/participants")
				.expect(404);

			expect(response.body.error).toBe("Conversation not found");
		});

		it("returns participant details (user_id, role, added_at, email)", async () => {
			const addedAt = "2026-03-15T10:30:00Z";
			mockClient.query
				.mockResolvedValueOnce({
					rows: [{ id: "conv-1", user_id: "test-user-id" }],
				})
				.mockResolvedValueOnce({
					rows: [
						{
							user_id: "p-abc",
							role: "participant",
							added_at: addedAt,
							email: "abc@example.com",
							first_name: "Bob",
							last_name: "Jones",
						},
					],
				});

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.get("/conversations/conv-1/participants")
				.expect(200);

			const p = response.body.participants[0];
			expect(p.user_id).toBe("p-abc");
			expect(p.role).toBe("participant");
			expect(p.added_at).toBe(addedAt);
			expect(p.email).toBe("abc@example.com");
		});

		it("returns empty participants array when conversation has none", async () => {
			mockClient.query
				.mockResolvedValueOnce({
					rows: [{ id: "conv-1", user_id: "test-user-id" }],
				})
				.mockResolvedValueOnce({ rows: [] }); // no participants

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.get("/conversations/conv-1/participants")
				.expect(200);

			expect(response.body.owner).toBe("test-user-id");
			expect(response.body.participants).toEqual([]);
		});

		it("returns 500 on database error", async () => {
			vi.mocked(withOrgContext).mockRejectedValueOnce(
				new Error("DB connection lost"),
			);

			const response = await request(app)
				.get("/conversations/conv-1/participants")
				.expect(500);

			expect(response.body.error).toBe("Failed to list participants");
		});
	});

	// =========================================================================
	// POST /conversations/:conversationId/participants
	// =========================================================================
	describe("POST /conversations/:conversationId/participants", () => {
		it("returns 201 on successful add", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-1" }] }) // ownership check
				.mockResolvedValueOnce({
					rows: [{ user_id: "new-user" }],
				}) // org membership check
				.mockResolvedValueOnce({ rowCount: 1 }); // INSERT

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.post("/conversations/conv-1/participants")
				.send({ userId: "new-user" })
				.expect(201);

			expect(response.body.success).toBe(true);

			// Verify INSERT query uses ON CONFLICT DO NOTHING
			const insertCall = mockClient.query.mock.calls[2];
			expect(insertCall[0]).toContain("ON CONFLICT");
			expect(insertCall[0]).toContain("DO NOTHING");
		});

		it("returns 400 when userId missing from body", async () => {
			const response = await request(app)
				.post("/conversations/conv-1/participants")
				.send({})
				.expect(400);

			expect(response.body.error).toBe("userId is required");
		});

		it("returns 400 when userId is not a string", async () => {
			const response = await request(app)
				.post("/conversations/conv-1/participants")
				.send({ userId: 12345 })
				.expect(400);

			expect(response.body.error).toBe("userId is required");
		});

		it("returns 404 when conversation not owned by requester", async () => {
			mockClient.query.mockResolvedValueOnce({ rows: [] }); // ownership check fails

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.post("/conversations/conv-1/participants")
				.send({ userId: "some-user" })
				.expect(404);

			expect(response.body.error).toBe("Conversation not found");
		});

		it("returns 400 when target user not in organization", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-1" }] }) // ownership ok
				.mockResolvedValueOnce({ rows: [] }); // org membership check fails

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.post("/conversations/conv-1/participants")
				.send({ userId: "outside-user" })
				.expect(400);

			expect(response.body.error).toBe("User not found in this organization");
		});

		it("is idempotent — adding same participant twice returns 201", async () => {
			// ON CONFLICT DO NOTHING means no error on duplicate
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-1" }] })
				.mockResolvedValueOnce({ rows: [{ user_id: "dup-user" }] })
				.mockResolvedValueOnce({ rowCount: 0 }); // 0 rows affected (already exists)

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.post("/conversations/conv-1/participants")
				.send({ userId: "dup-user" })
				.expect(201);

			expect(response.body.success).toBe(true);
		});

		it("returns 500 on database error", async () => {
			vi.mocked(withOrgContext).mockRejectedValueOnce(
				new Error("Query timeout"),
			);

			const response = await request(app)
				.post("/conversations/conv-1/participants")
				.send({ userId: "new-user" })
				.expect(500);

			expect(response.body.error).toBe("Failed to add participant");
		});

		it("verifies ownership check query includes user_id = $3", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-1" }] })
				.mockResolvedValueOnce({ rows: [{ user_id: "target" }] })
				.mockResolvedValueOnce({ rowCount: 1 });

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			await request(app)
				.post("/conversations/conv-1/participants")
				.send({ userId: "target" })
				.expect(201);

			// First query is the ownership check
			const ownershipQuery = mockClient.query.mock.calls[0];
			expect(ownershipQuery[0]).toContain("user_id = $3");
			expect(ownershipQuery[1]).toContain("test-user-id"); // owner's id at $3
		});

		it("verifies org membership check on target user", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-1" }] })
				.mockResolvedValueOnce({ rows: [{ user_id: "target-user" }] })
				.mockResolvedValueOnce({ rowCount: 1 });

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			await request(app)
				.post("/conversations/conv-1/participants")
				.send({ userId: "target-user" })
				.expect(201);

			// Second query is the org membership check
			const membershipQuery = mockClient.query.mock.calls[1];
			expect(membershipQuery[0]).toContain("organization_members");
			expect(membershipQuery[1]).toContain("target-user");
			expect(membershipQuery[1]).toContain("test-org-id");
		});
	});

	// =========================================================================
	// DELETE /conversations/:conversationId/participants/:userId
	// =========================================================================
	describe("DELETE /conversations/:conversationId/participants/:userId", () => {
		it("returns 200 with { success: true } on successful remove", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-1" }] }) // ownership check
				.mockResolvedValueOnce({ rowCount: 1 }); // DELETE

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.delete("/conversations/conv-1/participants/target-user")
				.expect(200);

			expect(response.body.success).toBe(true);
		});

		it("returns 404 when conversation not owned by requester", async () => {
			mockClient.query.mockResolvedValueOnce({ rows: [] }); // ownership fails

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.delete("/conversations/conv-1/participants/target-user")
				.expect(404);

			expect(response.body.error).toBe("Conversation not found");
		});

		it("returns 200 even when participant did not exist (DELETE 0 rows)", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-1" }] }) // ownership ok
				.mockResolvedValueOnce({ rowCount: 0 }); // no rows deleted

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.delete("/conversations/conv-1/participants/nonexistent-user")
				.expect(200);

			expect(response.body.success).toBe(true);
		});

		it("returns 500 on database error", async () => {
			vi.mocked(withOrgContext).mockRejectedValueOnce(
				new Error("Connection refused"),
			);

			const response = await request(app)
				.delete("/conversations/conv-1/participants/target-user")
				.expect(500);

			expect(response.body.error).toBe("Failed to remove participant");
		});

		it("verifies DELETE scopes by conversation_id + user_id + organization_id", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-1" }] })
				.mockResolvedValueOnce({ rowCount: 1 });

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			await request(app)
				.delete("/conversations/conv-1/participants/target-user")
				.expect(200);

			const deleteCall = mockClient.query.mock.calls[1];
			expect(deleteCall[0]).toContain("conversation_id = $1");
			expect(deleteCall[0]).toContain("user_id = $2");
			expect(deleteCall[0]).toContain("organization_id = $3");
			expect(deleteCall[1]).toEqual(["conv-1", "target-user", "test-org-id"]);
		});
	});

	// =========================================================================
	// Conversation list — is_owner flag
	// =========================================================================
	describe("GET /conversations — participant-aware list", () => {
		it("returns is_owner flag for each conversation", async () => {
			mockClient.query
				.mockResolvedValueOnce({
					rows: [
						{
							id: "conv-owned",
							title: "My Chat",
							created_at: new Date(),
							updated_at: new Date(),
							user_email: "test@example.com",
							is_owner: true,
						},
						{
							id: "conv-shared",
							title: "Shared Chat",
							created_at: new Date(),
							updated_at: new Date(),
							user_email: "other@example.com",
							is_owner: false,
						},
					],
				}) // conversations query
				.mockResolvedValueOnce({ rows: [{ total: "2" }] }); // count query

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app).get("/conversations").expect(200);

			expect(response.body.conversations).toHaveLength(2);
			expect(response.body.conversations[0].is_owner).toBe(true);
			expect(response.body.conversations[1].is_owner).toBe(false);
		});

		it("conversation list relies on RLS — no explicit user_id in WHERE", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [] })
				.mockResolvedValueOnce({ rows: [{ total: "0" }] });

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			await request(app).get("/conversations").expect(200);

			// The conversations SELECT should NOT have user_id in WHERE
			const listQuery = mockClient.query.mock.calls[0][0];
			// WHERE clause should only filter by organization_id, not user_id
			const whereClause = listQuery
				.substring(listQuery.indexOf("WHERE"))
				.split("ORDER")[0];
			expect(whereClause).not.toMatch(/WHERE.*user_id\s*=/);
		});
	});

	// =========================================================================
	// Message cursor — participant_since floor
	// =========================================================================
	describe("GET /conversations/:conversationId/messages — participant cursor", () => {
		it("owner gets messages without time floor (messageFloor = Date(0))", async () => {
			mockClient.query
				.mockResolvedValueOnce({
					rows: [
						{
							id: "conv-1",
							user_id: "test-user-id",
							is_owner: true,
							participant_since: null,
						},
					],
				}) // access check
				.mockResolvedValueOnce({
					rows: [
						{
							id: "msg-1",
							message: "Hello",
							role: "user",
							response_content: null,
							status: "completed",
							created_at: new Date("2026-01-01"),
							processed_at: null,
							error_message: null,
							metadata: null,
							response_group_id: null,
							user_email: "test@example.com",
						},
					],
				}); // messages query

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.get("/conversations/conv-1/messages")
				.expect(200);

			expect(response.body.messages).toHaveLength(1);

			// Verify the messageFloor param is Date(0) for owner
			const messagesCall = mockClient.query.mock.calls[1];
			const floorParam = messagesCall[1][messagesCall[1].length - 1];
			expect(new Date(floorParam).getTime()).toBe(new Date(0).getTime());
		});

		it("participant gets messages from added_at forward", async () => {
			const participantSince = "2026-06-15T12:00:00Z";
			mockClient.query
				.mockResolvedValueOnce({
					rows: [
						{
							id: "conv-1",
							user_id: "owner-id",
							is_owner: false,
							participant_since: participantSince,
						},
					],
				}) // access check — not owner
				.mockResolvedValueOnce({ rows: [] }); // messages query

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			await request(app).get("/conversations/conv-1/messages").expect(200);

			// Verify the messageFloor param matches participant_since
			const messagesCall = mockClient.query.mock.calls[1];
			const floorParam = messagesCall[1][messagesCall[1].length - 1];
			expect(new Date(floorParam).getTime()).toBe(
				new Date(participantSince).getTime(),
			);
		});

		it("access check query returns is_owner + participant_since from LEFT JOIN", async () => {
			mockClient.query
				.mockResolvedValueOnce({
					rows: [
						{
							id: "conv-1",
							user_id: "test-user-id",
							is_owner: true,
							participant_since: null,
						},
					],
				})
				.mockResolvedValueOnce({ rows: [] });

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			await request(app).get("/conversations/conv-1/messages").expect(200);

			const accessQuery = mockClient.query.mock.calls[0][0];
			expect(accessQuery).toContain("is_owner");
			expect(accessQuery).toContain("participant_since");
			expect(accessQuery).toContain("LEFT JOIN conversation_participants");
		});
	});
});
