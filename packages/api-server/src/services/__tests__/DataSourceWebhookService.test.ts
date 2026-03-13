import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

const mockQuery = vi.fn().mockResolvedValue({});
const mockRelease = vi.fn();

vi.mock("../../config/database.js", () => ({
	pool: {
		connect: vi.fn(() =>
			Promise.resolve({
				query: mockQuery,
				release: mockRelease,
			}),
		),
		query: vi.fn(),
	},
}));

import { DataSourceWebhookService } from "../DataSourceWebhookService.js";

describe("DataSourceWebhookService", () => {
	let service: DataSourceWebhookService;

	const defaultParams = {
		organizationId: "org-123",
		userId: "user-456",
		userEmail: "test@example.com",
		connectionId: "conn-789",
		connectionType: "jira",
		ingestionRunId: "run-101",
		settings: { project: "TEST", maxTickets: 500 },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		service = new DataSourceWebhookService({
			url: "http://test-webhook.example.com/webhook",
			authHeader: "Bearer test-token",
			timeout: 5000,
			retryAttempts: 3,
			retryDelay: 10,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("sendSyncTicketsEvent", () => {
		it("should construct the correct payload", async () => {
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { ok: true },
			});

			await service.sendSyncTicketsEvent(defaultParams);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				"http://test-webhook.example.com/webhook",
				expect.objectContaining({
					source: "rita-chat",
					action: "sync_tickets",
					tenant_id: "org-123",
					user_id: "user-456",
					user_email: "test@example.com",
					connection_id: "conn-789",
					connection_type: "jira",
					ingestion_run_id: "run-101",
					settings: { project: "TEST", maxTickets: 500 },
					timestamp: expect.any(String),
				}),
				expect.anything(),
			);
		});

		it("should return success on 200 response", async () => {
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { ok: true },
			});

			const result = await service.sendSyncTicketsEvent(defaultParams);

			expect(result.success).toBe(true);
			expect(result.status).toBe(200);
		});

		it("should set correct headers", async () => {
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { ok: true },
			});

			await service.sendSyncTicketsEvent(defaultParams);

			expect(mockedAxios.post).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Object),
				expect.objectContaining({
					headers: {
						Authorization: "Bearer test-token",
						"Content-Type": "application/json",
					},
					timeout: 5000,
				}),
			);
		});
	});

	describe("retry logic", () => {
		it("should retry on 500 error and succeed on second attempt", async () => {
			mockedAxios.post
				.mockRejectedValueOnce({
					response: {
						status: 500,
						data: { error: "Server error" },
					},
					message: "Internal Server Error",
				})
				.mockResolvedValueOnce({
					status: 200,
					data: { ok: true },
				});

			const result = await service.sendSyncTicketsEvent(defaultParams);

			expect(mockedAxios.post).toHaveBeenCalledTimes(2);
			expect(result.success).toBe(true);
		});

		it("should retry on 429 error and succeed on second attempt", async () => {
			mockedAxios.post
				.mockRejectedValueOnce({
					response: {
						status: 429,
						data: { error: "Too many requests" },
					},
					message: "Too Many Requests",
				})
				.mockResolvedValueOnce({
					status: 200,
					data: { ok: true },
				});

			const result = await service.sendSyncTicketsEvent(defaultParams);

			expect(mockedAxios.post).toHaveBeenCalledTimes(2);
			expect(result.success).toBe(true);
		});

		it("should NOT retry on 400 error", async () => {
			mockedAxios.post.mockRejectedValueOnce({
				response: {
					status: 400,
					data: { error: "Bad request" },
				},
				message: "Bad request",
			});

			const result = await service.sendSyncTicketsEvent(defaultParams);

			expect(mockedAxios.post).toHaveBeenCalledTimes(1);
			expect(result.success).toBe(false);
		});

		it("should NOT retry on 404 error", async () => {
			mockedAxios.post.mockRejectedValueOnce({
				response: {
					status: 404,
					data: { error: "Not found" },
				},
				message: "Not found",
			});

			const result = await service.sendSyncTicketsEvent(defaultParams);

			expect(mockedAxios.post).toHaveBeenCalledTimes(1);
			expect(result.success).toBe(false);
		});

		it("should store failure after all retries exhausted", async () => {
			const serverError = {
				response: {
					status: 500,
					data: { error: "Server error" },
				},
				message: "Internal Server Error",
			};

			mockedAxios.post
				.mockRejectedValueOnce(serverError)
				.mockRejectedValueOnce(serverError)
				.mockRejectedValueOnce(serverError);

			await service.sendSyncTicketsEvent(defaultParams);

			expect(mockedAxios.post).toHaveBeenCalledTimes(3);
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO rag_webhook_failures"),
				expect.any(Array),
			);
		});

		it("should return failure after all retries exhausted", async () => {
			const serverError = {
				response: {
					status: 500,
					data: { error: "Server error" },
				},
				message: "Internal Server Error",
			};

			mockedAxios.post
				.mockRejectedValueOnce(serverError)
				.mockRejectedValueOnce(serverError)
				.mockRejectedValueOnce(serverError);

			const result = await service.sendSyncTicketsEvent(defaultParams);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Internal Server Error");
		});

		it("should scrub credentials from stored failure payload", async () => {
			mockedAxios.post.mockRejectedValueOnce({
				response: { status: 400, data: { error: "Bad request" } },
				message: "Bad request",
			});

			await service.sendVerifyEvent({
				...defaultParams,
				credentials: {
					apiKey: "sk-super-secret-key",
					username: "admin",
					password: "hunter2",
				},
			});

			const insertCall = mockQuery.mock.calls.find(
				(call: unknown[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO rag_webhook_failures"),
			);
			expect(insertCall).toBeDefined();

			const storedPayload = JSON.parse(insertCall?.[1][2] as string);
			// credentials object must be redacted entirely
			expect(storedPayload.credentials).toBe("[REDACTED]");
			// non-sensitive fields preserved
			expect(storedPayload.connection_id).toBe("conn-789");
			expect(storedPayload.action).toBe("verify_credentials");
		});

		it("should retry on network errors (ECONNABORTED) and succeed", async () => {
			mockedAxios.post
				.mockRejectedValueOnce({
					code: "ECONNABORTED",
					message: "timeout",
				})
				.mockResolvedValueOnce({
					status: 200,
					data: { ok: true },
				});

			const result = await service.sendSyncTicketsEvent(defaultParams);

			expect(mockedAxios.post).toHaveBeenCalledTimes(2);
			expect(result.success).toBe(true);
		});
	});
});
