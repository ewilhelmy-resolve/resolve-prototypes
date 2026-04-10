import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import conversationsRouter from "../conversations.js";

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

vi.hoisted(() => ({
	mockSendMessageEvent: vi.fn().mockResolvedValue({ success: true }),
	mockSendTenantMessageEvent: vi.fn().mockResolvedValue({ success: true }),
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
		getSession: vi.fn().mockResolvedValue(null),
	}),
}));

import { withOrgContext } from "../../config/database.js";

// Fixtures
const mockConversations = [
	{
		id: "conv-1",
		title: "Password Help",
		created_at: new Date("2025-01-01T00:00:00Z"),
		updated_at: new Date("2025-01-01T01:00:00Z"),
		user_email: "test@example.com",
	},
	{
		id: "conv-2",
		title: "VPN Setup",
		created_at: new Date("2025-01-02T00:00:00Z"),
		updated_at: new Date("2025-01-02T01:00:00Z"),
		user_email: "test@example.com",
	},
];

const mockMessages = [
	{
		id: "msg-1",
		role: "user",
		message: "How do I reset my password?",
		response_content: null,
		status: "sent",
		metadata: null,
		created_at: new Date("2025-01-01T00:00:00Z"),
		processed_at: null,
		error_message: null,
		response_group_id: null,
		user_email: "test@example.com",
	},
	{
		id: "msg-2",
		role: "assistant",
		message: "",
		response_content: null,
		status: "sent",
		metadata: JSON.stringify({
			reasoning: {
				content: "Analyzing password reset options",
				title: "Thinking",
			},
		}),
		created_at: new Date("2025-01-01T00:00:01Z"),
		processed_at: new Date("2025-01-01T00:00:01Z"),
		error_message: null,
		response_group_id: "group-1",
		user_email: null,
	},
	{
		id: "msg-3",
		role: "assistant",
		message:
			"To reset your password, go to Settings > Security > Change Password.",
		response_content: null,
		status: "sent",
		metadata: JSON.stringify({
			sources: [
				{
					url: "https://docs.example.com/password",
					title: "Password Reset Guide",
					snippet: "Navigate to Settings > Security",
				},
			],
		}),
		created_at: new Date("2025-01-01T00:00:02Z"),
		processed_at: new Date("2025-01-01T00:00:02Z"),
		error_message: null,
		response_group_id: "group-1",
		user_email: null,
	},
	{
		id: "msg-4",
		role: "assistant",
		message: "Here are the steps:",
		response_content: null,
		status: "sent",
		metadata: JSON.stringify({
			tasks: [
				{
					title: "Password Reset Steps",
					items: ["Go to Settings", "Click Security", "Click Change Password"],
				},
			],
		}),
		created_at: new Date("2025-01-01T00:00:03Z"),
		processed_at: new Date("2025-01-01T00:00:03Z"),
		error_message: null,
		response_group_id: "group-1",
		user_email: null,
	},
];

