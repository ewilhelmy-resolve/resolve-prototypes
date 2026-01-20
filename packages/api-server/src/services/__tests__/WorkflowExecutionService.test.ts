/**
 * WorkflowExecutionService.test.ts
 *
 * Tests for iframe workflow execution:
 * - Valkey config fetching
 * - Webhook payload construction with Rita IDs
 * - Actions API postEvent calls
 * - Error handling
 */

import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before imports
vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

const { mockValkeyClient, mockGetValkeyStatus } = vi.hoisted(() => ({
	mockValkeyClient: {
		hget: vi.fn(),
	},
	mockGetValkeyStatus: vi.fn(() => ({
		configured: true,
		url: "redis://localhost:6379",
		connected: true,
	})),
}));

vi.mock("../../config/valkey.js", () => ({
	getValkeyClient: () => mockValkeyClient,
	getValkeyStatus: mockGetValkeyStatus,
}));

vi.mock("../../config/logger.js", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

import type { IframeWebhookConfig } from "../sessionStore.js";
import {
	getWorkflowExecutionService,
	WorkflowExecutionService,
} from "../WorkflowExecutionService.js";

describe("WorkflowExecutionService", () => {
	let service: WorkflowExecutionService;

	const validValkeyConfig: IframeWebhookConfig = {
		accessToken: "jwt-access-token",
		refreshToken: "jwt-refresh-token",
		tabInstanceId: "tab-123",
		tenantId: "tenant-456",
		tenantName: "Test Tenant",
		clientId: "client-abc",
		clientKey: "secret-key-xyz",
		tokenExpiry: Date.now() + 3600000,
		actionsApiBaseUrl: "https://actions.example.com",
		context: { workflowGuid: "wf-123" },
		userGuid: "user-from-host-123",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		service = new WorkflowExecutionService();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getConfigFromValkey", () => {
		it("should fetch and parse valid config from Valkey", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyConfig),
			);

			const { config, debug } =
				await service.getConfigFromValkey("hashkey-123");

			expect(config).not.toBeNull();
			expect(config?.tenantId).toBe("tenant-456");
			expect(config?.actionsApiBaseUrl).toBe("https://actions.example.com");
			expect(debug.valkeyKey).toBe("rita:session:hashkey-123");
			expect(debug.valkeyDataLength).toBeGreaterThan(0);
			expect(mockValkeyClient.hget).toHaveBeenCalledWith(
				"rita:session:hashkey-123",
				"data",
			);
		});

		it("should return null config when key not found", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(null);

			const { config, debug } =
				await service.getConfigFromValkey("missing-key");

			expect(config).toBeNull();
			expect(debug.errorCode).toBe("KEY_NOT_FOUND");
			expect(debug.errorDetails).toContain("does not exist");
		});

		it("should return null config on JSON parse error", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce("invalid-json{{{");

			const { config, debug } =
				await service.getConfigFromValkey("bad-json-key");

			expect(config).toBeNull();
			expect(debug.errorCode).toBe("JSON_PARSE_ERROR");
		});

		it("should return null config when required fields missing", async () => {
			const incompleteConfig = {
				tenantId: "tenant-456",
				// Missing actionsApiBaseUrl, clientId, clientKey
			};
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(incompleteConfig),
			);

			const { config, debug } =
				await service.getConfigFromValkey("incomplete-key");

			expect(config).toBeNull();
			expect(debug.errorCode).toBe("MISSING_FIELDS");
			expect(debug.errorDetails).toContain("actionsApiBaseUrl");
		});

		it("should handle Valkey connection error", async () => {
			mockValkeyClient.hget.mockRejectedValueOnce(
				new Error("Connection refused"),
			);

			const { config, debug } = await service.getConfigFromValkey("any-key");

			expect(config).toBeNull();
			expect(debug.errorCode).toBe("Error");
			expect(debug.errorDetails).toBe("Connection refused");
		});
	});

	describe("executeWorkflow", () => {
		it("should call Actions API with correct payload including Rita IDs from config", async () => {
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { eventId: "event-123" },
			});

			const debug = {
				valkeyStatus: mockGetValkeyStatus(),
				valkeyDurationMs: 50,
			};

			const result = await service.executeWorkflow(validValkeyConfig, debug);

			expect(result.success).toBe(true);
			expect(result.eventId).toBe("event-123");

			// Verify webhook URL construction
			expect(mockedAxios.post).toHaveBeenCalledWith(
				"https://actions.example.com/api/Webhooks/postEvent/tenant-456",
				expect.objectContaining({
					source: "rita-chat-iframe",
					action: "workflow_trigger",
					// Entire Valkey config is spread into payload
					tenantId: "tenant-456",
					tenantName: "Test Tenant",
					tabInstanceId: "tab-123",
					userGuid: "user-from-host-123",
				}),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: expect.stringMatching(/^Basic /),
						"Content-Type": "application/json",
					}),
					timeout: 30000,
				}),
			);
		});

		it("should include access tokens in payload", async () => {
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { eventId: "event-123" },
			});

			const debug = { valkeyStatus: mockGetValkeyStatus() };

			await service.executeWorkflow(validValkeyConfig, debug);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					accessToken: "jwt-access-token",
					refreshToken: "jwt-refresh-token",
					tokenExpiry: validValkeyConfig.tokenExpiry,
				}),
				expect.any(Object),
			);
		});

		it("should mask tokens in debug output", async () => {
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { eventId: "event-123" },
			});

			const debug = { valkeyStatus: mockGetValkeyStatus() };

			const result = await service.executeWorkflow(validValkeyConfig, debug);

			expect(result.debug.webhookPayloadSent?.accessToken).toBe("[MASKED]");
			expect(result.debug.webhookPayloadSent?.refreshToken).toBe("[MASKED]");
			expect(result.debug.webhookPayloadSent?.clientKey).toBe("[MASKED]");
		});

		it("should use Basic auth with clientId:clientKey", async () => {
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { eventId: "event-123" },
			});

			const debug = { valkeyStatus: mockGetValkeyStatus() };

			await service.executeWorkflow(validValkeyConfig, debug);

			const expectedAuth = Buffer.from("client-abc:secret-key-xyz").toString(
				"base64",
			);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Object),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Basic ${expectedAuth}`,
					}),
				}),
			);
		});

		it("should strip trailing slash from base URL", async () => {
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { eventId: "event-123" },
			});

			const configWithTrailingSlash = {
				...validValkeyConfig,
				actionsApiBaseUrl: "https://actions.example.com/",
			};

			const debug = { valkeyStatus: mockGetValkeyStatus() };

			await service.executeWorkflow(configWithTrailingSlash, debug);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				"https://actions.example.com/api/Webhooks/postEvent/tenant-456",
				expect.any(Object),
				expect.any(Object),
			);
		});

		it("should handle HTTP error response", async () => {
			mockedAxios.post.mockRejectedValueOnce({
				response: {
					status: 401,
					data: { error: "Unauthorized" },
				},
				message: "Request failed with status code 401",
			});

			const debug = { valkeyStatus: mockGetValkeyStatus() };

			const result = await service.executeWorkflow(validValkeyConfig, debug);

			expect(result.success).toBe(false);
			expect(result.error).toContain("401");
			expect(result.debug.webhookStatus).toBe(401);
			expect(result.debug.errorCode).toBe("HTTP_401");
		});

		it("should handle network error", async () => {
			mockedAxios.post.mockRejectedValueOnce({
				code: "ECONNREFUSED",
				message: "Connection refused",
			});

			const debug = { valkeyStatus: mockGetValkeyStatus() };

			const result = await service.executeWorkflow(validValkeyConfig, debug);

			expect(result.success).toBe(false);
			expect(result.debug.errorCode).toBe("ECONNREFUSED");
			expect(result.debug.errorDetails).toBe("Connection refused");
		});

		it("should include context from Valkey config", async () => {
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { eventId: "event-123" },
			});

			const debug = { valkeyStatus: mockGetValkeyStatus() };

			await service.executeWorkflow(validValkeyConfig, debug);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					context: { workflowGuid: "wf-123" },
				}),
				expect.any(Object),
			);
		});

		it("should track timing in debug info", async () => {
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { eventId: "event-123" },
			});

			const debug = {
				valkeyStatus: mockGetValkeyStatus(),
				valkeyDurationMs: 25,
			};

			const result = await service.executeWorkflow(validValkeyConfig, debug);

			expect(result.debug.webhookDurationMs).toBeDefined();
			expect(result.debug.webhookDurationMs).toBeGreaterThanOrEqual(0);
			expect(result.debug.totalDurationMs).toBeDefined();
			expect(result.debug.totalDurationMs).toBeGreaterThanOrEqual(25);
		});
	});

	describe("executeFromHashkey", () => {
		it("should fetch config and execute workflow", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyConfig),
			);
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { eventId: "event-123" },
			});

			const result = await service.executeFromHashkey("hashkey-123");

			expect(result.success).toBe(true);
			expect(result.eventId).toBe("event-123");
			expect(mockValkeyClient.hget).toHaveBeenCalled();
			expect(mockedAxios.post).toHaveBeenCalled();
		});

		it("should fail if config fetch fails", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(null);

			const result = await service.executeFromHashkey("missing-key");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Config invalid");
			expect(mockedAxios.post).not.toHaveBeenCalled();
		});

		it("should use Valkey config IDs in webhook payload", async () => {
			mockValkeyClient.hget.mockResolvedValueOnce(
				JSON.stringify(validValkeyConfig),
			);
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { eventId: "event-123" },
			});

			await service.executeFromHashkey("hashkey-123");

			// Verify IDs from Valkey config are spread into payload
			expect(mockedAxios.post).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					userGuid: "user-from-host-123",
					tenantId: "tenant-456",
				}),
				expect.any(Object),
			);
		});
	});

	describe("getWorkflowExecutionService singleton", () => {
		it("should return same instance", () => {
			const instance1 = getWorkflowExecutionService();
			const instance2 = getWorkflowExecutionService();

			expect(instance1).toBe(instance2);
		});
	});
});
