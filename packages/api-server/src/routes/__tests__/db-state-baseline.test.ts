/**
 * db-state-baseline.test.ts — Phase 0e
 *
 * Baseline tests verifying SQL query shapes and expected data patterns for:
 * - Conversation creation (columns, source values)
 * - Message storage (columns, JSONB metadata)
 * - Message ordering (cursor-based pagination)
 * - Activity context linking (activity_contexts table)
 * - Conversation ownership (RLS scoping via withOrgContext)
 */
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IframeWebhookConfig } from "../../services/sessionStore.js";

// Mock dependencies
vi.mock("../../config/database.js", () => ({
	withOrgContext: vi.fn(),
	pool: { query: vi.fn(), connect: vi.fn() },
}));

vi.mock("../../config/kysely.js", () => ({
	db: {},
}));

vi.mock("../../middleware/auth.js", () => ({
	authenticateUser: vi.fn((req, _res, next) => {
		(req as any).user = {
			id: "user-uuid-001",
			activeOrganizationId: "org-uuid-001",
			email: "test@example.com",
		};
		(req as any).session = { sessionId: "session-001" };
		next();
	}),
}));

const { mockSendMessageEvent, mockSendTenantMessageEvent } = vi.hoisted(() => ({
	mockSendMessageEvent: vi.fn().mockResolvedValue({ success: true }),
	mockSendTenantMessageEvent: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../../services/WebhookService.js", () => ({
	WebhookService: class {
		sendMessageEvent = mockSendMessageEvent;
		sendTenantMessageEvent = mockSendTenantMessageEvent;
	},
}));

const mockSessionStore = {
	getSession: vi.fn(),
	createSession: vi.fn(),
	updateSession: vi.fn(),
	getSessionByConversationId: vi.fn(),
};

vi.mock("../../services/sessionStore.js", () => ({
	getSessionStore: () => mockSessionStore,
}));

vi.mock("../../services/sessionService.js", () => ({
	getSessionService: () => ({
		generateSessionCookie: vi.fn().mockReturnValue("mock-cookie"),
	}),
}));

vi.mock("../../config/valkey.js", () => ({
	getValkeyClient: vi.fn(),
	getDevMockPayload: vi.fn(),
	getValkeyStatus: () => ({
		configured: true,
		url: "redis://localhost:6379",
		connected: true,
	}),
}));

