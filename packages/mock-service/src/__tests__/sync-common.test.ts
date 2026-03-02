import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock database module before importing sync-common
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
import type { ProviderConfig, TrainingScenario } from "../sync-common.js";
import {
	generateDescription,
	getRandomFrom,
	getTrainingScenarioFromConfig,
	getWeightedRandom,
	syncProviderData,
} from "../sync-common.js";

const { __mockClient: mockClient } = (await import("../database.js")) as any;

// Minimal test config with 2 clusters for fast tests
function createTestConfig(overrides?: Partial<ProviderConfig>): ProviderConfig {
	return {
		name: "test-provider",
		loggerName: "test-sync",
		modelName: "Test ITSM Model",
		externalModelIdPrefix: "mock-test-",
		externalIdPrefix: "TST-",
		externalStatus: "Open",
		ticketNumStart: 1001,
		clusterNames: ["Cluster A", "Cluster B"],
		subjectTemplates: {
			"Cluster A": ["Subject A1", "Subject A2"],
			"Cluster B": ["Subject B1"],
		},
		descriptionPrefixes: ["Hello, "],
		descriptionSuffixes: [" Thanks."],
		requesters: ["user@test.com"],
		agents: ["Agent 1", ""],
		priorities: ["low", "high"],
		priorityWeights: [0.5, 0.5],
		kbStatusWeights: [0.3, 0.4, 0.3],
		dateDistribution: [0.5, 1.0],
		dateRanges: [
			[0, 30],
			[30, 90],
		],
		generateMetadata: (ticketNum, subject, requester, agent, priority) => ({
			id: ticketNum,
			subject,
			requester,
			agent,
			priority,
		}),
		getScenarioKey: (settings) =>
			(settings?.scenarioKey as string) || undefined,
		matchScenario: (key: string): TrainingScenario => {
			if (key === "test-null") return "null";
			if (key === "test-failed") return "failed";
			if (key === "test-progress") return "progress";
			return "complete";
		},
		...overrides,
	};
}

describe("utility functions", () => {
	describe("getWeightedRandom", () => {
		it("returns a value from the provided array", () => {
			const values = ["a", "b", "c"];
			const weights = [0.33, 0.34, 0.33];
			const result = getWeightedRandom(values, weights);
			expect(values).toContain(result);
		});

		it("respects weight distribution over many samples", () => {
			const values = ["heavy", "light"];
			const weights = [0.9, 0.1];
			const counts = { heavy: 0, light: 0 };

			for (let i = 0; i < 1000; i++) {
				const r = getWeightedRandom(values, weights);
				counts[r as keyof typeof counts]++;
			}

			// "heavy" should appear significantly more than "light"
			expect(counts.heavy).toBeGreaterThan(counts.light * 3);
		});

		it("returns first value as fallback", () => {
			// With weights summing to less than 1, random > sum falls through
			vi.spyOn(Math, "random").mockReturnValue(0.99);
			const result = getWeightedRandom(["fallback", "other"], [0.1, 0.1]);
			expect(result).toBe("fallback");
			vi.restoreAllMocks();
		});
	});

	describe("getRandomFrom", () => {
		it("returns an element from the array", () => {
			const arr = [1, 2, 3, 4, 5];
			const result = getRandomFrom(arr);
			expect(arr).toContain(result);
		});
	});

	describe("generateDescription", () => {
		it("combines prefix, subject, and suffix", () => {
			const result = generateDescription(
				"test subject",
				["Prefix: "],
				[" End."],
			);
			expect(result).toBe("Prefix: test subject End.");
		});

		it("handles empty prefix and suffix", () => {
			const result = generateDescription("subject", [""], [""]);
			expect(result).toBe("subject");
		});
	});
});

describe("getTrainingScenarioFromConfig", () => {
	const config = createTestConfig();

	it("returns 'complete' when scenario key is undefined", () => {
		expect(getTrainingScenarioFromConfig(config, {})).toBe("complete");
	});

	it("returns 'complete' when settings is undefined", () => {
		expect(getTrainingScenarioFromConfig(config, undefined)).toBe("complete");
	});

	it("delegates to config.matchScenario with the key", () => {
		expect(
			getTrainingScenarioFromConfig(config, { scenarioKey: "test-null" }),
		).toBe("null");
		expect(
			getTrainingScenarioFromConfig(config, { scenarioKey: "test-failed" }),
		).toBe("failed");
		expect(
			getTrainingScenarioFromConfig(config, { scenarioKey: "test-progress" }),
		).toBe("progress");
		expect(
			getTrainingScenarioFromConfig(config, { scenarioKey: "anything-else" }),
		).toBe("complete");
	});
});

