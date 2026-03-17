import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateUser } from "../../middleware/auth.js";
import clusterRoutes from "../clusters.js";

// Mock ClusterService — define fns inside factory to avoid hoisting issues
const mockClusterExists = vi.fn();
const mockLinkKbArticle = vi.fn();

vi.mock("../../services/ClusterService.js", () => ({
	ClusterService: class MockClusterService {
		clusterExists(...args: any[]) {
			return mockClusterExists(...args);
		}
		linkKbArticle(...args: any[]) {
			return mockLinkKbArticle(...args);
		}
	},
}));

// Mock auth middleware
vi.mock("../../middleware/auth.js", () => ({
	authenticateUser: vi.fn((req, _res, next) => {
		(req as any).user = {
			id: "test-user-id",
			activeOrganizationId: "test-org-id",
			email: "test@example.com",
			role: "owner",
		};
		next();
	}),
	requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

// Mock OpenAPI — provide z with .openapi() extension
vi.mock("../../docs/openapi.js", async () => {
	const { z } = await import("zod");
	const { extendZodWithOpenApi } = await import(
		"@asteasolutions/zod-to-openapi"
	);
	extendZodWithOpenApi(z);
	return {
		z,
		registry: { registerPath: vi.fn() },
	};
});

describe("POST /api/clusters/:id/kb-articles", () => {
	let app: express.Application;
	const clusterId = "550e8400-e29b-41d4-a716-446655440000";
	const blobMetadataId = "660e8400-e29b-41d4-a716-446655440001";

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use("/api/clusters", authenticateUser, clusterRoutes);
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 201 with linked article data", async () => {
		mockClusterExists.mockResolvedValueOnce(true);
		mockLinkKbArticle.mockResolvedValueOnce({
			id: blobMetadataId,
			filename: "guide.pdf",
			file_size: 1024,
			mime_type: "application/pdf",
			status: "processed",
			created_at: new Date("2024-01-15"),
			updated_at: new Date("2024-01-15"),
		});

		const response = await request(app)
			.post(`/api/clusters/${clusterId}/kb-articles`)
			.send({ blob_metadata_id: blobMetadataId })
			.expect(201);

		expect(response.body.data).toMatchObject({
			id: blobMetadataId,
			filename: "guide.pdf",
		});
		expect(mockClusterExists).toHaveBeenCalledWith(clusterId, "test-org-id");
		expect(mockLinkKbArticle).toHaveBeenCalledWith(
			clusterId,
			blobMetadataId,
			"test-org-id",
		);
	});

	it("returns 404 when cluster does not exist", async () => {
		mockClusterExists.mockResolvedValueOnce(false);

		await request(app)
			.post(`/api/clusters/${clusterId}/kb-articles`)
			.send({ blob_metadata_id: blobMetadataId })
			.expect(404);

		expect(mockLinkKbArticle).not.toHaveBeenCalled();
	});

	it("returns 400 for invalid body (missing blob_metadata_id)", async () => {
		await request(app)
			.post(`/api/clusters/${clusterId}/kb-articles`)
			.send({})
			.expect(400);

		expect(mockClusterExists).not.toHaveBeenCalled();
	});

	it("returns 400 for invalid uuid format", async () => {
		await request(app)
			.post(`/api/clusters/${clusterId}/kb-articles`)
			.send({ blob_metadata_id: "not-a-uuid" })
			.expect(400);
	});

	it("returns 409 when article already linked (unique constraint)", async () => {
		mockClusterExists.mockResolvedValueOnce(true);
		mockLinkKbArticle.mockRejectedValueOnce({ code: "23505" });

		await request(app)
			.post(`/api/clusters/${clusterId}/kb-articles`)
			.send({ blob_metadata_id: blobMetadataId })
			.expect(409);
	});

	it("returns 404 when blob_metadata not found (FK violation)", async () => {
		mockClusterExists.mockResolvedValueOnce(true);
		mockLinkKbArticle.mockRejectedValueOnce({ code: "23503" });

		await request(app)
			.post(`/api/clusters/${clusterId}/kb-articles`)
			.send({ blob_metadata_id: blobMetadataId })
			.expect(404);
	});

	it("returns 500 on unexpected service error", async () => {
		mockClusterExists.mockResolvedValueOnce(true);
		mockLinkKbArticle.mockRejectedValueOnce(new Error("DB connection lost"));

		await request(app)
			.post(`/api/clusters/${clusterId}/kb-articles`)
			.send({ blob_metadata_id: blobMetadataId })
			.expect(500);
	});
});