vi.mock("../../config/logger.js", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

import { pool, withOrgContext } from "../../config/database.js";
import conversationsRouter from "../conversations.js";

// ============================================================================
// 1. Conversation creation SQL shape
// ============================================================================
describe("DB State Baseline — Conversation creation SQL shape", () => {
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

	it("INSERT into conversations includes id, title, organization_id, user_id, source, created_at, updated_at", async () => {
		mockClient.query
			.mockResolvedValueOnce({ rows: [{ count: "0" }] }) // COUNT
			.mockResolvedValueOnce({
				rows: [
					{
						id: "conv-uuid-001",
						title: "Test Chat",
						created_at: new Date(),
						updated_at: new Date(),
					},
				],
			}); // INSERT

		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => {
				return await callback(mockClient);
			},
		);

		await request(app)
			.post("/conversations")
			.send({ title: "Test Chat" })
			.expect(201);

		// The INSERT query is the second call
		const insertCall = mockClient.query.mock.calls[1];
		const sql = insertCall[0] as string;

		// Verify INSERT targets conversations table
		expect(sql).toContain("INSERT INTO conversations");
		// Verify columns
		expect(sql).toContain("organization_id");
		expect(sql).toContain("user_id");
		expect(sql).toContain("title");
		expect(sql).toContain("source");
		// Verify RETURNING clause includes expected fields
		expect(sql).toContain("RETURNING");
		expect(sql).toContain("id");
		expect(sql).toContain("created_at");
		expect(sql).toContain("updated_at");

		// Verify params: [org_id, user_id, title]
		const params = insertCall[1] as any[];
		expect(params).toContain("org-uuid-001");
		expect(params).toContain("user-uuid-001");
		expect(params).toContain("Test Chat");
	});

	it("regular conversation source is 'rita_go'", async () => {
		mockClient.query
			.mockResolvedValueOnce({ rows: [{ count: "0" }] })
			.mockResolvedValueOnce({
				rows: [
					{
						id: "conv-uuid-002",
						title: "Chat",
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
			.send({ title: "Chat" })
			.expect(201);

		const insertSql = mockClient.query.mock.calls[1][0] as string;
		expect(insertSql).toContain("'rita_go'");
	});

	it("iframe conversation source is 'jarvis'", async () => {
		// IframeService.createIframeConversation uses source='jarvis'
		// Verify by checking the IframeService SQL shape via pool.query mock
		const mockIframeClient = { query: vi.fn(), release: vi.fn() };

		mockIframeClient.query.mockResolvedValueOnce({
			rows: [{ id: "iframe-conv-uuid" }],
		});

		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => {
				return await callback(mockIframeClient);
			},
		);

		// Import and call IframeService directly
		const { IframeService } = await import("../../services/IframeService.js");
		const service = new IframeService();

		const config: IframeWebhookConfig = {
			tenantId: "tenant-001",
			userGuid: "guid-001",
		};

		// Mock resolveRitaOrg and resolveRitaUser to pass through
		vi.spyOn(service, "resolveRitaOrg").mockResolvedValue({
			ritaOrgId: "org-001",
			wasCreated: false,
		});
		vi.spyOn(service, "resolveRitaUser").mockResolvedValue({
			ritaUserId: "user-001",
			wasCreated: false,
		});
		vi.spyOn(service, "ensureOrgMembership").mockResolvedValue(undefined);

		const result = await service.createIframeConversation(
			config,
			undefined,
			"org-001",
			"user-001",
		);

		expect(result.conversationId).toBe("iframe-conv-uuid");

		const insertSql = mockIframeClient.query.mock.calls[0][0] as string;
		expect(insertSql).toContain("INSERT INTO conversations");
		expect(insertSql).toContain("'jarvis'");
	});
});

// ============================================================================
// 2. Message storage SQL shape
// ============================================================================
describe("DB State Baseline — Message storage SQL shape", () => {
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

		// Default: regular session (no iframe)
		mockSessionStore.getSession.mockResolvedValue({
			sessionId: "session-001",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("INSERT into messages includes expected columns: organization_id, conversation_id, user_id, message, role, status", async () => {
		mockClient.query
			.mockResolvedValueOnce({ rows: [{ id: "conv-001" }] }) // conv check
			.mockResolvedValueOnce({ rows: [] }) // transcript
			.mockResolvedValueOnce({
				rows: [
					{
						id: "msg-001",
						conversation_id: "conv-001",
						message: "Hello",
						role: "user",
						status: "pending",
						created_at: new Date(),
					},
				],
			}) // insert
			.mockResolvedValueOnce({ rows: [] }); // status update

		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => {
				return await callback(mockClient);
			},
		);

		await request(app)
			.post("/conversations/conv-001/messages")
			.send({ content: "Hello" })
			.expect(201);

		// The message INSERT is the third call (conv check, transcript, insert)
		const insertCall = mockClient.query.mock.calls[2];
		const sql = insertCall[0] as string;

		expect(sql).toContain("INSERT INTO messages");
		expect(sql).toContain("organization_id");
		expect(sql).toContain("conversation_id");
		expect(sql).toContain("user_id");
		expect(sql).toContain("message");
		expect(sql).toContain("role");
		expect(sql).toContain("status");

		// Default role is 'user', status is 'pending'
		expect(sql).toContain("'user'");
		expect(sql).toContain("'pending'");

		// RETURNING clause
		expect(sql).toContain("RETURNING");
		expect(sql).toContain("id");
		expect(sql).toContain("created_at");
	});

	it("message INSERT params match user and org from auth context", async () => {
		mockClient.query
			.mockResolvedValueOnce({ rows: [{ id: "conv-001" }] })
			.mockResolvedValueOnce({ rows: [] })
			.mockResolvedValueOnce({
				rows: [
					{
						id: "msg-002",
						conversation_id: "conv-001",
						message: "Test msg",
						role: "user",
						status: "pending",
						created_at: new Date(),
					},
				],
			})
			.mockResolvedValueOnce({ rows: [] });

		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => {
				return await callback(mockClient);
			},
		);

		await request(app)
			.post("/conversations/conv-001/messages")
			.send({ content: "Test msg" })
			.expect(201);

		const insertParams = mockClient.query.mock.calls[2][1] as any[];
		expect(insertParams).toContain("org-uuid-001"); // organization_id
		expect(insertParams).toContain("conv-001"); // conversation_id
		expect(insertParams).toContain("user-uuid-001"); // user_id
		expect(insertParams).toContain("Test msg"); // message content
	});
});

// ============================================================================
// 3. Message ordering — cursor-based pagination
// ============================================================================
describe("DB State Baseline — Message ordering", () => {
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

	it("GET messages orders by created_at DESC, id DESC", async () => {
		const now = new Date();
		mockClient.query
			.mockResolvedValueOnce({ rows: [{ id: "conv-001" }] }) // conv check
			.mockResolvedValueOnce({
				rows: [
					{
						id: "msg-3",
						message: "Third",
						role: "user",
						created_at: new Date(now.getTime() + 2000),
						metadata: null,
					},
					{
						id: "msg-2",
						message: "Second",
						role: "assistant",
						created_at: new Date(now.getTime() + 1000),
						metadata: null,
					},
					{
						id: "msg-1",
						message: "First",
						role: "user",
						created_at: now,
						metadata: null,
					},
				],
			}); // messages query

		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => {
				return await callback(mockClient);
			},
		);

		const response = await request(app)
			.get("/conversations/conv-001/messages")
			.expect(200);

		// Verify SQL uses ORDER BY created_at DESC
		const msgQuerySql = mockClient.query.mock.calls[1][0] as string;
		expect(msgQuerySql).toContain("ORDER BY m.created_at DESC");
		expect(msgQuerySql).toContain("m.id DESC");

		// Verify response reverses to chronological order
		expect(response.body.messages[0].id).toBe("msg-1");
		expect(response.body.messages[2].id).toBe("msg-3");
	});

	it("cursor-based pagination uses created_at < $cursor for 'before' param", async () => {
		const cursorDate = "2026-01-15T12:00:00.000Z";

		mockClient.query
			.mockResolvedValueOnce({ rows: [{ id: "conv-001" }] })
			.mockResolvedValueOnce({ rows: [] });

		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => {
				return await callback(mockClient);
			},
		);

		await request(app)
			.get(`/conversations/conv-001/messages?before=${cursorDate}`)
			.expect(200);

		const msgQuerySql = mockClient.query.mock.calls[1][0] as string;
		expect(msgQuerySql).toContain("m.created_at < $3");

		const params = mockClient.query.mock.calls[1][1] as any[];
		expect(params).toContain(cursorDate);
	});

	it("initial load (no cursor) fetches limit+1 for hasMore detection", async () => {
		mockClient.query
			.mockResolvedValueOnce({ rows: [{ id: "conv-001" }] })
			.mockResolvedValueOnce({ rows: [] });

		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => {
				return await callback(mockClient);
			},
		);

		await request(app)
			.get("/conversations/conv-001/messages?limit=50")
			.expect(200);

		// Verify LIMIT is limit+1 = 51
		const params = mockClient.query.mock.calls[1][1] as any[];
		expect(params[params.length - 1]).toBe(51);
	});

	it("GET messages SELECT includes metadata and response_group_id columns", async () => {
		mockClient.query
			.mockResolvedValueOnce({ rows: [{ id: "conv-001" }] })
			.mockResolvedValueOnce({ rows: [] });

		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => {
				return await callback(mockClient);
			},
		);

		await request(app).get("/conversations/conv-001/messages").expect(200);

		const sql = mockClient.query.mock.calls[1][0] as string;
		expect(sql).toContain("m.metadata");
		expect(sql).toContain("m.response_group_id");
		expect(sql).toContain("m.status");
		expect(sql).toContain("m.role");
		expect(sql).toContain("m.created_at");
	});
});

