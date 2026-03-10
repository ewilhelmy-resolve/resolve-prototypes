/**
 * CLIEN-62: Password stored as base64 in webhook + DB
 *
 * Verifies that:
 * 1. Signup webhook never sends raw/base64 passwords
 * 2. storeWebhookFailure scrubs sensitive fields before DB insert
 */

import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebhookService } from "../WebhookService.js";

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

/** Keys that must never appear in a webhook payload or stored failure */
const SENSITIVE_KEYS = [
	"password",
	"new_password",
	"current_password",
	"secret",
	"clientKey",
];

function assertNoSensitiveKeys(obj: Record<string, unknown>) {
	const json = JSON.stringify(obj);
	for (const key of SENSITIVE_KEYS) {
		expect(json).not.toContain(`"${key}"`);
	}
}

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

	describe("signup webhook payload", () => {
		it("should NOT include password in the webhook payload sent to platform", async () => {
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: { success: true },
			});

			await webhookService.sendGenericEvent({
				organizationId: "pending",
				userEmail: "user@example.com",
				source: "rita-signup",
				action: "user_signup",
				additionalData: {
					first_name: "Test",
					last_name: "User",
					company: "ACME",
					password: Buffer.from("SuperSecret123!").toString("base64"),
					verification_token: "abc123",
					verification_url: "https://example.com/verify?token=abc123",
				},
			});

			const sentPayload = mockedAxios.post.mock.calls[0][1] as Record<
				string,
				unknown
			>;

			// password must be scrubbed from the outbound payload
			expect(sentPayload.password).toBeUndefined();
			// non-sensitive fields should still be present
			expect(sentPayload.first_name).toBe("Test");
			expect(sentPayload.verification_token).toBe("abc123");
		});
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

			assertNoSensitiveKeys(storedPayload);
			// non-sensitive data should still be present
			expect(storedPayload.first_name).toBe("Test");
		});
	});
});
