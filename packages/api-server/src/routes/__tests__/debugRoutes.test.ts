import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
		(req as any).log = {
			debug: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
		};
		next();
	}),
}));

vi.mock("../../middleware/logging.js", () => ({
	addUserContextToLogs: vi.fn((_req: any, _res: any, next: any) => next()),
	logApiOperation: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

vi.mock("../../config/logger.js", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

import { withOrgContext } from "../../config/database.js";
import debugRouter from "../debugRoutes.js";

describe("Debug Routes", () => {
	let app: express.Application;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use(debugRouter);
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("GET /test-sse", () => {
		it("should return SSE stream with correct headers and data", async () => {
			const response = await new Promise<{
				headers: Record<string, string>;
				data: string;
			}>((resolve) => {
				const req = request(app)
					.get("/test-sse")
					.buffer(true)
					.parse((res, callback) => {
						const headers = res.headers;
						let data = "";
						res.on("data", (chunk: Buffer) => {
							data += chunk.toString();
							// Resolve after receiving the first event
							(res as any).destroy();
							resolve({ headers, data });
						});
						res.on("end", () => callback(null, data));
					});
				req.end();
			});

			expect(response.headers["content-type"]).toContain("text/event-stream");
			expect(response.headers["cache-control"]).toBe("no-cache");
			expect(response.data).toContain("test_message");
			expect(response.data).toContain("data:");
		});
	});

	describe("GET /api/test-org-context", () => {
		it("should return 200 with user and orgContext on success", async () => {
			vi.mocked(withOrgContext).mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockClient = {
						query: vi
							.fn()
							.mockResolvedValueOnce({ rows: [{}, {}] }) // messages
							.mockResolvedValueOnce({ rows: [{}] }), // organizations
					};
					return await callback(mockClient as any);
				},
			);

			const response = await request(app)
				.get("/api/test-org-context")
				.expect(200);

			expect(response.body).toHaveProperty("user");
			expect(response.body).toHaveProperty("orgContext");
			expect(response.body).toHaveProperty(
				"message",
				"Organization context working",
			);
			expect(response.body.user.id).toBe("test-user-id");
			expect(response.body.orgContext.messagesCount).toBe(2);
			expect(response.body.orgContext.organizationsCount).toBe(1);
		});

		it("should return 500 on database error", async () => {
			vi.mocked(withOrgContext).mockRejectedValue(
				new Error("DB connection failed"),
			);

			const response = await request(app)
				.get("/api/test-org-context")
				.expect(500);

			expect(response.body).toHaveProperty(
				"error",
				"Failed to test organization context",
			);
		});
	});
});