// ============================================================================
// 4. Activity context linking
// ============================================================================
describe("DB State Baseline — Activity context linking", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("linkActivityToConversation inserts into activity_contexts with ON CONFLICT upsert", async () => {
		vi.mocked(pool.query as any).mockResolvedValue({ rows: [] });

		const { IframeService } = await import("../../services/IframeService.js");
		const service = new IframeService();

		await service.linkActivityToConversation(
			42,
			"org-001",
			"conv-001",
			"user-001",
		);

		const call = vi.mocked(pool.query as any).mock.calls[0];
		const sql = call[0] as string;
		const params = call[1] as any[];

		expect(sql).toContain("INSERT INTO activity_contexts");
		expect(sql).toContain("activity_id");
		expect(sql).toContain("organization_id");
		expect(sql).toContain("conversation_id");
		expect(sql).toContain("user_id");
		expect(sql).toContain("ON CONFLICT");

		expect(params).toEqual([42, "org-001", "conv-001", "user-001"]);
	});

	it("findConversationByActivityId queries activity_contexts scoped by org and user", async () => {
		vi.mocked(pool.query as any).mockResolvedValue({
			rows: [{ conversation_id: "conv-found" }],
		});

		const { IframeService } = await import("../../services/IframeService.js");
		const service = new IframeService();

		const result = await service.findConversationByActivityId(
			99,
			"org-001",
			"user-001",
		);

		expect(result).toBe("conv-found");

		const call = vi.mocked(pool.query as any).mock.calls[0];
		const sql = call[0] as string;
		const params = call[1] as any[];

		expect(sql).toContain("SELECT conversation_id FROM activity_contexts");
		expect(sql).toContain("activity_id = $1");
		expect(sql).toContain("organization_id = $2");
		expect(sql).toContain("user_id = $3");
		expect(params).toEqual([99, "org-001", "user-001"]);
	});

	it("findConversationByActivityId returns null when no match", async () => {
		vi.mocked(pool.query as any).mockResolvedValue({ rows: [] });

		const { IframeService } = await import("../../services/IframeService.js");
		const service = new IframeService();

		const result = await service.findConversationByActivityId(
			999,
			"org-001",
			"user-001",
		);

		expect(result).toBeNull();
	});
});

