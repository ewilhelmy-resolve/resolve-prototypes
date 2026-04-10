import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the pool (share routes use pool directly, not withOrgContext)
vi.mock("../../config/database.js", () => ({
	pool: { query: vi.fn() },
	withOrgContext: vi.fn(),
}));

import { pool } from "../../config/database.js";
import shareRouter from "../share.routes.js";

// Fixtures
const mockConversation = {
	id: "conv-123",
	title: "Test Conversation",
	created_at: new Date("2025-01-01T00:00:00Z"),
	share_status: "public",
	share_token: null,
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
		message: "",
		metadata: { reasoning: { content: "Thinking..." } },
		response_group_id: "grp-1",
		created_at: new Date("2025-01-01T00:00:01Z"),
	},
	{
		id: "msg-3",
		role: "assistant",
		message: "Here is my answer",
		metadata: {
			sources: [{ url: "https://docs.example.com", title: "Docs" }],
		},
		response_group_id: "grp-1",
		created_at: new Date("2025-01-01T00:00:02Z"),
	},
];

const mockPool = pool as unknown as { query: ReturnType<typeof vi.fn> };

describe("Share Routes", () => {
	let app: express.Application;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use("/api/share", shareRouter);

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("GET /api/share/:conversationId", () => {
		it("returns 200 with conversation and messages for public conversation", async () => {
			mockPool.query
				.mockResolvedValueOnce({ rows: [mockConversation] })
				.mockResolvedValueOnce({ rows: mockMessages });

			const response = await request(app)
				.get("/api/share/conv-123")
				.expect(200);

			expect(response.body).toHaveProperty("conversation");
			expect(response.body).toHaveProperty("messages");
			expect(response.body.conversation).toEqual({
				id: "conv-123",
				title: "Test Conversation",
				created_at: "2025-01-01T00:00:00.000Z",
			});
			expect(response.body.messages).toHaveLength(3);
		});

		it("returns conversation with id, title, created_at only", async () => {
			mockPool.query
				.mockResolvedValueOnce({ rows: [mockConversation] })
				.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.get("/api/share/conv-123")
				.expect(200);

			const conv = response.body.conversation;
			expect(Object.keys(conv)).toEqual(
				expect.arrayContaining(["id", "title", "created_at"]),
			);
			// share_status and share_token should NOT be exposed
			expect(conv).not.toHaveProperty("share_status");
			expect(conv).not.toHaveProperty("share_token");
		});

		it("returns messages with expected fields", async () => {
			mockPool.query
				.mockResolvedValueOnce({ rows: [mockConversation] })
				.mockResolvedValueOnce({ rows: mockMessages });

			const response = await request(app)
				.get("/api/share/conv-123")
				.expect(200);

			const msg = response.body.messages[0];
			expect(msg).toHaveProperty("id");
			expect(msg).toHaveProperty("role");
			expect(msg).toHaveProperty("message");
			expect(msg).toHaveProperty("metadata");
			expect(msg).toHaveProperty("response_group_id");
			expect(msg).toHaveProperty("created_at");
		});

		it("returns messages ordered chronologically (ASC)", async () => {
			mockPool.query
				.mockResolvedValueOnce({ rows: [mockConversation] })
				.mockResolvedValueOnce({ rows: mockMessages });

			const response = await request(app)
				.get("/api/share/conv-123")
				.expect(200);

			const messages = response.body.messages;
			for (let i = 1; i < messages.length; i++) {
				expect(
					new Date(messages[i].created_at).getTime(),
				).toBeGreaterThanOrEqual(
					new Date(messages[i - 1].created_at).getTime(),
				);
			}
		});

		it("queries messages with ORDER BY created_at ASC", async () => {
			mockPool.query
				.mockResolvedValueOnce({ rows: [mockConversation] })
				.mockResolvedValueOnce({ rows: [] });

			await request(app).get("/api/share/conv-123").expect(200);

			const messagesQuery = mockPool.query.mock.calls[1];
			expect(messagesQuery[0]).toMatch(/ORDER BY created_at ASC/);
		});

		it("returns 403 for private conversation", async () => {
			const privateConv = { ...mockConversation, share_status: "private" };
			mockPool.query.mockResolvedValueOnce({ rows: [privateConv] });

			const response = await request(app)
				.get("/api/share/conv-123")
				.expect(403);

			expect(response.body.error).toBe("This conversation is not shared");
		});

		it("returns 403 when share_status is null (treated as private)", async () => {
			const nullStatusConv = {
				...mockConversation,
				share_status: null,
			};
			mockPool.query.mockResolvedValueOnce({ rows: [nullStatusConv] });

			const response = await request(app)
				.get("/api/share/conv-123")
				.expect(403);

			expect(response.body.error).toBe("This conversation is not shared");
		});

		it("returns 404 when conversation not found", async () => {
			mockPool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.get("/api/share/nonexistent")
				.expect(404);

			expect(response.body.error).toBe("Conversation not found");
		});

		describe("token-protected conversation", () => {
			const tokenConv = {
				...mockConversation,
				share_status: "token",
				share_token: "abc123validtoken",
			};

			it("returns 200 with valid token", async () => {
				mockPool.query
					.mockResolvedValueOnce({ rows: [tokenConv] })
					.mockResolvedValueOnce({ rows: mockMessages });

				const response = await request(app)
					.get("/api/share/conv-123?token=abc123validtoken")
					.expect(200);

				expect(response.body).toHaveProperty("conversation");
				expect(response.body).toHaveProperty("messages");
				expect(response.body.messages).toHaveLength(3);
			});

			it("returns 403 when token is missing", async () => {
				mockPool.query.mockResolvedValueOnce({ rows: [tokenConv] });

				const response = await request(app)
					.get("/api/share/conv-123")
					.expect(403);

				expect(response.body.error).toBe(
					"Token required for this shared conversation",
				);
			});

			it("returns 403 when token is wrong", async () => {
				mockPool.query.mockResolvedValueOnce({ rows: [tokenConv] });

				const response = await request(app)
					.get("/api/share/conv-123?token=wrongtoken")
					.expect(403);

				expect(response.body.error).toBe("Invalid share token");
			});
		});

		describe("messages with various metadata types", () => {
			it("passes through reasoning metadata", async () => {
				const reasoningMsg = [
					{
						id: "msg-r",
						role: "assistant",
						message: "",
						metadata: { reasoning: { content: "Thinking..." } },
						response_group_id: "grp-1",
						created_at: new Date("2025-01-01T00:00:01Z"),
					},
				];
				mockPool.query
					.mockResolvedValueOnce({ rows: [mockConversation] })
					.mockResolvedValueOnce({ rows: reasoningMsg });

				const response = await request(app)
					.get("/api/share/conv-123")
					.expect(200);

				const meta = response.body.messages[0].metadata;
				expect(meta).toHaveProperty("reasoning");
				expect(meta.reasoning.content).toBe("Thinking...");
			});

			it("passes through sources metadata", async () => {
				const sourcesMsg = [
					{
						id: "msg-s",
						role: "assistant",
						message: "Answer",
						metadata: {
							sources: [{ url: "https://docs.example.com", title: "Docs" }],
						},
						response_group_id: "grp-1",
						created_at: new Date("2025-01-01T00:00:02Z"),
					},
				];
				mockPool.query
					.mockResolvedValueOnce({ rows: [mockConversation] })
					.mockResolvedValueOnce({ rows: sourcesMsg });

				const response = await request(app)
					.get("/api/share/conv-123")
					.expect(200);

				const meta = response.body.messages[0].metadata;
				expect(Array.isArray(meta.sources)).toBe(true);
				expect(meta.sources[0].url).toBe("https://docs.example.com");
			});

			it("passes through completion metadata", async () => {
				const completionMsg = [
					{
						id: "msg-c",
						role: "assistant",
						message: "Done",
						metadata: {
							completion: { status: "done", tokens: 150 },
						},
						response_group_id: "grp-1",
						created_at: new Date("2025-01-01T00:00:03Z"),
					},
				];
				mockPool.query
					.mockResolvedValueOnce({ rows: [mockConversation] })
					.mockResolvedValueOnce({ rows: completionMsg });

				const response = await request(app)
					.get("/api/share/conv-123")
					.expect(200);

				const meta = response.body.messages[0].metadata;
				expect(meta).toHaveProperty("completion");
				expect(meta.completion.status).toBe("done");
			});

			it("passes through null metadata", async () => {
				const nullMetaMsg = [
					{
						id: "msg-n",
						role: "user",
						message: "Hello",
						metadata: null,
						response_group_id: null,
						created_at: new Date("2025-01-01T00:00:00Z"),
					},
				];
				mockPool.query
					.mockResolvedValueOnce({ rows: [mockConversation] })
					.mockResolvedValueOnce({ rows: nullMetaMsg });

				const response = await request(app)
					.get("/api/share/conv-123")
					.expect(200);

				expect(response.body.messages[0].metadata).toBeNull();
			});

			it("returns empty array when conversation has no messages", async () => {
				mockPool.query
					.mockResolvedValueOnce({ rows: [mockConversation] })
					.mockResolvedValueOnce({ rows: [] });

				const response = await request(app)
					.get("/api/share/conv-123")
					.expect(200);

				expect(response.body.messages).toEqual([]);
			});
		});

		it("returns 500 on database error", async () => {
			mockPool.query.mockRejectedValueOnce(new Error("DB connection lost"));

			const response = await request(app)
				.get("/api/share/conv-123")
				.expect(500);

			expect(response.body.error).toBe("Internal server error");
		});
	});

	describe("POST /api/share/:conversationId/enable", () => {
		it("enables public sharing and returns shareUrl without token", async () => {
			mockPool.query.mockResolvedValueOnce({
				rows: [
					{
						id: "conv-123",
						share_status: "public",
						share_token: null,
					},
				],
			});

			const response = await request(app)
				.post("/api/share/conv-123/enable")
				.send({ mode: "public" })
				.expect(200);

			expect(response.body).toHaveProperty("shareUrl");
			expect(response.body).toHaveProperty("shareStatus", "public");
			expect(response.body.shareUrl).toContain("/jarvis/conv-123");
			expect(response.body.shareUrl).not.toContain("token=");
			expect(response.body.shareToken).toBeUndefined();
		});

		it("enables token sharing and returns shareUrl with token", async () => {
			mockPool.query.mockResolvedValueOnce({
				rows: [
					{
						id: "conv-123",
						share_status: "token",
						share_token: "generated-token",
					},
				],
			});

			const response = await request(app)
				.post("/api/share/conv-123/enable")
				.send({ mode: "token" })
				.expect(200);

			expect(response.body).toHaveProperty("shareUrl");
			expect(response.body).toHaveProperty("shareToken");
			expect(response.body).toHaveProperty("shareStatus", "token");
			expect(response.body.shareUrl).toContain("?token=");
			// Token is 64-char hex (32 bytes as hex)
			expect(response.body.shareToken).toMatch(/^[a-f0-9]{64}$/);
		});

		it("generates 64-character hex token for token mode", async () => {
			mockPool.query.mockResolvedValueOnce({
				rows: [
					{
						id: "conv-123",
						share_status: "token",
						share_token: "will-be-overridden",
					},
				],
			});

			const response = await request(app)
				.post("/api/share/conv-123/enable")
				.send({ mode: "token" })
				.expect(200);

			// Verify the token stored in DB is the 64-char hex
			const updateCall = mockPool.query.mock.calls[0];
			const tokenArg = updateCall[1][1]; // $2 = share_token
			expect(tokenArg).toMatch(/^[a-f0-9]{64}$/);
			// shareToken in response matches what was stored
			expect(response.body.shareToken).toBe(tokenArg);
		});

		it("returns 400 for invalid mode", async () => {
			const response = await request(app)
				.post("/api/share/conv-123/enable")
				.send({ mode: "invalid" })
				.expect(400);

			expect(response.body.error).toBe("mode must be 'public' or 'token'");
		});

		it("returns 404 when conversation not found", async () => {
			mockPool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.post("/api/share/nonexistent/enable")
				.send({ mode: "public" })
				.expect(404);

			expect(response.body.error).toBe("Conversation not found");
		});

		it("defaults to public mode when no body provided", async () => {
			mockPool.query.mockResolvedValueOnce({
				rows: [
					{
						id: "conv-123",
						share_status: "public",
						share_token: null,
					},
				],
			});

			const response = await request(app)
				.post("/api/share/conv-123/enable")
				.send({})
				.expect(200);

			expect(response.body.shareStatus).toBe("public");
			expect(response.body.shareToken).toBeUndefined();
		});

		it("returns 500 on database error", async () => {
			mockPool.query.mockRejectedValueOnce(new Error("DB down"));

			const response = await request(app)
				.post("/api/share/conv-123/enable")
				.send({ mode: "public" })
				.expect(500);

			expect(response.body.error).toBe("Internal server error");
		});
	});

	describe("POST /api/share/:conversationId/disable", () => {
		it("disables sharing and returns success", async () => {
			mockPool.query.mockResolvedValueOnce({
				rows: [{ id: "conv-123" }],
			});

			const response = await request(app)
				.post("/api/share/conv-123/disable")
				.expect(200);

			expect(response.body).toEqual({ success: true });
		});

		it("sets share_status to private and share_token to NULL", async () => {
			mockPool.query.mockResolvedValueOnce({
				rows: [{ id: "conv-123" }],
			});

			await request(app).post("/api/share/conv-123/disable").expect(200);

			const updateCall = mockPool.query.mock.calls[0];
			expect(updateCall[0]).toContain("share_status = 'private'");
			expect(updateCall[0]).toContain("share_token = NULL");
		});

		it("returns 404 when conversation not found", async () => {
			mockPool.query.mockResolvedValueOnce({ rows: [] });

			const response = await request(app)
				.post("/api/share/nonexistent/disable")
				.expect(404);

			expect(response.body.error).toBe("Conversation not found");
		});

		it("returns 500 on database error", async () => {
			mockPool.query.mockRejectedValueOnce(new Error("DB down"));

			const response = await request(app)
				.post("/api/share/conv-123/disable")
				.expect(500);

			expect(response.body.error).toBe("Internal server error");
		});
	});
});
