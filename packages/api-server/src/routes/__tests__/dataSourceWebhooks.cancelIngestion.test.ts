import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock DataSourceService
vi.mock("../../services/DataSourceService.js", () => {
	const getDataSource = vi.fn();
	const cancelIngestionRun = vi.fn();
	const createIngestionRun = vi.fn();
	const updateIngestionRunStatus = vi.fn();

	return {
		DataSourceService: class MockDataSourceService {
			getDataSource = getDataSource;
			cancelIngestionRun = cancelIngestionRun;
			createIngestionRun = createIngestionRun;
			updateIngestionRunStatus = updateIngestionRunStatus;
		},
	};
});

vi.mock("../../services/DataSourceWebhookService.js", () => {
	return {
		DataSourceWebhookService: class MockWebhookService {
			sendVerifyEvent = vi.fn();
			sendSyncTriggerEvent = vi.fn();
			sendSyncTicketsEvent = vi.fn();
		},
	};
});

vi.mock("../../middleware/auth.js", () => ({
	authenticateUser: vi.fn((_req: any, _res: any, next: any) => next()),
}));

import type { Mock } from "vitest";
import { DataSourceService } from "../../services/DataSourceService.js";
import dataSourceWebhookRoutes from "../dataSourceWebhooks.js";

describe("POST /api/data-sources/:id/cancel-ingestion", () => {
	let app: express.Application;
	let mockGetDataSource: Mock;
	let mockCancelIngestionRun: Mock;

	function createApp() {
		const a = express();
		a.use(express.json());
		a.use((req, _res, next) => {
			(req as any).user = {
				id: "test-user-id",
				activeOrganizationId: "test-org-id",
				email: "test@example.com",
			};
			next();
		});
		a.use("/api/data-sources", dataSourceWebhookRoutes);
		return a;
	}

	beforeEach(() => {
		app = createApp();
		const serviceInstance = new DataSourceService();
		mockGetDataSource = serviceInstance.getDataSource as Mock;
		mockCancelIngestionRun = serviceInstance.cancelIngestionRun as Mock;
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return 200 on successful cancel", async () => {
		mockGetDataSource.mockResolvedValueOnce({
			id: "ds-1",
			organization_id: "test-org-id",
			type: "servicenow_itsm",
		});
		mockCancelIngestionRun.mockResolvedValueOnce({
			id: "run-123",
			status: "cancelled",
		});

		const response = await request(app).post(
			"/api/data-sources/ds-1/cancel-ingestion",
		);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.ingestion_run_id).toBe("run-123");
		expect(response.body.data.status).toBe("cancelled");
		expect(response.body.message).toBe("Ticket sync cancelled");
	});

	it("should return 404 when data source not found", async () => {
		mockGetDataSource.mockResolvedValueOnce(null);

		const response = await request(app).post(
			"/api/data-sources/nonexistent/cancel-ingestion",
		);

		expect(response.status).toBe(404);
		expect(response.body.error).toBe("Data source not found");
	});

	it("should return 400 when no running/pending ingestion", async () => {
		mockGetDataSource.mockResolvedValueOnce({
			id: "ds-1",
			organization_id: "test-org-id",
			type: "servicenow_itsm",
		});
		mockCancelIngestionRun.mockResolvedValueOnce(null);

		const response = await request(app).post(
			"/api/data-sources/ds-1/cancel-ingestion",
		);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No ingestion in progress");
		expect(response.body.message).toBe(
			"No running or pending ticket sync to cancel",
		);
	});

	it("should return 500 on service error", async () => {
		mockGetDataSource.mockResolvedValueOnce({
			id: "ds-1",
			organization_id: "test-org-id",
			type: "servicenow_itsm",
		});
		mockCancelIngestionRun.mockRejectedValueOnce(new Error("DB error"));

		const response = await request(app).post(
			"/api/data-sources/ds-1/cancel-ingestion",
		);

		expect(response.status).toBe(500);
		expect(response.body.error).toBe("Failed to cancel ticket sync");
	});

	it("should call cancelIngestionRun with correct params", async () => {
		mockGetDataSource.mockResolvedValueOnce({
			id: "ds-1",
			organization_id: "test-org-id",
			type: "servicenow_itsm",
		});
		mockCancelIngestionRun.mockResolvedValueOnce({
			id: "run-456",
			status: "cancelled",
		});

		await request(app).post("/api/data-sources/ds-1/cancel-ingestion");

		expect(mockCancelIngestionRun).toHaveBeenCalledWith("ds-1", "test-org-id");
	});
});
