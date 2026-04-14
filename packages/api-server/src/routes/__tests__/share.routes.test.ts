import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the pool (share routes use pool directly, not withOrgContext)
vi.mock("../../config/database.js", () => ({
	pool: { query: vi.fn() },
	withOrgContext: vi.fn(),
}));

// Mock UUID validation — test IDs are not real UUIDs
vi.mock("../../config/validateUuid.js", () => ({
	assertUuid: vi.fn(),
}));

// Mock authenticateUser — inject test user into req
vi.mock("../../middleware/auth.js", () => ({
	authenticateUser: vi.fn((req, _res, next) => {
		(req as any).user = {
			id: "test-user-id",
			activeOrganizationId: "test-org-id",
			email: "test@example.com",
		};
		next();
	}),
}));

import { pool } from "../../config/database.js";
import { assertUuid } from "../../config/validateUuid.js";
import shareRouter, { authenticatedShareRouter } from "../share.routes.js";

// Fixtures
const mockSharedRow = {
	share_id: "abc123def456abc123def456abc123de",
	conversation_id: "conv-123",
	title: "Test Conversation",
	messages: [
		{
			id: "msg-1",
			role: "user",
			message: "Hello",
			metadata: null,
			response_group_id: null,
			created_at: "2025-01-01T00:00:00Z",
		},
		{
			id: "msg-2",
			role: "assistant",
			message: "Hi there",
			metadata: { reasoning: { content: "Thinking..." } },
			response_group_id: "grp-1",
			created_at: "2025-01-01T00:00:01Z",
		},
	],
	created_at: "2025-01-01T00:00:00Z",
};

const mockMessages = [
	{
		id: "msg-1",
		role: "user",
		message: "Hello",
		metadata: null,
		response_group_id: null,
		created_at: new Date("2025-01-01T00:00:00Z"),
	},
	{
		id: "msg-2",
		role: "assistant",
		message: "Hi there",
		metadata: { reasoning: { content: "Thinking..." } },
		response_group_id: "grp-1",
		created_at: new Date("2025-01-01T00:00:01Z"),
	},
];

const mockPool = pool as unknown as { query: ReturnType<typeof vi.fn> };

