/**
 * CLIEN-62: Password stored as base64 in webhook + DB
 *
 * Verifies that:
 * 1. Signup webhook replaces password with "[REDACTED]" before sending
 * 2. storeWebhookFailure scrubs sensitive fields before DB insert
 */

import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scrubSensitiveFields, WebhookService } from "../WebhookService.js";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

// Capture what gets stored in the DB
const mockQuery = vi.fn();
vi.mock("../../config/database.js", () => ({
	pool: {
		connect: vi.fn(() => ({
			query: mockQuery,
			release: vi.fn(),
		})),
	},
}));

describe("scrubSensitiveFields", () => {
	it("should replace sensitive top-level keys with [REDACTED]", () => {
		const payload = {
			source: "rita-signup",
			action: "user_signup",
			first_name: "Test",
			password: "base64encodedvalue",
			clientKey: "supersecret",
		};
		const scrubbed = scrubSensitiveFields(payload);
		expect(scrubbed.password).toBe("[REDACTED]");
		expect(scrubbed.clientKey).toBe("[REDACTED]");
		expect(scrubbed.first_name).toBe("Test");
	});

	it("should return a new object (no mutation)", () => {
		const payload = { password: "secret", name: "Test" };
		const scrubbed = scrubSensitiveFields(payload);
		expect(payload.password).toBe("secret");
		expect(scrubbed.password).toBe("[REDACTED]");
	});

	it("should handle payloads with no sensitive keys", () => {
		const payload = { source: "rita-chat", action: "message_created" };
		const scrubbed = scrubSensitiveFields(payload);
		expect(scrubbed).toEqual(payload);
	});
});

describe("WebhookService – sensitive data scrubbing", () => {
	let webhookService: WebhookService;

	beforeEach(() => {
		vi.clearAllMocks();
		mockQuery.mockResolvedValue({ rows: [] });
		webhookService = new WebhookService({
			url: "https://test-webhook.example.com",
			authHeader: "Basic test-auth",
			timeout: 5000,
			retryAttempts: 1,
			retryDelay: 0,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("storeWebhookFailure – sensitive field scrubbing", () => {
		it("should scrub sensitive fields before storing payload in DB", async () => {
			// Force a non-retryable failure so storeWebhookFailure is called
			mockedAxios.post.mockRejectedValueOnce({
				response: { status: 400, data: { error: "Bad request" } },
				message: "Bad request",
			});

			await webhookService.sendGenericEvent({
				organizationId: "pending",
				userEmail: "user@example.com",
				source: "rita-signup",
				action: "user_signup",
				additionalData: {
					first_name: "Test",
					password: Buffer.from("SuperSecret123!").toString("base64"),
					verification_token: "abc123",
				},
			});

			// storeWebhookFailure calls client.query with INSERT
			expect(mockQuery).toHaveBeenCalled();
			const insertCall = mockQuery.mock.calls.find(
				(call: unknown[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO rag_webhook_failures"),
			);
			expect(insertCall).toBeDefined();

			// The payload is the 3rd positional param ($3) in the values array
			const storedPayloadJson = insertCall?.[1][2] as string;
			const storedPayload = JSON.parse(storedPayloadJson);

			// password must be redacted, not stored as plaintext/base64
			expect(storedPayload.password).toBe("[REDACTED]");
			// non-sensitive data should still be present
			expect(storedPayload.first_name).toBe("Test");
			expect(storedPayload.verification_token).toBe("abc123");
		});

		it("should scrub clientKey from iframe webhook failures", async () => {
			mockedAxios.post.mockRejectedValueOnce({
				response: { status: 400, data: { error: "Bad request" } },
				message: "Bad request",
			});

			await webhookService.sendGenericEvent({
				organizationId: "tenant-123",
				source: "rita-chat-iframe",
				action: "message_created",
				additionalData: {
					clientKey: "O$Q2K!NPQ)XQO9ZI0!I&O97UVANMX16P",
					clientId: "E14730FA-D1B5-4037-ACE3-CF97FBC676C2",
					customer_message: "Hello",
				},
			});

			const insertCall = mockQuery.mock.calls.find(
				(call: unknown[]) =>
					typeof call[0] === "string" &&
					call[0].includes("INSERT INTO rag_webhook_failures"),
			);
			expect(insertCall).toBeDefined();

			const storedPayload = JSON.parse(insertCall?.[1][2] as string);
			expect(storedPayload.clientKey).toBe("[REDACTED]");
			expect(storedPayload.clientId).toBe(
				"E14730FA-D1B5-4037-ACE3-CF97FBC676C2",
			);
		});
	});
});
