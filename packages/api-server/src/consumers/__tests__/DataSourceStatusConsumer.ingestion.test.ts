import type { Channel, ConsumeMessage } from "amqplib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock service methods used by processTicketIngestionStatus
const {
	mockUpdateIngestionRunStatus,
	mockUpdateIngestionRunRecords,
	mockUpdateIngestionRunProgress,
	mockUpdateDataSourceStatus,
	mockSendToOrganization,
} = vi.hoisted(() => ({
	mockUpdateIngestionRunStatus: vi.fn().mockResolvedValue(undefined),
	mockUpdateIngestionRunRecords: vi.fn().mockResolvedValue(undefined),
	mockUpdateIngestionRunProgress: vi.fn().mockResolvedValue(true),
	mockUpdateDataSourceStatus: vi.fn().mockResolvedValue({ id: "conn-1" }),
	mockSendToOrganization: vi.fn(),
}));

vi.mock("../../config/database.js", () => ({
	pool: { query: vi.fn() },
}));

vi.mock("../../config/logger.js", () => {
	const MockPerformanceTimer = class {
		end = vi.fn();
	};
	return {
		logError: vi.fn(),
		PerformanceTimer: MockPerformanceTimer,
		queueLogger: {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			child: vi.fn().mockReturnValue({
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
			}),
		},
	};
});

vi.mock("../../services/sse.js", () => ({
	getSSEService: vi.fn().mockReturnValue({
		sendToUser: vi.fn(),
		sendToOrganization: mockSendToOrganization,
	}),
}));

vi.mock("../../services/DataSourceService.js", () => ({
	DataSourceService: class {
		updateIngestionRunStatus = mockUpdateIngestionRunStatus;
		updateIngestionRunRecords = mockUpdateIngestionRunRecords;
		updateIngestionRunProgress = mockUpdateIngestionRunProgress;
		updateDataSourceStatus = mockUpdateDataSourceStatus;
	},
}));

import { DataSourceStatusConsumer } from "../DataSourceStatusConsumer.js";

describe("DataSourceStatusConsumer - Ticket Ingestion", () => {
	let consumer: DataSourceStatusConsumer;
	let mockChannel: Channel;
	let consumeCallback: (msg: ConsumeMessage) => Promise<void>;

	beforeEach(async () => {
		vi.clearAllMocks();

		consumer = new DataSourceStatusConsumer();

		mockChannel = {
			assertQueue: vi.fn().mockResolvedValue({}),
			consume: vi.fn(),
			ack: vi.fn(),
			nack: vi.fn(),
		} as unknown as Channel;

		await consumer.startConsumer(mockChannel);
		consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock
			.calls[0][1];
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	function makeMessage(payload: Record<string, unknown>): ConsumeMessage {
		return {
			content: Buffer.from(JSON.stringify(payload)),
			fields: { deliveryTag: 1 },
			properties: {},
		} as unknown as ConsumeMessage;
	}

	const basePayload = {
		type: "ticket_ingestion",
		tenant_id: "org-1",
		user_id: "user-1",
		ingestion_run_id: "run-1",
		connection_id: "conn-1",
		timestamp: new Date().toISOString(),
	};

	describe("completed status", () => {
		it("should update connection row with last_sync_at on successful completion", async () => {
			await consumeCallback(
				makeMessage({
					...basePayload,
					status: "completed",
					records_processed: 150,
					records_failed: 2,
				}),
			);

			expect(mockUpdateDataSourceStatus).toHaveBeenCalledWith(
				"conn-1",
				"org-1",
				"idle",
				"completed",
				true, // updateLastSyncAt
			);
		});

		it("should update ingestion run status and records", async () => {
			await consumeCallback(
				makeMessage({
					...basePayload,
					status: "completed",
					records_processed: 100,
					records_failed: 0,
				}),
			);

			expect(mockUpdateIngestionRunStatus).toHaveBeenCalledWith(
				"run-1",
				"completed",
				undefined,
				undefined,
			);
			expect(mockUpdateIngestionRunRecords).toHaveBeenCalledWith(
				"run-1",
				100,
				0,
			);
		});

		it("should send SSE event", async () => {
			await consumeCallback(
				makeMessage({
					...basePayload,
					status: "completed",
					records_processed: 50,
				}),
			);

			expect(mockSendToOrganization).toHaveBeenCalledWith(
				"org-1",
				expect.objectContaining({
					type: "ingestion_run_update",
					data: expect.objectContaining({
						connection_id: "conn-1",
						status: "completed",
					}),
				}),
			);
		});
	});

	describe("failed status", () => {
		it("should update connection row with last_sync_at on tickets_below_threshold", async () => {
			await consumeCallback(
				makeMessage({
					...basePayload,
					status: "failed",
					error_message: "tickets_below_threshold",
					error_detail: {
						current_total_tickets: 5,
						needed_total_tickets: 50,
					},
				}),
			);

			expect(mockUpdateDataSourceStatus).toHaveBeenCalledWith(
				"conn-1",
				"org-1",
				"idle",
				"failed",
				true, // updateLastSyncAt
			);
		});

		it("should update connection row with last_sync_at on authentication_failed", async () => {
			await consumeCallback(
				makeMessage({
					...basePayload,
					status: "failed",
					error_message: "authentication_failed",
				}),
			);

			expect(mockUpdateDataSourceStatus).toHaveBeenCalledWith(
				"conn-1",
				"org-1",
				"idle",
				"failed",
				true,
			);
		});

		it("should update connection row with last_sync_at on permission_denied", async () => {
			await consumeCallback(
				makeMessage({
					...basePayload,
					status: "failed",
					error_message: "permission_denied",
				}),
			);

			expect(mockUpdateDataSourceStatus).toHaveBeenCalledWith(
				"conn-1",
				"org-1",
				"idle",
				"failed",
				true,
			);
		});

		it("should not update connection row on generic failure without known error", async () => {
			await consumeCallback(
				makeMessage({
					...basePayload,
					status: "failed",
					error_message: "some_unknown_error",
				}),
			);

			expect(mockUpdateDataSourceStatus).not.toHaveBeenCalled();
		});
	});

	describe("running status", () => {
		it("should not call updateDataSourceStatus", async () => {
			await consumeCallback(
				makeMessage({
					...basePayload,
					status: "running",
					records_processed: 25,
					total_estimated: 100,
				}),
			);

			expect(mockUpdateDataSourceStatus).not.toHaveBeenCalled();
		});

		it("should update ingestion run progress", async () => {
			await consumeCallback(
				makeMessage({
					...basePayload,
					status: "running",
					records_processed: 25,
					records_failed: 1,
					total_estimated: 100,
				}),
			);

			expect(mockUpdateIngestionRunProgress).toHaveBeenCalledWith(
				"run-1",
				25,
				1,
				100,
			);
		});
	});
});