// ============================================================================
// 5. Conversation ownership (RLS scoping)
// ============================================================================
describe("DB State Baseline — Conversation ownership", () => {
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

	it("withOrgContext is called with user_id and organization_id from auth", async () => {
		mockClient.query
			.mockResolvedValueOnce({ rows: [{ count: "0" }] })
			.mockResolvedValueOnce({
				rows: [
					{
						id: "conv-001",
						title: "Chat",
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
			.send({ title: "Chat" })
			.expect(201);

		expect(withOrgContext).toHaveBeenCalledWith(
			"user-uuid-001",
			"org-uuid-001",
			expect.any(Function),
		);
	});

	it("conversation SELECT checks both organization_id and user_id", async () => {
		mockClient.query.mockResolvedValueOnce({ rows: [] }); // conv check returns empty

		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => {
				return await callback(mockClient);
			},
		);

		await request(app).get("/conversations/conv-001/messages").expect(404);

		const checkSql = mockClient.query.mock.calls[0][0] as string;
		expect(checkSql).toContain("SELECT id FROM conversations");
		expect(checkSql).toContain("organization_id = $2");
		expect(checkSql).toContain("user_id = $3");
	});

	it("conversation DELETE includes organization_id and user_id in WHERE", async () => {
		mockClient.query
			.mockResolvedValueOnce({ rows: [{ id: "conv-001" }] }) // conv check
			.mockResolvedValueOnce({ rows: [] }); // delete

		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => {
				return await callback(mockClient);
			},
		);

		await request(app).delete("/conversations/conv-001").expect(200);

		const deleteSql = mockClient.query.mock.calls[1][0] as string;
		expect(deleteSql).toContain("DELETE FROM conversations");
		expect(deleteSql).toContain("organization_id = $2");
		expect(deleteSql).toContain("user_id = $3");
	});

	it("verifyConversationOwnership checks id + organization_id + user_id", async () => {
		vi.mocked(pool.query as any).mockResolvedValue({
			rows: [{ id: "conv-001" }],
		});

		const { IframeService } = await import("../../services/IframeService.js");
		const service = new IframeService();

		const result = await service.verifyConversationOwnership(
			"conv-001",
			"org-001",
			"user-001",
		);

		expect(result).toBe(true);

		const call = vi.mocked(pool.query as any).mock.calls[0];
		const sql = call[0] as string;
		const params = call[1] as any[];

		expect(sql).toContain("SELECT id FROM conversations");
		expect(sql).toContain("id = $1");
		expect(sql).toContain("organization_id = $2");
		expect(sql).toContain("user_id = $3");
		expect(params).toEqual(["conv-001", "org-001", "user-001"]);
	});

	it("verifyConversationOwnership returns false when no match", async () => {
		vi.mocked(pool.query as any).mockResolvedValue({ rows: [] });

		const { IframeService } = await import("../../services/IframeService.js");
		const service = new IframeService();

		const result = await service.verifyConversationOwnership(
			"conv-999",
			"org-001",
			"user-001",
		);

		expect(result).toBe(false);
	});

	it("conversation list is filtered by both organization_id and user_id", async () => {
		mockClient.query
			.mockResolvedValueOnce({ rows: [] }) // conversations
			.mockResolvedValueOnce({ rows: [{ total: "0" }] }); // count

		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => {
				return await callback(mockClient);
			},
		);

		await request(app).get("/conversations").expect(200);

		const listSql = mockClient.query.mock.calls[0][0] as string;
		expect(listSql).toContain("c.organization_id = $1");
		expect(listSql).toContain("c.user_id = $2");
		expect(listSql).toContain("ORDER BY c.updated_at DESC");
	});
});