describe("Share Routes — Snapshot Model", () => {
	let app: express.Application;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use("/api/share", shareRouter);
		app.use("/api/conversations", authenticatedShareRouter);

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ========================================================================
	// GET /api/share/:shareId (public, no auth)
	// ========================================================================
	describe("GET /api/share/:shareId", () => {
		it("returns 200 with snapshot when shareId exists", async () => {
			mockPool.query.mockResolvedValueOnce({ rows: [mockSharedRow] });

			const response = await request(app)
				.get("/api/share/abc123def456abc123def456abc123de")
				.expect(200);

			expect(response.body).toHaveProperty("conversation");
			expect(response.body).toHaveProperty("messages");
			expect(response.body.conversation).toEqual({
				id: "conv-123",
				title: "Test Conversation",
				created_at: "2025-01-01T00:00:00Z",
			});
			expect(response.body.messages).toHaveLength(2);
		});

		it("returns response shape: { conversation: { id, title, created_at }, messages }", async () => {
			mockPool.query.mockResolvedValueOnce({ rows: [mockSharedRow] });

			const response = await request(app)
				.get("/api/share/abc123def456abc123def456abc123de")
				.expect(200);

			const conv = response.body.conversation;
			expect(Object.keys(conv).sort()).toEqual(["created_at", "id", "title"]);
		});

		it("passes messages through as-is from JSONB", async () => {
			const customMessages = [
				{ id: "m1", role: "user", message: "test", metadata: { foo: "bar" } },
			];
			mockPool.query.mockResolvedValueOnce({
				rows: [{ ...mockSharedRow, messages: customMessages }],
			});

			const response = await request(app)
				.get("/api/share/some-share-id")
				.expect(200);

			expect(response.body.messages).toEqual(customMessages);
		});

		it("returns 404 when shareId doesn't exist", async () => {
			mockPool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.get("/api/share/nonexistent-share-id")
				.expect(404);

			expect(response.body.error).toBe("Shared conversation not found");
		});

		it("returns 400 when shareId exceeds 128 chars", async () => {
			const longId = "a".repeat(129);

			const response = await request(app)
				.get(`/api/share/${longId}`)
				.expect(400);

			expect(response.body.error).toBe("Invalid shareId");
		});

		it("returns 500 on database error", async () => {
			mockPool.query.mockRejectedValueOnce(new Error("DB connection lost"));

			const response = await request(app)
				.get("/api/share/some-share-id")
				.expect(500);

			expect(response.body.error).toBe("Internal server error");
		});

		it("queries shared_conversations table by share_id", async () => {
			mockPool.query.mockResolvedValueOnce({ rows: [] });

			await request(app).get("/api/share/test-id").expect(404);

			const queryCall = mockPool.query.mock.calls[0];
			expect(queryCall[0]).toContain("shared_conversations");
			expect(queryCall[0]).toContain("share_id = $1");
			expect(queryCall[1]).toEqual(["test-id"]);
		});
	});

	// ========================================================================
	// POST /api/conversations/:conversationId/share/enable (authenticated)
	// ========================================================================
	describe("POST /api/conversations/:conversationId/share/enable", () => {
		it("returns 200 with { shareUrl, shareId } on success", async () => {
			// 1. SELECT conversation (ownership check)
			mockPool.query.mockResolvedValueOnce({
				rows: [{ id: "conv-123", title: "Test Chat" }],
			});
			// 2. SELECT messages
			mockPool.query.mockResolvedValueOnce({ rows: mockMessages });
			// 3. INSERT ... ON CONFLICT
			mockPool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.post("/api/conversations/conv-123/share/enable")
				.expect(200);

			expect(response.body).toHaveProperty("shareUrl");
			expect(response.body).toHaveProperty("shareId");
		});

		it("shareId is 32-char hex (16 bytes as hex)", async () => {
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: "conv-123", title: "Test Chat" }],
				})
				.mockResolvedValueOnce({ rows: mockMessages })
				.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.post("/api/conversations/conv-123/share/enable")
				.expect(200);

			expect(response.body.shareId).toMatch(/^[a-f0-9]{32}$/);
		});

		it("shareUrl contains /jarvis/{shareId}", async () => {
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: "conv-123", title: "Test Chat" }],
				})
				.mockResolvedValueOnce({ rows: mockMessages })
				.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.post("/api/conversations/conv-123/share/enable")
				.expect(200);

			expect(response.body.shareUrl).toContain(
				`/jarvis/${response.body.shareId}`,
			);
		});

		it("returns 400 for invalid UUID conversationId", async () => {
			vi.mocked(assertUuid).mockImplementationOnce(() => {
				throw new Error("Invalid UUID");
			});

			const response = await request(app)
				.post("/api/conversations/not-a-uuid/share/enable")
				.expect(400);

			expect(response.body.error).toBe("Invalid conversationId format");
		});

		it("returns 404 when conversation not owned", async () => {
			mockPool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.post("/api/conversations/conv-123/share/enable")
				.expect(404);

			expect(response.body.error).toBe("Conversation not found");
		});

		it("verifies ownership with organization_id AND user_id", async () => {
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: "conv-123", title: "Test Chat" }],
				})
				.mockResolvedValueOnce({ rows: [] })
				.mockResolvedValueOnce({ rows: [] });

			await request(app)
				.post("/api/conversations/conv-123/share/enable")
				.expect(200);

			const ownershipQuery = mockPool.query.mock.calls[0];
			expect(ownershipQuery[0]).toContain("organization_id");
			expect(ownershipQuery[0]).toContain("user_id");
			expect(ownershipQuery[1]).toContain("test-org-id");
			expect(ownershipQuery[1]).toContain("test-user-id");
		});

		it("makes three pool.query calls: ownership, messages, upsert", async () => {
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: "conv-123", title: "Test Chat" }],
				})
				.mockResolvedValueOnce({ rows: mockMessages })
				.mockResolvedValueOnce({ rows: [] });

			await request(app)
				.post("/api/conversations/conv-123/share/enable")
				.expect(200);

			expect(mockPool.query).toHaveBeenCalledTimes(3);

			// Call 1: ownership check
			expect(mockPool.query.mock.calls[0][0]).toContain(
				"SELECT id, title FROM conversations",
			);
			// Call 2: fetch messages
			expect(mockPool.query.mock.calls[1][0]).toContain(
				"SELECT id, role, message, metadata",
			);
			// Call 3: upsert into shared_conversations
			expect(mockPool.query.mock.calls[2][0]).toContain(
				"INSERT INTO shared_conversations",
			);
			expect(mockPool.query.mock.calls[2][0]).toContain(
				"ON CONFLICT (conversation_id) DO UPDATE",
			);
		});

		it("snapshot captures messages stringified as 4th param", async () => {
			mockPool.query
				.mockResolvedValueOnce({
					rows: [{ id: "conv-123", title: "My Chat" }],
				})
				.mockResolvedValueOnce({ rows: mockMessages })
				.mockResolvedValueOnce({ rows: [] });

			await request(app)
				.post("/api/conversations/conv-123/share/enable")
				.expect(200);

			const upsertParams = mockPool.query.mock.calls[2][1];
			// $4 is JSON.stringify(messagesResult.rows)
			expect(upsertParams[3]).toBe(JSON.stringify(mockMessages));
		});

		it("returns 500 on database error", async () => {
			mockPool.query.mockRejectedValueOnce(new Error("DB down"));

			const response = await request(app)
				.post("/api/conversations/conv-123/share/enable")
				.expect(500);

			expect(response.body.error).toBe("Internal server error");
		});
	});

	// ========================================================================
	// POST /api/conversations/:conversationId/share/disable (authenticated)
	// ========================================================================
	describe("POST /api/conversations/:conversationId/share/disable", () => {
		it("returns 200 with { success: true } on success", async () => {
			// 1. ownership check
			mockPool.query.mockResolvedValueOnce({
				rows: [{ id: "conv-123" }],
			});
			// 2. DELETE
			mockPool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.post("/api/conversations/conv-123/share/disable")
				.expect(200);

			expect(response.body).toEqual({ success: true });
		});

		it("returns 400 for invalid UUID conversationId", async () => {
			vi.mocked(assertUuid).mockImplementationOnce(() => {
				throw new Error("Invalid UUID");
			});

			const response = await request(app)
				.post("/api/conversations/not-a-uuid/share/disable")
				.expect(400);

			expect(response.body.error).toBe("Invalid conversationId format");
		});

		it("returns 404 when conversation not owned", async () => {
			mockPool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.post("/api/conversations/conv-123/share/disable")
				.expect(404);

			expect(response.body.error).toBe("Conversation not found");
		});

		it("issues DELETE FROM shared_conversations WHERE conversation_id = $1", async () => {
			mockPool.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-123" }] })
				.mockResolvedValueOnce({ rows: [] });

			await request(app)
				.post("/api/conversations/conv-123/share/disable")
				.expect(200);

			const deleteCall = mockPool.query.mock.calls[1];
			expect(deleteCall[0]).toContain("DELETE FROM shared_conversations");
			expect(deleteCall[0]).toContain("conversation_id = $1");
			expect(deleteCall[1]).toEqual(["conv-123"]);
		});

		it("returns 500 on database error", async () => {
			mockPool.query.mockRejectedValueOnce(new Error("DB down"));

			const response = await request(app)
				.post("/api/conversations/conv-123/share/disable")
				.expect(500);

			expect(response.body.error).toBe("Internal server error");
		});
	});
});
