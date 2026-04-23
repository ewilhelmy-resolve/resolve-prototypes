import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSendDocumentEvent } = vi.hoisted(() => ({
	mockSendDocumentEvent: vi.fn(),
}));

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
		sendDocumentEvent = mockSendDocumentEvent;
		sendDocumentDeleteEvent = vi.fn();
	},
}));

import { withOrgContext } from "../../config/database.js";
import filesRouter from "../files.js";

describe("files processing state", () => {
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

		vi.mocked(withOrgContext).mockImplementation(
			async (_userId, _orgId, callback) => await callback(mockClient as any),
		);

		mockSendDocumentEvent.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const findUpdateToFailed = () =>
		mockClient.query.mock.calls.find((c: any[]) =>
			/UPDATE\s+blob_metadata[\s\S]*SET\s+status\s*=\s*'failed'/i.test(c[0]),
		);

	describe("POST /files/upload — webhook failure marks row as failed", () => {
		const queueUploadTransactionMocks = () => {
			// 1. Digest check SELECT -> empty rows (no existing file)
			mockClient.query.mockResolvedValueOnce({ rows: [] });
			// 2. BEGIN
			mockClient.query.mockResolvedValueOnce({ rows: [] });
			// 3. existingBlob SELECT -> empty rows (new blob)
			mockClient.query.mockResolvedValueOnce({ rows: [] });
			// 4. INSERT blob -> blob_id
			mockClient.query.mockResolvedValueOnce({
				rows: [{ blob_id: "blob-1" }],
			});
			// 5. INSERT blob_metadata -> metadata row
			mockClient.query.mockResolvedValueOnce({
				rows: [
					{
						id: "doc-1",
						blob_id: "blob-1",
						filename: "test.txt",
						file_size: 4,
						mime_type: "text/plain",
						status: "processing",
						source: "manual",
						created_at: new Date().toISOString(),
					},
				],
			});
			// 6. COMMIT
			mockClient.query.mockResolvedValueOnce({ rows: [] });
			// 7. Expected UPDATE status='failed' (the fix)
			mockClient.query.mockResolvedValueOnce({ rows: [] });
		};

		it("flips status to 'failed' when webhook returns success:false", async () => {
			queueUploadTransactionMocks();
			mockSendDocumentEvent.mockResolvedValueOnce({
				success: false,
				status: 502,
				error: "platform unreachable",
			});

			await request(app)
				.post("/files/upload")
				.attach("file", Buffer.from("test"), {
					filename: "test.txt",
					contentType: "text/plain",
				})
				.expect(200);

			const updateCall = findUpdateToFailed();
			expect(updateCall).toBeDefined();
			// The error reason should be persisted to metadata
			expect(updateCall?.[0]).toMatch(/metadata/i);
		});

		it("flips status to 'failed' when webhook throws", async () => {
			queueUploadTransactionMocks();
			mockSendDocumentEvent.mockRejectedValueOnce(new Error("ECONNREFUSED"));

			await request(app)
				.post("/files/upload")
				.attach("file", Buffer.from("test"), {
					filename: "test.txt",
					contentType: "text/plain",
				})
				.expect(200);

			const updateCall = findUpdateToFailed();
			expect(updateCall).toBeDefined();
		});
	});

	describe("POST /files/:id/process — webhook failure marks row as failed", () => {
		it("flips status to 'failed' when reprocess webhook returns success:false", async () => {
			// withOrgContext #1: get document row
			mockClient.query.mockResolvedValueOnce({
				rows: [
					{
						id: "doc-1",
						file_name: "test.txt",
						file_size: 4,
						mime_type: "text/plain",
						status: "processing",
					},
				],
			});
			// withOrgContext #2: get blob_id
			mockClient.query.mockResolvedValueOnce({
				rows: [{ blob_id: "blob-1" }],
			});
			// withOrgContext #3 (expected fix): UPDATE status='failed'
			mockClient.query.mockResolvedValueOnce({ rows: [] });

			mockSendDocumentEvent.mockResolvedValueOnce({
				success: false,
				status: 502,
				error: "platform unreachable",
			});

			await request(app)
				.post("/files/doc-1/process")
				.send({ enable_processing: true })
				.expect(500);

			const updateCall = findUpdateToFailed();
			expect(updateCall).toBeDefined();
		});
	});

	describe("GET /files — stuck processing reconciler", () => {
		it("issues a timeout UPDATE before the SELECT to mark stuck 'processing' rows as failed", async () => {
			mockClient.query
				.mockResolvedValueOnce({ rows: [] }) // reconciler UPDATE
				.mockResolvedValueOnce({ rows: [] }) // SELECT documents
				.mockResolvedValueOnce({ rows: [{ total: "0" }] }); // COUNT

			await request(app).get("/files").expect(200);

			const firstQuery = mockClient.query.mock.calls[0][0];
			expect(firstQuery).toMatch(
				/UPDATE\s+blob_metadata\s+SET\s+status\s*=\s*'failed'/i,
			);
			expect(firstQuery).toMatch(/WHERE[\s\S]*status\s*=\s*'processing'/i);
			expect(firstQuery).toMatch(/updated_at\s*<\s*NOW\(\)\s*-/i);
			expect(firstQuery).toMatch(/organization_id/i);
		});
	});
});
