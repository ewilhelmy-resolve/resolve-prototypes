import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock DataSourceService
vi.mock("../../services/DataSourceService.js", () => {
	const getDataSource = vi.fn();
	const createIngestionRun = vi.fn();
	const updateIngestionRunStatus = vi.fn();

	return {
		DataSourceService: class MockDataSourceService {
			getDataSource = getDataSource;
			createIngestionRun = createIngestionRun;
			updateIngestionRunStatus = updateIngestionRunStatus;
		},
	};
});

// Mock DataSourceWebhookService
vi.mock("../../services/DataSourceWebhookService.js", () => {
	const sendSyncTicketsEvent = vi.fn();

	return {
		DataSourceWebhookService: class MockWebhookService {
			sendSyncTicketsEvent = sendSyncTicketsEvent;
		},
	};
});

// Mock auth middleware
vi.mock("../../middleware/auth.js", () => ({
	authenticateUser: vi.fn((_req: any, _res: any, next: any) => next()),
}));

import type { Mock } from "vitest";
import { DataSourceService } from "../../services/DataSourceService.js";
import { DataSourceWebhookService } from "../../services/DataSourceWebhookService.js";
import dataSourceWebhooksRouter from "../dataSourceWebhooks.js";

const mockFreshdeskDataSource = {
	id: "ds-123",
	organization_id: "test-org-id",
	type: "freshservice_itsm",
	name: "Freshdesk",
	enabled: true,
	settings: { domain: "https://acme.freshdesk.com" },
	status: "idle",
};

function createApp(userOverrides: Record<string, unknown> = {}) {
	const a = express();
	a.use(express.json());
	a.use((req, _res, next) => {
		(req as any).user = {
			id: "test-user-id",
			activeOrganizationId: "test-org-id",
			email: "test@example.com",
			...userOverrides,
		};
		next();
	});
	a.use("/api/data-sources", dataSourceWebhooksRouter);
	return a;
}

