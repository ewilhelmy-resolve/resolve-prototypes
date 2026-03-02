import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock database module before importing freshdesk-sync
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
import { getTrainingScenario, syncFreshdeskData } from "../freshdesk-sync.js";

// Access the mock client used inside withTransaction
const { __mockClient: mockClient } = (await import("../database.js")) as any;

describe("getTrainingScenario", () => {
	it("returns 'complete' when domain is undefined", () => {
		expect(getTrainingScenario(undefined)).toBe("complete");
	});

	it("returns 'complete' for normal domain", () => {
		expect(getTrainingScenario("acme.freshdesk.com")).toBe("complete");
	});

	it("returns 'null' for mock-null domain", () => {
		expect(getTrainingScenario("mock-null.freshdesk.com")).toBe("null");
	});

	it("returns 'null' for mock-null domain (case insensitive)", () => {
		expect(getTrainingScenario("Mock-Null.freshdesk.com")).toBe("null");
	});

	it("returns 'failed' for mock-failed domain", () => {
		expect(getTrainingScenario("mock-failed.freshdesk.com")).toBe("failed");
	});

	it("returns 'failed' for mock-failed domain (case insensitive)", () => {
		expect(getTrainingScenario("MOCK-FAILED.freshdesk.com")).toBe("failed");
	});

	it("returns 'progress' for mock-progress domain", () => {
		expect(getTrainingScenario("mock-progress.freshdesk.com")).toBe("progress");
	});

	it("returns 'progress' for mock-progress domain (case insensitive)", () => {
		expect(getTrainingScenario("Mock-Progress.freshdesk.com")).toBe("progress");
	});

	it("returns 'complete' for empty string domain", () => {
		expect(getTrainingScenario("")).toBe("complete");
	});

	it("matches mock-null anywhere in domain string", () => {
		expect(getTrainingScenario("https://mock-null.freshdesk.com")).toBe("null");
	});
});

