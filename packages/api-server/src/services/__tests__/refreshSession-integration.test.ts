/**
 * Integration test: refreshSessionFromValkey with real Valkey
 *
 * Requires running Valkey: docker compose up -d valkey
 * Run: VALKEY_URL=redis://localhost:6379 pnpm vitest run src/services/__tests__/refreshSession-integration.test.ts
 */
import Redis from "ioredis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const VALKEY_URL = process.env.VALKEY_URL || "redis://localhost:6379";
const TEST_KEY_PREFIX = "rita:session:integration-test-";

// Direct Redis client for test setup/teardown (bypasses app's lazy-connect client)
let testRedis: Redis;

// Track keys for cleanup
const testKeys: string[] = [];

function testKey(suffix: string): string {
	const key = `${TEST_KEY_PREFIX}${suffix}`;
	testKeys.push(key);
	return key;
}

/** Read and parse Valkey hash data field */
async function readValkeyData(key: string): Promise<Record<string, unknown>> {
	const raw = await testRedis.hget(key, "data");
	if (!raw) throw new Error(`No data at ${key}`);
	return JSON.parse(raw);
}

describe("refreshSessionFromValkey - real Valkey integration", () => {
	beforeAll(async () => {
		testRedis = new Redis(VALKEY_URL, { maxRetriesPerRequest: 1 });
		await testRedis.ping(); // verify connection
	});

	afterAll(async () => {
		// Clean up all test keys
		if (testKeys.length > 0) {
			await testRedis.del(...testKeys);
		}
		await testRedis.quit();
	});

	beforeEach(async () => {
		// Clean previous test keys
		if (testKeys.length > 0) {
			await testRedis.del(...testKeys);
			testKeys.length = 0;
		}
	});

	describe("Scenario 1: Actions Platform writes initial payload, Rita reads it", () => {
		it("should read initial payload from Valkey via HGET", async () => {
			const key = testKey("scenario1");
			const payload = {
				tenantId: "TENANT-INT-001",
				userGuid: "user-int-001",
				actionsApiBaseUrl: "https://actions-api-staging.resolve.io/",
				clientId: "client-001",
				clientKey: "key-001",
				context: {
					designer: "activity",
					activityId: 9999,
					activityName: "TestActivity",
				},
			};

			// Actions Platform writes
			await testRedis.hset(key, "data", JSON.stringify(payload));

			// Rita reads
			const parsed = await readValkeyData(key);
			expect(parsed.tenantId).toBe("TENANT-INT-001");
			expect((parsed.context as Record<string, unknown>).activityId).toBe(9999);
			expect((parsed.context as Record<string, unknown>).runId).toBeUndefined(); // not yet added
		});
	});

	describe("Scenario 2: Actions Platform updates context mid-session (adds runId)", () => {
		it("should see updated context after Actions Platform writes runId", async () => {
			const key = testKey("scenario2");

			// Step 1: Actions Platform writes initial payload
			const initialPayload = {
				tenantId: "TENANT-INT-002",
				userGuid: "user-int-002",
				context: {
					designer: "activity",
					activityId: 1001,
					activityName: "CreateTicket",
				},
			};
			await testRedis.hset(key, "data", JSON.stringify(initialPayload));

			// Step 2: Rita reads initial (no runId)
			const read1 = await readValkeyData(key);
			expect((read1.context as Record<string, unknown>).runId).toBeUndefined();

			// Step 3: Actions Platform updates payload (adds runId + workflowStatus)
			const updatedPayload = {
				...initialPayload,
				context: {
					...initialPayload.context,
					runId: 5001,
					workflowStatus: "completed",
				},
			};
			await testRedis.hset(key, "data", JSON.stringify(updatedPayload));

			// Step 4: Rita re-reads — should see runId now
			const read2 = await readValkeyData(key);
			const ctx2 = read2.context as Record<string, unknown>;
			expect(ctx2.runId).toBe(5001);
			expect(ctx2.workflowStatus).toBe("completed");
			expect(ctx2.activityId).toBe(1001); // preserved
			expect(ctx2.designer).toBe("activity"); // preserved
		});
	});

	describe("Scenario 3: Context merge logic (simulating refreshSessionFromValkey)", () => {
		it("should merge fresh Valkey context over existing session context", async () => {
			const key = testKey("scenario3");

			// Existing session context (what Rita has in-memory)
			const sessionContext = {
				designer: "activity",
				activityId: 2209,
				activityName: "HandleAiActivityCreateResponse",
				customField: "from-session",
			};

			// Actions Platform updates Valkey with new fields
			const freshPayload = {
				tenantId: "TENANT-INT-003",
				userGuid: "user-int-003",
				context: {
					designer: "activity",
					activityId: 2209,
					activityName: "HandleAiActivityCreateResponse",
					runId: 7777,
					workflowStatus: "running",
				},
			};
			await testRedis.hset(key, "data", JSON.stringify(freshPayload));

			// Rita re-reads from Valkey
			const freshConfig = await readValkeyData(key);

			// Merge: session context + fresh Valkey context (fresh wins on conflicts)
			const mergedContext = {
				...sessionContext,
				...(freshConfig.context as Record<string, unknown>),
			};

			// Verify merge behavior
			expect(mergedContext).toEqual({
				designer: "activity", // preserved (same in both)
				activityId: 2209, // preserved (same in both)
				activityName: "HandleAiActivityCreateResponse", // preserved
				customField: "from-session", // preserved (only in session)
				runId: 7777, // NEW from Valkey
				workflowStatus: "running", // NEW from Valkey
			});
		});
	});

	describe("Scenario 4: Rapid successive updates", () => {
		it("should always read the latest Valkey state", async () => {
			const key = testKey("scenario4");

			const base = {
				tenantId: "TENANT-INT-004",
				userGuid: "user-int-004",
				context: { activityId: 100 },
			};

			// Update 1
			await testRedis.hset(
				key,
				"data",
				JSON.stringify({
					...base,
					context: { ...base.context, runId: 1 },
				}),
			);

			// Update 2 (immediately after)
			await testRedis.hset(
				key,
				"data",
				JSON.stringify({
					...base,
					context: { ...base.context, runId: 2, step: "processing" },
				}),
			);

			// Update 3 (immediately after)
			await testRedis.hset(
				key,
				"data",
				JSON.stringify({
					...base,
					context: {
						...base.context,
						runId: 3,
						step: "completed",
						result: "success",
					},
				}),
			);

			// Rita reads — should get the LATEST state
			const read = await readValkeyData(key);
			const ctx = read.context as Record<string, unknown>;
			expect(ctx.runId).toBe(3);
			expect(ctx.step).toBe("completed");
			expect(ctx.result).toBe("success");
		});
	});

	describe("Scenario 5: Key expired/deleted", () => {
		it("should return null when Valkey key has been deleted", async () => {
			const key = testKey("scenario5");

			// Write then delete
			await testRedis.hset(
				key,
				"data",
				JSON.stringify({ tenantId: "x", userGuid: "y" }),
			);
			await testRedis.del(key);

			const result = await testRedis.hget(key, "data");
			expect(result).toBeNull();
		});

		it("should return null for non-existent key", async () => {
			const result = await testRedis.hget(
				"rita:session:integration-test-nonexistent-key-12345",
				"data",
			);
			expect(result).toBeNull();
		});
	});

	describe("Scenario 6: storeConversationIdInValkey read-merge-write pattern", () => {
		it("should merge conversationId into existing Valkey data", async () => {
			const key = testKey("scenario6");

			// Actions Platform wrote initial data
			const initial = {
				tenantId: "TENANT-006",
				userGuid: "user-006",
				context: { activityId: 500 },
			};
			await testRedis.hset(key, "data", JSON.stringify(initial));

			// Rita adds conversationId (same pattern as storeConversationIdInValkey)
			const rawData = await testRedis.hget(key, "data");
			const data = rawData ? JSON.parse(rawData) : {};
			data.conversationId = "conv-uuid-123";
			await testRedis.hset(key, "data", JSON.stringify(data));

			// Actions Platform later updates context (adds runId)
			const data2 = await readValkeyData(key);
			(data2.context as Record<string, unknown>).runId = 8888;
			await testRedis.hset(key, "data", JSON.stringify(data2));

			// Rita re-reads — should see both conversationId AND runId
			const final = await readValkeyData(key);
			expect(final.conversationId).toBe("conv-uuid-123");
			expect((final.context as Record<string, unknown>).runId).toBe(8888);
			expect((final.context as Record<string, unknown>).activityId).toBe(500); // preserved
			expect(final.tenantId).toBe("TENANT-006"); // preserved
		});
	});

	describe("Scenario 7: Full refresh flow simulation", () => {
		it("should simulate the complete iframe lifecycle with Valkey refresh", async () => {
			const key = testKey("scenario7");

			// === PHASE 1: Actions Platform writes initial payload ===
			const initialPayload = {
				tenantId: "TENANT-FULL",
				userGuid: "user-full",
				actionsApiBaseUrl: "https://actions-api.example.com/",
				clientId: "cid",
				clientKey: "ckey",
				tenantName: "Full Test Tenant",
				context: {
					designer: "activity",
					activityId: 3000,
					activityName: "FullTestActivity",
				},
			};
			await testRedis.hset(key, "data", JSON.stringify(initialPayload));

			// === PHASE 2: Rita reads initial payload (iframe init) ===
			const initRead = await readValkeyData(key);
			expect(
				(initRead.context as Record<string, unknown>).runId,
			).toBeUndefined();

			// Simulate Rita's in-memory session state
			const sessionWebhookConfig = {
				tenantId: initRead.tenantId,
				userGuid: initRead.userGuid,
				actionsApiBaseUrl: initRead.actionsApiBaseUrl,
				clientId: initRead.clientId,
				clientKey: initRead.clientKey,
				context: { ...(initRead.context as Record<string, unknown>) },
			};

			// === PHASE 3: Actions Platform updates Valkey after workflow runs ===
			const updatedPayload = {
				...initialPayload,
				context: {
					...initialPayload.context,
					runId: 12345,
					activityId: 3001, // Actions Platform may update this too
				},
			};
			await testRedis.hset(key, "data", JSON.stringify(updatedPayload));

			// === PHASE 4: Rita refreshes (re-reads Valkey, merges context) ===
			const freshRead = await readValkeyData(key);
			const mergedConfig = {
				...sessionWebhookConfig,
				context: {
					...sessionWebhookConfig.context,
					...(freshRead.context as Record<string, unknown>),
				},
			};

			// === VERIFY: merged config has fresh runId + preserved fields ===
			expect(mergedConfig.context.runId).toBe(12345);
			expect(mergedConfig.context.activityId).toBe(3001); // updated by Actions Platform
			expect(mergedConfig.context.designer).toBe("activity"); // preserved
			expect(mergedConfig.context.activityName).toBe("FullTestActivity"); // preserved
			expect(mergedConfig.tenantId).toBe("TENANT-FULL");
			expect(mergedConfig.actionsApiBaseUrl).toBe(
				"https://actions-api.example.com/",
			);
		});
	});
});