describe("Share Baseline - Conversation & Message Shape", () => {
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

	describe("GET /conversations", () => {
		it("returns conversations with expected fields", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: mockConversations })
				.mockResolvedValueOnce({ rows: [{ total: "2" }] });

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app).get("/conversations").expect(200);

			expect(response.body).toHaveProperty("conversations");
			expect(response.body).toHaveProperty("total");
			expect(response.body).toHaveProperty("limit");
			expect(response.body).toHaveProperty("offset");

			const conv = response.body.conversations[0];
			expect(conv).toHaveProperty("id");
			expect(conv).toHaveProperty("title");
			expect(conv).toHaveProperty("created_at");
			expect(conv).toHaveProperty("updated_at");
		});

		it("respects limit and offset params", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [mockConversations[1]] })
				.mockResolvedValueOnce({ rows: [{ total: "2" }] });

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.get("/conversations?limit=1&offset=1")
				.expect(200);

			expect(response.body.conversations).toHaveLength(1);
			expect(response.body.limit).toBe(1);
			expect(response.body.offset).toBe(1);
		});
	});

	describe("GET /conversations/:id/messages", () => {
		it("returns 404 when conversation not found", async () => {
			mockClient.query.mockResolvedValueOnce({ rows: [] });

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			await request(app)
				.get("/conversations/nonexistent-id/messages")
				.expect(404);
		});

		it("returns messages with correct structure", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-1" }] }) // conv check
				.mockResolvedValueOnce({ rows: [...mockMessages] }); // messages

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.get("/conversations/conv-1/messages")
				.expect(200);

			expect(response.body).toHaveProperty("messages");
			expect(response.body).toHaveProperty("hasMore");
			expect(response.body).toHaveProperty("nextCursor");
			expect(Array.isArray(response.body.messages)).toBe(true);

			const msg = response.body.messages[0];
			expect(msg).toHaveProperty("id");
			expect(msg).toHaveProperty("role");
			expect(msg).toHaveProperty("message");
			expect(msg).toHaveProperty("metadata");
			expect(msg).toHaveProperty("created_at");
			expect(msg).toHaveProperty("response_group_id");
		});

		it("messages are returned in chronological order (oldest first)", async () => {
			// Router fetches DESC then reverses to ASC for client
			const reversed = [...mockMessages].reverse();
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-1" }] })
				.mockResolvedValueOnce({ rows: reversed });

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			const response = await request(app)
				.get("/conversations/conv-1/messages")
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

		it("hasMore is true when more messages exist beyond limit", async () => {
			// Return limit+1 messages to trigger hasMore
			const extraMessages = [
				...mockMessages,
				{
					...mockMessages[0],
					id: "msg-extra",
					created_at: new Date("2025-01-01T00:00:04Z"),
				},
			].reverse();

			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-1" }] })
				.mockResolvedValueOnce({ rows: extraMessages });

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);

			// limit=4 so 5 results triggers hasMore
			const response = await request(app)
				.get("/conversations/conv-1/messages?limit=4")
				.expect(200);

			expect(response.body.hasMore).toBe(true);
			expect(response.body.nextCursor).not.toBeNull();
			expect(response.body.messages).toHaveLength(4);
		});
	});

	describe("Message metadata shapes", () => {
		function setupMessagesResponse(messages: any[]) {
			const reversed = [...messages].reverse();
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ id: "conv-1" }] })
				.mockResolvedValueOnce({ rows: reversed });

			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					return await callback(mockClient);
				},
			);
		}

		it("reasoning metadata has content and title fields", async () => {
			setupMessagesResponse([mockMessages[1]]);

			const response = await request(app)
				.get("/conversations/conv-1/messages")
				.expect(200);

			const msg = response.body.messages[0];
			// metadata comes back as stringified JSON from DB
			const meta =
				typeof msg.metadata === "string"
					? JSON.parse(msg.metadata)
					: msg.metadata;
			expect(meta.reasoning).toEqual({
				content: "Analyzing password reset options",
				title: "Thinking",
			});
		});

		it("sources metadata is array with url, title, snippet", async () => {
			setupMessagesResponse([mockMessages[2]]);

			const response = await request(app)
				.get("/conversations/conv-1/messages")
				.expect(200);

			const msg = response.body.messages[0];
			const meta =
				typeof msg.metadata === "string"
					? JSON.parse(msg.metadata)
					: msg.metadata;
			expect(Array.isArray(meta.sources)).toBe(true);
			expect(meta.sources[0]).toEqual({
				url: "https://docs.example.com/password",
				title: "Password Reset Guide",
				snippet: "Navigate to Settings > Security",
			});
		});

		it("tasks metadata is array with title and items", async () => {
			setupMessagesResponse([mockMessages[3]]);

			const response = await request(app)
				.get("/conversations/conv-1/messages")
				.expect(200);

			const msg = response.body.messages[0];
			const meta =
				typeof msg.metadata === "string"
					? JSON.parse(msg.metadata)
					: msg.metadata;
			expect(Array.isArray(meta.tasks)).toBe(true);
			expect(meta.tasks[0]).toEqual({
				title: "Password Reset Steps",
				items: ["Go to Settings", "Click Security", "Click Change Password"],
			});
		});

		it("user messages have null metadata", async () => {
			setupMessagesResponse([mockMessages[0]]);

			const response = await request(app)
				.get("/conversations/conv-1/messages")
				.expect(200);

			const msg = response.body.messages[0];
			expect(msg.metadata).toBeNull();
		});
	});
});
