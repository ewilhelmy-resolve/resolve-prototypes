import type { Channel, ConsumeMessage } from "amqplib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mocks before vi.mock is hoisted
const { mockQuery, mockConnect } = vi.hoisted(() => {
	const mockQuery = vi.fn();
	const mockConnect = vi.fn().mockResolvedValue({
		query: mockQuery,
		release: vi.fn(),
	});
	return { mockQuery, mockConnect };
});

vi.mock("../../config/database.js", () => ({
	pool: {
		connect: () => mockConnect(),
		query: mockQuery,
	},
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
		sendToOrganization: vi.fn(),
	}),
}));

vi.mock("../../services/DataSourceService.js", () => ({
	DataSourceService: class {
		updateConnectionStatus = vi.fn();
	},
}));

import { DataSourceStatusConsumer } from "../DataSourceStatusConsumer.js";

describe("DataSourceStatusConsumer - Delegation Verification", () => {
	let consumer: DataSourceStatusConsumer;
	let mockChannel: Channel;
	let mockMessage: ConsumeMessage;

	beforeEach(() => {
		vi.clearAllMocks();

		consumer = new DataSourceStatusConsumer();

		mockChannel = {
			assertQueue: vi.fn().mockResolvedValue({}),
			consume: vi.fn(),
			ack: vi.fn(),
			nack: vi.fn(),
		} as unknown as Channel;

		mockMessage = {
			content: Buffer.from("{}"),
			fields: { deliveryTag: 1 },
			properties: {},
		} as unknown as ConsumeMessage;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("successful delegation verification clears error fields", () => {
		it("should clear last_sync_status and last_verification_error when delegation is verified", async () => {
			const payload = {
				type: "credential_delegation_verification",
				delegation_id: "delegation-123",
				tenant_id: "org-456",
				status: "verified",
				error: null,
			};

			mockMessage.content = Buffer.from(JSON.stringify(payload));

			// Mock delegation token update
			mockQuery
				.mockResolvedValueOnce({
					rows: [
						{
							id: "delegation-123",
							organization_id: "org-456",
							admin_email: "admin@test.com",
							itsm_system_type: "servicenow",
							created_by_user_id: "user-789",
							submitted_settings: {
								instanceUrl: "https://test.service-now.com",
							},
						},
					],
				})
				// Mock audit log insert
				.mockResolvedValueOnce({ rows: [] })
				// Mock data_source_connections update - THIS IS WHAT WE'RE TESTING
				.mockResolvedValueOnce({
					rows: [{ id: "connection-abc" }],
				})
				// Mock delegation token connection_id update
				.mockResolvedValueOnce({ rows: [] });

			await consumer.startConsumer(mockChannel);
			const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>)
				.mock.calls[0][1];

			await consumeCallback(mockMessage);

			// Verify the UPDATE query for data_source_connections includes clearing the fields
			const dataSourceUpdateCall = mockQuery.mock.calls[2];
			const updateQuery = dataSourceUpdateCall[0];

			// Check that the query clears last_verification_error and last_sync_status
			expect(updateQuery).toContain("last_verification_error = NULL");
			expect(updateQuery).toContain("last_sync_status = NULL");
			expect(updateQuery).toContain("last_verification_at = NOW()");
			expect(updateQuery).toContain("status = 'idle'");
			expect(updateQuery).toContain("enabled = true");

			expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
		});

		it("should handle previously failed connection being re-verified", async () => {
			// Simulates: connection had last_sync_status='failed' from previous attempt
			// After successful delegation verification, both error fields should be NULL
			const payload = {
				type: "credential_delegation_verification",
				delegation_id: "delegation-456",
				tenant_id: "org-789",
				status: "verified",
				error: null,
			};

			mockMessage.content = Buffer.from(JSON.stringify(payload));

			mockQuery
				.mockResolvedValueOnce({
					rows: [
						{
							id: "delegation-456",
							organization_id: "org-789",
							admin_email: "itadmin@company.com",
							itsm_system_type: "jira",
							created_by_user_id: "owner-123",
							submitted_settings: {
								url: "https://company.atlassian.net",
								email: "admin@company.com",
							},
						},
					],
				})
				.mockResolvedValueOnce({ rows: [] }) // audit log
				.mockResolvedValueOnce({ rows: [{ id: "jira-connection-id" }] }) // connection update
				.mockResolvedValueOnce({ rows: [] }); // delegation token update

			await consumer.startConsumer(mockChannel);
			const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>)
				.mock.calls[0][1];

			await consumeCallback(mockMessage);

			// Get the connection update query
			const connectionUpdateCall = mockQuery.mock.calls[2];
			const [query, params] = connectionUpdateCall;

			// Verify NULL values are set for error fields
			expect(query).toContain("last_verification_error = NULL");
			expect(query).toContain("last_sync_status = NULL");

			// Verify params contain correct values
			expect(params[0]).toBe(
				JSON.stringify({
					url: "https://company.atlassian.net",
					email: "admin@company.com",
				}),
			); // settings
			expect(params[1]).toBe("owner-123"); // updated_by
			expect(params[2]).toBe("org-789"); // organization_id
			expect(params[3]).toBe("jira"); // type

			expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
		});
	});

	describe("failed delegation verification", () => {
		it("should set error on delegation token but not update connection", async () => {
			const payload = {
				type: "credential_delegation_verification",
				delegation_id: "delegation-fail",
				tenant_id: "org-fail",
				status: "failed",
				error: "Invalid credentials: authentication failed",
			};

			mockMessage.content = Buffer.from(JSON.stringify(payload));

			mockQuery
				.mockResolvedValueOnce({
					rows: [
						{
							id: "delegation-fail",
							organization_id: "org-fail",
							admin_email: "admin@test.com",
							itsm_system_type: "servicenow",
							created_by_user_id: "user-123",
							submitted_settings: {},
						},
					],
				})
				.mockResolvedValueOnce({ rows: [] }); // audit log only

			await consumer.startConsumer(mockChannel);
			const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>)
				.mock.calls[0][1];

			await consumeCallback(mockMessage);

			// Should only have 2 queries: delegation update + audit log
			// (no data_source_connections update on failure)
			expect(mockQuery).toHaveBeenCalledTimes(2);

			// First query updates delegation token with failed status
			const delegationUpdateCall = mockQuery.mock.calls[0];
			expect(delegationUpdateCall[1]).toEqual([
				"failed",
				"Invalid credentials: authentication failed",
				"delegation-fail",
			]);

			expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
		});
	});
});
