import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock database module before importing servicenow-sync
vi.mock("../database.js", () => {
	const mockClient = {
		query: vi.fn(),
	};
	return {
		withTransaction: vi.fn((fn: any) => fn(mockClient)),
		query: vi.fn(),
		__mockClient: mockClient,
	};
});

import { query as mockQuery, withTransaction } from "../database.js";
import { syncServiceNowData } from "../servicenow-sync.js";

const { __mockClient: mockClient } = (await import("../database.js")) as any;

// ServiceNow has 27 clusters
const CLUSTER_COUNT = 27;

function setupMocksForTransaction() {
	mockClient.query.mockReset();
	// DELETE tickets
	mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
	// DELETE clusters
	mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
	// INSERT ml_model
	mockClient.query.mockResolvedValueOnce({
		rows: [{ id: "model-sn-001" }],
	});
	// 27 cluster inserts
	for (let i = 0; i < CLUSTER_COUNT; i++) {
		mockClient.query.mockResolvedValueOnce({
			rows: [{ id: `cluster-${i}` }],
		});
	}
	// Ticket inserts (enough for all clusters)
	for (let i = 0; i < 500; i++) {
		mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
	}
}

describe("syncServiceNowData", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("mock-null scenario", () => {
		it("cleans up data and returns null modelId", async () => {
			const result = await syncServiceNowData(
				"org-123",
				"conn-456",
				"run-789",
				{ username: "mock-null" },
			);

			expect(result).toEqual({
				modelId: null,
				clustersCreated: 0,
				ticketsCreated: 0,
			});
		});

		it("deletes tickets, clusters, and models", async () => {
			const mockedQuery = vi.mocked(mockQuery);

			await syncServiceNowData("org-123", "conn-456", "run-789", {
				username: "mock-null",
			});

			expect(mockedQuery).toHaveBeenCalledWith(
				expect.stringContaining("DELETE FROM tickets"),
				["org-123"],
			);
			expect(mockedQuery).toHaveBeenCalledWith(
				expect.stringContaining("DELETE FROM clusters"),
				["org-123"],
			);
			expect(mockedQuery).toHaveBeenCalledWith(
				expect.stringContaining("DELETE FROM ml_models"),
				["org-123"],
			);
		});

		it("does not call withTransaction", async () => {
			await syncServiceNowData("org-123", "conn-456", "run-789", {
				username: "mock-null",
			});

			expect(withTransaction).not.toHaveBeenCalled();
		});
	});

	describe("mock-failed scenario", () => {
		it("creates model with failed training state", async () => {
			setupMocksForTransaction();

			const result = await syncServiceNowData(
				"org-123",
				"conn-456",
				"run-789",
				{ username: "mock-failed" },
			);

			expect(result.modelId).toBe("model-sn-001");
			expect(result.clustersCreated).toBe(CLUSTER_COUNT);
			expect(result.ticketsCreated).toBeGreaterThan(0);

			// Verify ml_model was created with "failed" training state
			const mlModelCall = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO ml_models"),
			);
			expect(mlModelCall).toBeDefined();
			const metadata = mlModelCall?.[1][3]; // 4th param is metadata
			expect(JSON.parse(metadata)).toEqual({
				training_state: "failed",
			});
		});

		it("does NOT schedule delayed transition", async () => {
			setupMocksForTransaction();
			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

			await syncServiceNowData("org-123", "conn-456", "run-789", {
				username: "mock-failed",
			});

			const trainingTimeouts = setTimeoutSpy.mock.calls.filter(
				(call) => call[1] === 15000,
			);
			expect(trainingTimeouts).toHaveLength(0);

			setTimeoutSpy.mockRestore();
		});
	});

	describe("mock-progress scenario", () => {
		it("creates model with in_progress state and does NOT transition", async () => {
			setupMocksForTransaction();
			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

			const result = await syncServiceNowData(
				"org-123",
				"conn-456",
				"run-789",
				{ username: "mock-progress" },
			);

			expect(result.modelId).toBe("model-sn-001");

			const mlModelCall = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO ml_models"),
			);
			const metadata = mlModelCall?.[1][3];
			expect(JSON.parse(metadata)).toEqual({
				training_state: "in_progress",
			});

			const trainingTimeouts = setTimeoutSpy.mock.calls.filter(
				(call) => call[1] === 15000,
			);
			expect(trainingTimeouts).toHaveLength(0);

			setTimeoutSpy.mockRestore();
		});
	});

	describe("default (complete) scenario", () => {
		it("creates model with in_progress state and schedules transition", async () => {
			setupMocksForTransaction();
			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

			const result = await syncServiceNowData(
				"org-123",
				"conn-456",
				"run-789",
				{ username: "admin" },
			);

			expect(result.modelId).toBe("model-sn-001");

			const mlModelCall = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO ml_models"),
			);
			const metadata = mlModelCall?.[1][3];
			expect(JSON.parse(metadata)).toEqual({
				training_state: "in_progress",
			});

			const trainingTimeouts = setTimeoutSpy.mock.calls.filter(
				(call) => call[1] === 15000,
			);
			expect(trainingTimeouts).toHaveLength(1);

			setTimeoutSpy.mockRestore();
		});

		it("returns correct counts", async () => {
			setupMocksForTransaction();

			const result = await syncServiceNowData("org-123", "conn-456", "run-789");

			expect(result.clustersCreated).toBe(CLUSTER_COUNT);
			// 5-15 tickets per cluster, 27 clusters
			expect(result.ticketsCreated).toBeGreaterThanOrEqual(CLUSTER_COUNT * 5);
			expect(result.ticketsCreated).toBeLessThanOrEqual(CLUSTER_COUNT * 15);
		});

		it("defaults to complete scenario when no settings", async () => {
			setupMocksForTransaction();
			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

			await syncServiceNowData("org-123", "conn-456", "run-789");

			const trainingTimeouts = setTimeoutSpy.mock.calls.filter(
				(call) => call[1] === 15000,
			);
			expect(trainingTimeouts).toHaveLength(1);

			setTimeoutSpy.mockRestore();
		});
	});

	describe("data differentiation from Freshdesk", () => {
		it("uses INC00 prefix for external IDs", async () => {
			setupMocksForTransaction();

			await syncServiceNowData("org-123", "conn-456", "run-789");

			const ticketInserts = mockClient.query.mock.calls.filter(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO tickets"),
			);
			expect(ticketInserts.length).toBeGreaterThan(0);

			const firstExternalId = ticketInserts[0][1][3];
			expect(firstExternalId).toMatch(/^INC00\d+$/);
			expect(firstExternalId).toBe("INC0010001");
		});

		it("uses internal IT cluster names, not customer support", async () => {
			setupMocksForTransaction();

			await syncServiceNowData("org-123", "conn-456", "run-789");

			const clusterInserts = mockClient.query.mock.calls.filter(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO clusters"),
			);

			const clusterNames = clusterInserts.map((call: any[]) => call[1][2]);

			// ServiceNow-specific internal IT clusters
			expect(clusterNames).toContain("Testing");
			expect(clusterNames).toContain("Chrome Browser Issues");
			expect(clusterNames).toContain("Printer Issues");
			expect(clusterNames).toContain("Salesforce Issues");

			// Should NOT contain Freshdesk customer-support clusters
			expect(clusterNames).not.toContain("Subscription & Billing Disputes");
			expect(clusterNames).not.toContain("Mobile App Crashes");
			expect(clusterNames).not.toContain("Payment Gateway Errors");
		});

		it("uses internal employee requesters (@acme.com)", async () => {
			setupMocksForTransaction();

			await syncServiceNowData("org-123", "conn-456", "run-789");

			const ticketInserts = mockClient.query.mock.calls.filter(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO tickets"),
			);

			const requesters = new Set(
				ticketInserts.map((call: any[]) => call[1][9]),
			);

			// Should contain internal @acme.com requesters
			const requesterArray = [...requesters];
			const hasAcmeRequester = requesterArray.some((r: string) =>
				r.includes("@acme.com"),
			);
			expect(hasAcmeRequester).toBe(true);

			// Should NOT contain Freshdesk external requesters
			expect(requesters).not.toContain("cto@startupco.io");
			expect(requesters).not.toContain("devops@fintech-corp.com");
		});

		it("uses ServiceNow value/display_value metadata format", async () => {
			setupMocksForTransaction();

			await syncServiceNowData("org-123", "conn-456", "run-789");

			const ticketInsert = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO tickets"),
			);

			// source_metadata is 8th param (index 7), JSON string
			const metadata = JSON.parse(ticketInsert?.[1][7]);

			// ServiceNow value/display_value format
			expect(metadata).toHaveProperty("sys_id");
			expect(metadata.sys_id).toHaveProperty("value");
			expect(metadata.sys_id).toHaveProperty("display_value");
			expect(metadata).toHaveProperty("sys_class_name");
			expect(metadata).toHaveProperty("short_description");
			expect(metadata).toHaveProperty("caller_id");

			// Should NOT have Freshdesk flat format fields
			expect(metadata).not.toHaveProperty("source");
			expect(metadata).not.toHaveProperty("requester");
			expect(metadata).not.toHaveProperty("stats");
		});

		it("uses mock-model- prefix for external model ID", async () => {
			setupMocksForTransaction();

			await syncServiceNowData("org-12345678", "conn-456", "run-789");

			const mlModelCall = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO ml_models"),
			);
			expect(mlModelCall?.[1][1]).toBe("mock-model-org-1234");
		});

		it("uses 'New' as external status", async () => {
			setupMocksForTransaction();

			await syncServiceNowData("org-123", "conn-456", "run-789");

			const ticketInserts = mockClient.query.mock.calls.filter(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO tickets"),
			);

			// external_status is 7th param (index 6)
			const firstStatus = ticketInserts[0][1][6];
			expect(firstStatus).toBe("New");
		});
	});

	describe("scenario detection uses exact username match", () => {
		it("requires exact 'mock-null' (not partial match)", async () => {
			setupMocksForTransaction();
			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

			// "contains-mock-null-text" should NOT trigger null scenario for ServiceNow
			// because ServiceNow uses exact match (===) not includes()
			const result = await syncServiceNowData(
				"org-123",
				"conn-456",
				"run-789",
				{ username: "contains-mock-null-text" },
			);

			// Should be "complete" scenario (with model), not "null" (without model)
			expect(result.modelId).not.toBeNull();

			const trainingTimeouts = setTimeoutSpy.mock.calls.filter(
				(call) => call[1] === 15000,
			);
			expect(trainingTimeouts).toHaveLength(1);

			setTimeoutSpy.mockRestore();
		});
	});
});