describe("syncFreshdeskData", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("mock-null scenario", () => {
		it("cleans up data and returns null modelId", async () => {
			const result = await syncFreshdeskData("org-123", "conn-456", "run-789", {
				domain: "mock-null.freshdesk.com",
			});

			expect(result).toEqual({
				modelId: null,
				clustersCreated: 0,
				ticketsCreated: 0,
			});
		});

		it("deletes tickets, clusters, and models", async () => {
			const mockedQuery = vi.mocked(mockQuery);

			await syncFreshdeskData("org-123", "conn-456", "run-789", {
				domain: "mock-null.freshdesk.com",
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
			await syncFreshdeskData("org-123", "conn-456", "run-789", {
				domain: "mock-null.freshdesk.com",
			});

			expect(withTransaction).not.toHaveBeenCalled();
		});
	});

	describe("mock-failed scenario", () => {
		beforeEach(() => {
			// ML model insert
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-001" }],
			});
			// DELETE tickets
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			// DELETE clusters
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
		});

		it("creates model with failed training state", async () => {
			// Mock cluster inserts (27 clusters)
			for (let i = 0; i < 27; i++) {
				mockClient.query.mockResolvedValueOnce({
					rows: [{ id: `cluster-${i}` }],
				});
			}
			// Mock ticket inserts (variable per cluster)
			mockClient.query.mockResolvedValue({ rowCount: 1 });

			// withTransaction mock needs to receive the right order of queries
			// The first two queries are DELETE, then INSERT ml_model, then cluster inserts
			mockClient.query.mockReset();
			// DELETE tickets
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			// DELETE clusters
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			// INSERT ml_model
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-001" }],
			});
			// 27 cluster inserts
			for (let i = 0; i < 27; i++) {
				mockClient.query.mockResolvedValueOnce({
					rows: [{ id: `cluster-${i}` }],
				});
			}
			// Ticket inserts (enough for all clusters)
			for (let i = 0; i < 500; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			const result = await syncFreshdeskData("org-123", "conn-456", "run-789", {
				domain: "mock-failed.freshdesk.com",
			});

			expect(result.modelId).toBe("model-001");
			expect(result.clustersCreated).toBe(27);
			expect(result.ticketsCreated).toBeGreaterThan(0);

			// Verify ml_model was created with "failed" training state
			const mlModelCall = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO ml_models"),
			);
			expect(mlModelCall).toBeDefined();
			const metadata = mlModelCall?.[1][3];
			expect(JSON.parse(metadata)).toEqual({
				training_state: "failed",
			});
		});

		it("does NOT schedule delayed transition", async () => {
			mockClient.query.mockReset();
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-001" }],
			});
			for (let i = 0; i < 27; i++) {
				mockClient.query.mockResolvedValueOnce({
					rows: [{ id: `cluster-${i}` }],
				});
			}
			for (let i = 0; i < 500; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

			await syncFreshdeskData("org-123", "conn-456", "run-789", {
				domain: "mock-failed.freshdesk.com",
			});

			// setTimeout should NOT be called for the training transition
			const trainingTimeouts = setTimeoutSpy.mock.calls.filter(
				(call) => call[1] === 15000,
			);
			expect(trainingTimeouts).toHaveLength(0);

			setTimeoutSpy.mockRestore();
		});
	});

	describe("mock-progress scenario", () => {
		it("creates model with in_progress state and does NOT transition", async () => {
			mockClient.query.mockReset();
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-002" }],
			});
			for (let i = 0; i < 27; i++) {
				mockClient.query.mockResolvedValueOnce({
					rows: [{ id: `cluster-${i}` }],
				});
			}
			for (let i = 0; i < 500; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

			const result = await syncFreshdeskData("org-123", "conn-456", "run-789", {
				domain: "mock-progress.freshdesk.com",
			});

			expect(result.modelId).toBe("model-002");

			// Verify in_progress training state
			const mlModelCall = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO ml_models"),
			);
			const metadata = mlModelCall?.[1][3];
			expect(JSON.parse(metadata)).toEqual({
				training_state: "in_progress",
			});

			// Should NOT schedule delayed transition
			const trainingTimeouts = setTimeoutSpy.mock.calls.filter(
				(call) => call[1] === 15000,
			);
			expect(trainingTimeouts).toHaveLength(0);

			setTimeoutSpy.mockRestore();
		});
	});

	describe("default (complete) scenario", () => {
		it("creates model with in_progress state and schedules transition", async () => {
			mockClient.query.mockReset();
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-003" }],
			});
			for (let i = 0; i < 27; i++) {
				mockClient.query.mockResolvedValueOnce({
					rows: [{ id: `cluster-${i}` }],
				});
			}
			for (let i = 0; i < 500; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

			const result = await syncFreshdeskData("org-123", "conn-456", "run-789", {
				domain: "acme.freshdesk.com",
			});

			expect(result.modelId).toBe("model-003");

			// Verify in_progress initial state
			const mlModelCall = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO ml_models"),
			);
			const metadata = mlModelCall?.[1][3];
			expect(JSON.parse(metadata)).toEqual({
				training_state: "in_progress",
			});

			// Should schedule 15s delayed transition to complete
			const trainingTimeouts = setTimeoutSpy.mock.calls.filter(
				(call) => call[1] === 15000,
			);
			expect(trainingTimeouts).toHaveLength(1);

			setTimeoutSpy.mockRestore();
		});

		it("returns correct counts", async () => {
			mockClient.query.mockReset();
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-004" }],
			});
			for (let i = 0; i < 27; i++) {
				mockClient.query.mockResolvedValueOnce({
					rows: [{ id: `cluster-${i}` }],
				});
			}
			for (let i = 0; i < 500; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			const result = await syncFreshdeskData("org-123", "conn-456", "run-789");

			expect(result.clustersCreated).toBe(27);
			// 5-15 tickets per cluster, 27 clusters → 135 to 405 tickets
			expect(result.ticketsCreated).toBeGreaterThanOrEqual(135);
			expect(result.ticketsCreated).toBeLessThanOrEqual(405);
		});

		it("uses FD- prefix for external IDs", async () => {
			mockClient.query.mockReset();
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-005" }],
			});
			for (let i = 0; i < 27; i++) {
				mockClient.query.mockResolvedValueOnce({
					rows: [{ id: `cluster-${i}` }],
				});
			}
			for (let i = 0; i < 500; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			await syncFreshdeskData("org-123", "conn-456", "run-789");

			// Find ticket insert calls
			const ticketInserts = mockClient.query.mock.calls.filter(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO tickets"),
			);
			expect(ticketInserts.length).toBeGreaterThan(0);

			// Verify FD- prefix on external_id (4th param, index 3)
			const firstTicketExternalId = ticketInserts[0][1][3];
			expect(firstTicketExternalId).toMatch(/^FD-\d+$/);
			expect(firstTicketExternalId).toBe("FD-50001");
		});

		it("uses Freshdesk-style source metadata", async () => {
			mockClient.query.mockReset();
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-006" }],
			});
			for (let i = 0; i < 27; i++) {
				mockClient.query.mockResolvedValueOnce({
					rows: [{ id: `cluster-${i}` }],
				});
			}
			for (let i = 0; i < 500; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			await syncFreshdeskData("org-123", "conn-456", "run-789");

			// Find first ticket insert
			const ticketInsert = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO tickets"),
			);

			// source_metadata is 8th param (index 7), JSON string
			const metadata = JSON.parse(ticketInsert?.[1][7]);

			// Freshdesk API fields (NOT ServiceNow value/display_value format)
			expect(metadata).toHaveProperty("id");
			expect(metadata).toHaveProperty("subject");
			expect(metadata).toHaveProperty("type", "Incident");
			expect(metadata).toHaveProperty("source", 2);
			expect(metadata).toHaveProperty("requester");
			expect(metadata.requester).toHaveProperty("email");
			expect(metadata).toHaveProperty("stats");
			expect(metadata.stats).toHaveProperty("agent_responded_at");

			// Should NOT have ServiceNow-style fields
			expect(metadata).not.toHaveProperty("sys_id");
			expect(metadata).not.toHaveProperty("sys_class_name");
			expect(metadata).not.toHaveProperty("short_description");
		});
	});

	describe("data differentiation from ServiceNow", () => {
		it("uses mock-freshdesk-model prefix for external model ID", async () => {
			mockClient.query.mockReset();
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-007" }],
			});
			for (let i = 0; i < 27; i++) {
				mockClient.query.mockResolvedValueOnce({
					rows: [{ id: `cluster-${i}` }],
				});
			}
			for (let i = 0; i < 500; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			await syncFreshdeskData("org-12345678", "conn-456", "run-789");

			const mlModelCall = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO ml_models"),
			);
			// external_model_id is 2nd param (index 1)
			expect(mlModelCall?.[1][1]).toBe("mock-freshdesk-model-org-1234");
		});

		it("uses customer-support cluster names, not internal IT", async () => {
			mockClient.query.mockReset();
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-008" }],
			});
			for (let i = 0; i < 27; i++) {
				mockClient.query.mockResolvedValueOnce({
					rows: [{ id: `cluster-${i}` }],
				});
			}
			for (let i = 0; i < 500; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			await syncFreshdeskData("org-123", "conn-456", "run-789");

			const clusterInserts = mockClient.query.mock.calls.filter(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO clusters"),
			);

			const clusterNames = clusterInserts.map((call: any[]) => call[1][2]);

			// Freshdesk-specific clusters (customer support focused)
			expect(clusterNames).toContain("Subscription & Billing Disputes");
			expect(clusterNames).toContain("Mobile App Crashes");
			expect(clusterNames).toContain("Payment Gateway Errors");
			expect(clusterNames).toContain("SLA Breach Escalations");

			// Should NOT contain ServiceNow internal IT clusters
			expect(clusterNames).not.toContain("Testing");
			expect(clusterNames).not.toContain("Chrome Browser Issues");
			expect(clusterNames).not.toContain("Tableau Issues");
			expect(clusterNames).not.toContain("Salesforce Issues");
			expect(clusterNames).not.toContain("Laptop Screen Issues");
		});

		it("uses external customer requesters, not internal employees", async () => {
			mockClient.query.mockReset();
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-009" }],
			});
			for (let i = 0; i < 27; i++) {
				mockClient.query.mockResolvedValueOnce({
					rows: [{ id: `cluster-${i}` }],
				});
			}
			for (let i = 0; i < 500; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			await syncFreshdeskData("org-123", "conn-456", "run-789");

			const ticketInserts = mockClient.query.mock.calls.filter(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO tickets"),
			);

			// Collect all requester emails (10th param, index 9)
			const requesters = new Set(
				ticketInserts.map((call: any[]) => call[1][9]),
			);

			// Should NOT contain ServiceNow internal requesters
			expect(requesters).not.toContain("adams@acme.com");
			expect(requesters).not.toContain("jsmith@acme.com");

			// Should contain Freshdesk external customer requesters
			const requesterArray = [...requesters];
			const hasFreshdeskRequester = requesterArray.some(
				(r: string) =>
					r.includes("startupco.io") ||
					r.includes("retailchain.com") ||
					r.includes("fintech-corp.com"),
			);
			expect(hasFreshdeskRequester).toBe(true);
		});
	});
});
