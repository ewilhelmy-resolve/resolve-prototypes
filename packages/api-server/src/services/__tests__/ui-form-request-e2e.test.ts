/**
 * ui-form-request-e2e.test.ts
 *
 * E2E tests for UI form request flow:
 * 1. RabbitMQ message with ui_form_request → stored as message with metadata
 * 2. Form submission → IframeService updates message metadata to completed
 * 3. Webhook payload sent to platform with form_data (not data)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
const {
	mockPool,
	mockWithOrgContext,
	mockSSEService,
	mockSessionStore,
	mockAxios,
} = vi.hoisted(() => ({
	mockPool: {
		connect: vi.fn(),
		query: vi.fn(),
	},
	mockWithOrgContext: vi.fn(),
	mockSSEService: {
		sendToUser: vi.fn(),
	},
	mockSessionStore: {
		createSession: vi.fn(),
		updateSession: vi.fn(),
		getSessionByConversationId: vi.fn(),
	},
	mockAxios: {
		post: vi.fn(),
	},
}));

vi.mock("../../config/database.js", () => ({
	pool: mockPool,
	withOrgContext: mockWithOrgContext,
}));

vi.mock("../sse.js", () => ({
	getSSEService: () => mockSSEService,
}));

vi.mock("../sessionStore.js", () => ({
	getSessionStore: vi.fn(() => mockSessionStore),
}));

vi.mock("../sessionService.js", () => ({
	getSessionService: vi.fn(() => ({
		generateSessionCookie: vi
			.fn()
			.mockReturnValue("session=mock; Path=/; HttpOnly"),
	})),
}));

vi.mock("../../config/valkey.js", () => ({
	getValkeyClient: () => ({ hget: vi.fn() }),
	getDevMockPayload: () => null,
}));

vi.mock("../../config/logger.js", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
	queueLogger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		child: vi.fn(() => ({
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		})),
	},
	logError: vi.fn(),
	PerformanceTimer: vi.fn(),
}));

vi.mock("axios", () => ({
	default: mockAxios,
}));

vi.mock("amqplib", () => ({
	default: { connect: vi.fn() },
}));

vi.mock("../../consumers/DataSourceStatusConsumer.js", () => ({
	DataSourceStatusConsumer: class {
		startConsumer = vi.fn();
	},
}));

vi.mock("../../consumers/DocumentProcessingConsumer.js", () => ({
	DocumentProcessingConsumer: class {
		startConsumer = vi.fn();
	},
}));

vi.mock("../../consumers/WorkflowConsumer.js", () => ({
	WorkflowConsumer: class {
		startConsumer = vi.fn();
	},
}));

import { IframeService } from "../IframeService.js";
import { RabbitMQService } from "../rabbitmq.js";

// Test data
const TEST_ORG_ID = "00F4F67D-3B92-4FD2-A574-7BE22C6BE796";
const TEST_USER_ID = "275fb79d-0a6f-4336-bc05-1f6fcbaf775b";
const TEST_CONVERSATION_ID = "b18c9d56-7c26-42d0-87ff-07cd7dabb171";
const TEST_MESSAGE_ID = "2b6a2b62-86ef-4bcd-893b-6b6d55c7f7f9";
const TEST_REQUEST_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const TEST_WORKFLOW_ID = "wf-servicenow-setup";
const TEST_ACTIVITY_ID = "collect-credentials";

const TEST_UI_SCHEMA = {
	version: "1",
	modals: {
		"cred-form": {
			title: "ServiceNow Credentials",
			submitAction: "submit_credentials",
			children: [
				{
					type: "input",
					name: "instance_url",
					label: "Instance URL",
					required: true,
				},
				{ type: "input", name: "username", label: "Username", required: true },
				{
					type: "input",
					name: "password",
					label: "Password",
					inputType: "password",
					required: true,
				},
			],
		},
	},
};

const TEST_FORM_METADATA = {
	type: "ui_form_request",
	request_id: TEST_REQUEST_ID,
	workflow_id: TEST_WORKFLOW_ID,
	activity_id: TEST_ACTIVITY_ID,
	ui_schema: TEST_UI_SCHEMA,
	interrupt: true,
	status: "pending",
};

const TEST_WEBHOOK_CONFIG = {
	tenantId: TEST_ORG_ID,
	userGuid: TEST_USER_ID,
	actionsApiBaseUrl: "https://actions-api-staging.resolve.io/",
	clientId: "E14730FA-D1B5-4037-ACE3-CF97FBC676C2",
	clientKey: "test-client-key",
};

describe("UI Form Request E2E", () => {
	let mockClient: {
		query: ReturnType<typeof vi.fn>;
		release: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockClient = {
			query: vi.fn(),
			release: vi.fn(),
		};
		mockPool.connect.mockResolvedValue(mockClient);
		mockAxios.post.mockResolvedValue({ status: 200, data: {} });
	});

	describe("Step 1: RabbitMQ message creates form request message", () => {
		let service: RabbitMQService;

		beforeEach(() => {
			service = new RabbitMQService();
		});

		it("should parse ui_form_request from RabbitMQ response field", async () => {
			const rabbitPayload = {
				tenant_id: TEST_ORG_ID,
				message_id: TEST_MESSAGE_ID,
				conversation_id: TEST_CONVERSATION_ID,
				response: JSON.stringify({
					type: "ui_form_request",
					user_id: TEST_USER_ID,
					workflow_id: TEST_WORKFLOW_ID,
					activity_id: TEST_ACTIVITY_ID,
					interrupt: true,
					ui_schema: TEST_UI_SCHEMA,
				}),
			};

			// Mock: conversation lookup returns user_id
			mockClient.query.mockResolvedValueOnce({
				rows: [{ user_id: TEST_USER_ID }],
			});

			// Mock withOrgContext to capture what gets stored
			let capturedMetadata: any;
			mockWithOrgContext.mockImplementation(
				async (_userId, _orgId, callback) => {
					const mockOrgClient = {
						query: vi.fn().mockImplementation((sql: string, params: any[]) => {
							// Capture the INSERT INTO messages metadata
							if (sql.includes("INSERT INTO messages")) {
								capturedMetadata = JSON.parse(params[4]); // metadata is 5th param
								return { rows: [{ id: "new-msg-id" }] };
							}
							if (sql.includes("SELECT id FROM messages")) {
								return { rows: [{ id: TEST_MESSAGE_ID }] };
							}
							return { rows: [] };
						}),
					};
					return callback(mockOrgClient);
				},
			);

			const processMessage = (service as any).processMessage.bind(service);
			await processMessage(rabbitPayload);

			// Verify metadata stored on message
			expect(capturedMetadata).toBeDefined();
			expect(capturedMetadata.type).toBe("ui_form_request");
			expect(capturedMetadata.request_id).toBeDefined();
			expect(capturedMetadata.workflow_id).toBe(TEST_WORKFLOW_ID);
			expect(capturedMetadata.activity_id).toBe(TEST_ACTIVITY_ID);
			expect(capturedMetadata.interrupt).toBe(true);
			expect(capturedMetadata.status).toBe("pending");
			expect(capturedMetadata.ui_schema).toEqual(TEST_UI_SCHEMA);

			// Verify SSE event sent
			expect(mockSSEService.sendToUser).toHaveBeenCalled();
			const sseCall = mockSSEService.sendToUser.mock.calls.find(
				(c: any) => c[2]?.type === "new_message",
			);
			expect(sseCall).toBeDefined();
			expect(sseCall?.[2].data.metadata.type).toBe("ui_form_request");
		});
	});

	describe("Step 2: Form submission updates message metadata", () => {
		let iframeService: IframeService;

		beforeEach(() => {
			iframeService = new IframeService();
		});

		it("should update message metadata to completed on submit", async () => {
			// Mock: find message by request_id
			mockClient.query
				.mockResolvedValueOnce({
					rows: [
						{
							id: "msg-123",
							metadata: TEST_FORM_METADATA,
							conversation_id: TEST_CONVERSATION_ID,
							organization_id: TEST_ORG_ID,
							user_id: TEST_USER_ID,
						},
					],
				})
				// Mock: UPDATE messages
				.mockResolvedValueOnce({ rows: [] });

			// No webhook config
			mockSessionStore.getSessionByConversationId.mockResolvedValue(null);

			const formData = {
				instance_url: "https://acme.service-now.com",
				username: "admin",
				password: "secret123",
			};

			await iframeService.sendUIFormResponse({
				requestId: TEST_REQUEST_ID,
				action: "submit_credentials",
				status: "submitted",
				data: formData,
			});

			// Verify SELECT query looks up by metadata->>'request_id'
			const selectCall = mockClient.query.mock.calls[0];
			expect(selectCall[0]).toContain("metadata->>'request_id'");
			expect(selectCall[0]).toContain("metadata->>'type' = 'ui_form_request'");
			expect(selectCall[1]).toEqual([TEST_REQUEST_ID]);

			// Verify UPDATE sets metadata with completed status
			const updateCall = mockClient.query.mock.calls[1];
			expect(updateCall[0]).toContain("UPDATE messages SET metadata");
			const updatedMetadata = JSON.parse(updateCall[1][0]);
			expect(updatedMetadata.status).toBe("completed");
			expect(updatedMetadata.form_data).toEqual(formData);
			expect(updatedMetadata.form_action).toBe("submit_credentials");
			expect(updatedMetadata.submitted_at).toBeDefined();
			// Original metadata preserved
			expect(updatedMetadata.type).toBe("ui_form_request");
			expect(updatedMetadata.request_id).toBe(TEST_REQUEST_ID);
			expect(updatedMetadata.ui_schema).toEqual(TEST_UI_SCHEMA);
		});

		it("should update message metadata to cancelled on cancel", async () => {
			mockClient.query
				.mockResolvedValueOnce({
					rows: [
						{
							id: "msg-123",
							metadata: TEST_FORM_METADATA,
							conversation_id: TEST_CONVERSATION_ID,
							organization_id: TEST_ORG_ID,
							user_id: TEST_USER_ID,
						},
					],
				})
				.mockResolvedValueOnce({ rows: [] });

			mockSessionStore.getSessionByConversationId.mockResolvedValue(null);

			await iframeService.sendUIFormResponse({
				requestId: TEST_REQUEST_ID,
				status: "cancelled",
			});

			const updateCall = mockClient.query.mock.calls[1];
			const updatedMetadata = JSON.parse(updateCall[1][0]);
			expect(updatedMetadata.status).toBe("cancelled");
			expect(updatedMetadata.form_data).toBeNull();
			expect(updatedMetadata.form_action).toBeNull();
		});

		it("should reject already-completed form requests", async () => {
			mockClient.query.mockResolvedValueOnce({
				rows: [
					{
						id: "msg-123",
						metadata: { ...TEST_FORM_METADATA, status: "completed" },
						conversation_id: TEST_CONVERSATION_ID,
						organization_id: TEST_ORG_ID,
						user_id: TEST_USER_ID,
					},
				],
			});

			await expect(
				iframeService.sendUIFormResponse({
					requestId: TEST_REQUEST_ID,
					status: "submitted",
					data: { field: "value" },
				}),
			).rejects.toThrow("already completed");
		});

		it("should reject unknown request_id", async () => {
			mockClient.query.mockResolvedValueOnce({ rows: [] });

			await expect(
				iframeService.sendUIFormResponse({
					requestId: "nonexistent-id",
					status: "submitted",
					data: { field: "value" },
				}),
			).rejects.toThrow("not found");
		});
	});

	describe("Step 3: Webhook payload uses form_data", () => {
		let iframeService: IframeService;

		beforeEach(() => {
			iframeService = new IframeService();
		});

		it("should send webhook with form_data field (not data)", async () => {
			const formData = {
				instance_url: "https://acme.service-now.com",
				username: "admin",
				password: "secret123",
			};

			// Mock: find message
			mockClient.query
				.mockResolvedValueOnce({
					rows: [
						{
							id: "msg-123",
							metadata: TEST_FORM_METADATA,
							conversation_id: TEST_CONVERSATION_ID,
							organization_id: TEST_ORG_ID,
							user_id: TEST_USER_ID,
						},
					],
				})
				.mockResolvedValueOnce({ rows: [] }); // UPDATE

			// Mock: session with webhook config
			mockSessionStore.getSessionByConversationId.mockResolvedValue({
				sessionId: "session-1",
				userId: TEST_USER_ID,
				organizationId: TEST_ORG_ID,
				userEmail: "test@test.com",
				expiresAt: new Date(Date.now() + 86400000),
				createdAt: new Date(),
				lastAccessedAt: new Date(),
				iframeWebhookConfig: TEST_WEBHOOK_CONFIG,
				conversationId: TEST_CONVERSATION_ID,
			});

			await iframeService.sendUIFormResponse({
				requestId: TEST_REQUEST_ID,
				action: "submit_credentials",
				status: "submitted",
				data: formData,
			});

			// Verify axios.post was called
			expect(mockAxios.post).toHaveBeenCalledTimes(1);

			const [webhookUrl, webhookPayload, options] =
				mockAxios.post.mock.calls[0];

			// Verify webhook URL
			expect(webhookUrl).toBe(
				`https://actions-api-staging.resolve.io/api/Webhooks/postEvent/${TEST_ORG_ID}`,
			);

			// Verify payload uses form_data (NOT data)
			expect(webhookPayload.source).toBe("rita-chat-iframe");
			expect(webhookPayload.action).toBe("ui_form_response");
			expect(webhookPayload.request_id).toBe(TEST_REQUEST_ID);
			expect(webhookPayload.status).toBe("submitted");
			expect(webhookPayload.form_action).toBe("submit_credentials");
			expect(webhookPayload.form_data).toEqual(formData);
			expect(webhookPayload.workflow_id).toBe(TEST_WORKFLOW_ID);
			expect(webhookPayload.activity_id).toBe(TEST_ACTIVITY_ID);
			expect(webhookPayload.tenant_id).toBe(TEST_ORG_ID);
			expect(webhookPayload.user_id).toBe(TEST_USER_ID);
			expect(webhookPayload.timestamp).toBeDefined();

			// Verify NO "data" field on payload (it's form_data)
			expect(webhookPayload).not.toHaveProperty("data");

			// Verify auth header
			const expectedAuth = `Basic ${Buffer.from(`${TEST_WEBHOOK_CONFIG.clientId}:${TEST_WEBHOOK_CONFIG.clientKey}`).toString("base64")}`;
			expect(options.headers.Authorization).toBe(expectedAuth);
		});

		it("should not send webhook when no config available", async () => {
			mockClient.query
				.mockResolvedValueOnce({
					rows: [
						{
							id: "msg-123",
							metadata: TEST_FORM_METADATA,
							conversation_id: TEST_CONVERSATION_ID,
							organization_id: TEST_ORG_ID,
							user_id: TEST_USER_ID,
						},
					],
				})
				.mockResolvedValueOnce({ rows: [] });

			mockSessionStore.getSessionByConversationId.mockResolvedValue(null);

			await iframeService.sendUIFormResponse({
				requestId: TEST_REQUEST_ID,
				action: "submit_credentials",
				status: "submitted",
				data: { field: "value" },
			});

			// No webhook sent
			expect(mockAxios.post).not.toHaveBeenCalled();
		});
	});
});
