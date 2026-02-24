import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import filesRouter from "../files.js";

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
	requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

vi.mock("../../services/WebhookService.js", () => ({
	WebhookService: class {
		sendMessageEvent = vi.fn();
	},
}));

import { withOrgContext } from "../../config/database.js";

describe("GET /api/files - Sorting", () => {
	let app: express.Application;
	let mockClient: any;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use("/files", filesRouter);

		mockClient = {
			query: vi.fn(),
			release: vi.fn(),
		};

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const setupMockQuery = (documents: any[] = [], total = "0") => {
		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => {
				return await callback(mockClient as any);
			},
		);

		mockClient.query
			.mockResolvedValueOnce({ rows: documents }) // SELECT query
			.mockResolvedValueOnce({ rows: [{ total }] }); // COUNT query
	};

	describe("stable sort with tiebreaker", () => {
		it("should include bm.id as tiebreaker in ORDER BY clause", async () => {
			setupMockQuery();

			await request(app)
				.get("/files")
				.query({ sort_by: "status", sort_order: "desc" })
				.expect(200);

			const selectQuery = mockClient.query.mock.calls[0][0];
			// Should have tiebreaker: ORDER BY bm.status DESC, bm.id ASC
			expect(selectQuery).toMatch(/ORDER BY\s+bm\.status\s+DESC\s*,\s*bm\.id/i);
		});

		it("should include tiebreaker for all sort fields", async () => {
			const sortFields = ["filename", "size", "type", "source", "created_at"];

			for (const field of sortFields) {
				vi.clearAllMocks();
				setupMockQuery();

				await request(app)
					.get("/files")
					.query({ sort_by: field, sort_order: "asc" })
					.expect(200);

				const selectQuery = mockClient.query.mock.calls[0][0];
				expect(selectQuery).toMatch(/,\s*bm\.id/i);
			}
		});
	});

	describe("updated_at sort field", () => {
		it("should accept updated_at as a valid sort field and not fallback to created_at", async () => {
			setupMockQuery();

			await request(app)
				.get("/files")
				.query({ sort_by: "updated_at", sort_order: "desc" })
				.expect(200);

			const selectQuery = mockClient.query.mock.calls[0][0];
			// Should NOT fallback to created_at in ORDER BY
			expect(selectQuery).not.toMatch(/ORDER BY\s+bm\.created_at/i);
		});

		it("should sort by bm.updated_at DESC when sort_by=updated_at", async () => {
			setupMockQuery();

			await request(app)
				.get("/files")
				.query({ sort_by: "updated_at", sort_order: "desc" })
				.expect(200);

			const selectQuery = mockClient.query.mock.calls[0][0];
			expect(selectQuery).toMatch(/ORDER BY\s+bm\.updated_at\s+DESC/i);
		});
	});
});