describe("syncProviderData", () => {
	const config = createTestConfig();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("mock-null scenario", () => {
		it("cleans up data and returns null modelId", async () => {
			const result = await syncProviderData(
				config,
				"org-123",
				"conn-456",
				"run-789",
				{ scenarioKey: "test-null" },
			);

			expect(result).toEqual({
				modelId: null,
				clustersCreated: 0,
				ticketsCreated: 0,
			});
		});

		it("deletes tickets, clusters, and models", async () => {
			const mockedQuery = vi.mocked(mockQuery);

			await syncProviderData(config, "org-123", "conn-456", "run-789", {
				scenarioKey: "test-null",
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
			await syncProviderData(config, "org-123", "conn-456", "run-789", {
				scenarioKey: "test-null",
			});

			expect(withTransaction).not.toHaveBeenCalled();
		});
	});

	describe("mock-failed scenario", () => {
		it("creates model with failed training state", async () => {
			mockClient.query.mockReset();
			// DELETE tickets + clusters
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			// INSERT ml_model
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-001" }],
			});
			// 2 cluster inserts
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "cluster-0" }],
			});
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "cluster-1" }],
			});
			// Ticket inserts
			for (let i = 0; i < 50; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			const result = await syncProviderData(
				config,
				"org-123",
				"conn-456",
				"run-789",
				{ scenarioKey: "test-failed" },
			);

			expect(result.modelId).toBe("model-001");

			// Verify ml_model was created with "failed" training state
			const mlModelCall = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO ml_models"),
			);
			expect(mlModelCall).toBeDefined();
			const metadata = mlModelCall?.[1][3]; // 4th param (index 3) is metadata
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
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "cluster-0" }],
			});
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "cluster-1" }],
			});
			for (let i = 0; i < 50; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

			await syncProviderData(config, "org-123", "conn-456", "run-789", {
				scenarioKey: "test-failed",
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
			mockClient.query.mockReset();
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-002" }],
			});
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "cluster-0" }],
			});
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "cluster-1" }],
			});
			for (let i = 0; i < 50; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}

			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

			const result = await syncProviderData(
				config,
				"org-123",
				"conn-456",
				"run-789",
				{ scenarioKey: "test-progress" },
			);

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

			const trainingTimeouts = setTimeoutSpy.mock.calls.filter(
				(call) => call[1] === 15000,
			);
			expect(trainingTimeouts).toHaveLength(0);

			setTimeoutSpy.mockRestore();
		});
	});

	describe("default (complete) scenario", () => {
		beforeEach(() => {
			mockClient.query.mockReset();
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "model-003" }],
			});
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "cluster-0" }],
			});
			mockClient.query.mockResolvedValueOnce({
				rows: [{ id: "cluster-1" }],
			});
			for (let i = 0; i < 50; i++) {
				mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
			}
		});

		it("schedules 15s delayed transition to complete", async () => {
			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

			await syncProviderData(config, "org-123", "conn-456", "run-789");

			const trainingTimeouts = setTimeoutSpy.mock.calls.filter(
				(call) => call[1] === 15000,
			);
			expect(trainingTimeouts).toHaveLength(1);

			setTimeoutSpy.mockRestore();
		});

		it("returns correct cluster count from config", async () => {
			const result = await syncProviderData(
				config,
				"org-123",
				"conn-456",
				"run-789",
			);
			expect(result.clustersCreated).toBe(2); // 2 clusters in test config
		});

		it("creates tickets within expected range (5-15 per cluster)", async () => {
			const result = await syncProviderData(
				config,
				"org-123",
				"conn-456",
				"run-789",
			);
			// 2 clusters, 5-15 each → 10-30 tickets
			expect(result.ticketsCreated).toBeGreaterThanOrEqual(10);
			expect(result.ticketsCreated).toBeLessThanOrEqual(30);
		});

		it("uses config externalIdPrefix for ticket external IDs", async () => {
			await syncProviderData(config, "org-123", "conn-456", "run-789");

			const ticketInserts = mockClient.query.mock.calls.filter(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO tickets"),
			);
			expect(ticketInserts.length).toBeGreaterThan(0);

			// external_id is 4th param (index 3)
			const firstExternalId = ticketInserts[0][1][3];
			expect(firstExternalId).toBe("TST-1001");
		});

		it("uses config externalStatus for ticket status", async () => {
			await syncProviderData(config, "org-123", "conn-456", "run-789");

			const ticketInserts = mockClient.query.mock.calls.filter(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO tickets"),
			);

			// external_status is 7th param (index 6)
			const firstStatus = ticketInserts[0][1][6];
			expect(firstStatus).toBe("Open");
		});

		it("uses config modelName for ml_model", async () => {
			await syncProviderData(config, "org-123", "conn-456", "run-789");

			const mlModelCall = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO ml_models"),
			);

			// model_name is 3rd param (index 2)
			expect(mlModelCall?.[1][2]).toBe("Test ITSM Model");
		});

		it("uses config externalModelIdPrefix", async () => {
			await syncProviderData(config, "org-12345678", "conn-456", "run-789");

			const mlModelCall = mockClient.query.mock.calls.find(
				(call: any[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO ml_models"),
			);

			// external_model_id is 2nd param (index 1)
			expect(mlModelCall?.[1][1]).toBe("mock-test-org-1234");
		});
	});
});