describe("POST /api/data-sources/:id/sync-tickets", () => {
	let app: express.Application;
	let mockGetDataSource: Mock;
	let mockCreateIngestionRun: Mock;
	let mockUpdateIngestionRunStatus: Mock;
	let mockSendSyncTicketsEvent: Mock;

	beforeEach(() => {
		app = createApp();
		const dsService = new DataSourceService();
		const whService = new DataSourceWebhookService();
		mockGetDataSource = dsService.getDataSource as Mock;
		mockCreateIngestionRun = dsService.createIngestionRun as Mock;
		mockUpdateIngestionRunStatus = dsService.updateIngestionRunStatus as Mock;
		mockSendSyncTicketsEvent = whService.sendSyncTicketsEvent as Mock;
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return 202 on successful sync", async () => {
		mockGetDataSource.mockResolvedValueOnce(mockFreshdeskDataSource);
		mockCreateIngestionRun.mockResolvedValueOnce({
			id: "run-123",
			status: "pending",
		});
		mockSendSyncTicketsEvent.mockResolvedValueOnce({ success: true });

		const response = await request(app)
			.post("/api/data-sources/ds-123/sync-tickets")
			.send({ time_range_days: 30 });

		expect(response.status).toBe(202);
		expect(response.body.ingestion_run_id).toBe("run-123");
		expect(response.body.status).toBe("SYNCING");
		expect(mockCreateIngestionRun).toHaveBeenCalledWith({
			organizationId: "test-org-id",
			dataSourceConnectionId: "ds-123",
			startedBy: "test-user-id",
			metadata: {
				time_range_days: 30,
				connection_type: "freshservice_itsm",
			},
		});
		expect(mockUpdateIngestionRunStatus).toHaveBeenCalledWith(
			"run-123",
			"running",
		);
	});

	it("should use default time_range_days of 30 when body is empty", async () => {
		mockGetDataSource.mockResolvedValueOnce(mockFreshdeskDataSource);
		mockCreateIngestionRun.mockResolvedValueOnce({
			id: "run-123",
			status: "pending",
		});
		mockSendSyncTicketsEvent.mockResolvedValueOnce({ success: true });

		await request(app).post("/api/data-sources/ds-123/sync-tickets").send({});

		expect(mockCreateIngestionRun).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({
					time_range_days: 30,
				}),
			}),
		);
	});

	it("should use custom time_range_days when provided", async () => {
		mockGetDataSource.mockResolvedValueOnce(mockFreshdeskDataSource);
		mockCreateIngestionRun.mockResolvedValueOnce({
			id: "run-123",
			status: "pending",
		});
		mockSendSyncTicketsEvent.mockResolvedValueOnce({ success: true });

		await request(app)
			.post("/api/data-sources/ds-123/sync-tickets")
			.send({ time_range_days: 90 });

		expect(mockCreateIngestionRun).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({
					time_range_days: 90,
				}),
			}),
		);
	});

	it("should return 400 when data source type is not ITSM", async () => {
		mockGetDataSource.mockResolvedValueOnce({
			...mockFreshdeskDataSource,
			type: "confluence",
		});

		const response = await request(app)
			.post("/api/data-sources/ds-123/sync-tickets")
			.send({});

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Invalid data source type");
	});

	it("should return 400 when data source is not enabled", async () => {
		mockGetDataSource.mockResolvedValueOnce({
			...mockFreshdeskDataSource,
			enabled: false,
		});

		const response = await request(app)
			.post("/api/data-sources/ds-123/sync-tickets")
			.send({});

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Data source not configured");
	});

	it("should return 404 when data source not found", async () => {
		mockGetDataSource.mockResolvedValueOnce(null);

		const response = await request(app)
			.post("/api/data-sources/ds-123/sync-tickets")
			.send({});

		expect(response.status).toBe(404);
		expect(response.body.error).toBe("Data source not found");
	});

	it("should return 500 when createIngestionRun fails", async () => {
		mockGetDataSource.mockResolvedValueOnce(mockFreshdeskDataSource);
		mockCreateIngestionRun.mockResolvedValueOnce(null);

		const response = await request(app)
			.post("/api/data-sources/ds-123/sync-tickets")
			.send({});

		expect(response.status).toBe(500);
		expect(response.body.error).toBe("Failed to create ingestion run");
	});

	it("should return 500 and mark run as failed when webhook fails", async () => {
		mockGetDataSource.mockResolvedValueOnce(mockFreshdeskDataSource);
		mockCreateIngestionRun.mockResolvedValueOnce({
			id: "run-123",
			status: "pending",
		});
		mockSendSyncTicketsEvent.mockResolvedValueOnce({
			success: false,
			error: "Timeout",
		});

		const response = await request(app)
			.post("/api/data-sources/ds-123/sync-tickets")
			.send({});

		expect(response.status).toBe(500);
		expect(response.body.error).toBe("Sync tickets webhook failed");
		expect(mockUpdateIngestionRunStatus).toHaveBeenCalledWith(
			"run-123",
			"failed",
			"Timeout",
		);
	});

	it("should return 400 on invalid time_range_days (Zod validation)", async () => {
		const responseTooLow = await request(app)
			.post("/api/data-sources/ds-123/sync-tickets")
			.send({ time_range_days: 0 });

		expect(responseTooLow.status).toBe(400);
		expect(responseTooLow.body.error).toBe("Validation error");

		const responseTooHigh = await request(app)
			.post("/api/data-sources/ds-123/sync-tickets")
			.send({ time_range_days: 500 });

		expect(responseTooHigh.status).toBe(400);
		expect(responseTooHigh.body.error).toBe("Validation error");
	});

	it("should send correct webhook payload", async () => {
		mockGetDataSource.mockResolvedValueOnce(mockFreshdeskDataSource);
		mockCreateIngestionRun.mockResolvedValueOnce({
			id: "run-123",
			status: "pending",
		});
		mockSendSyncTicketsEvent.mockResolvedValueOnce({ success: true });

		await request(app)
			.post("/api/data-sources/ds-123/sync-tickets")
			.send({ time_range_days: 60 });

		expect(mockSendSyncTicketsEvent).toHaveBeenCalledWith({
			organizationId: "test-org-id",
			userId: "test-user-id",
			userEmail: "test@example.com",
			connectionId: "ds-123",
			connectionType: "freshservice_itsm",
			ingestionRunId: "run-123",
			settings: {
				domain: "https://acme.freshdesk.com",
				time_range_days: 60,
			},
		});
	});
});
