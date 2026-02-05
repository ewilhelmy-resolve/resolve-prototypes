/**
 * jarvisSession.test.ts - Unit tests for Jarvis session validation
 *
 * Tests Zod schema validation for Valkey session payloads and webhook events.
 */

import { describe, expect, it } from "vitest";
import {
	ActivityContextSchema,
	getRequiredFields,
	SSEMessageUpdateEventSchema,
	SSENewMessageEventSchema,
	validateValkeyPayload,
	validateWebhookEvent,
	WorkflowContextSchema,
} from "./jarvisSession";

// Valid UUIDs for testing (use lowercase for consistency)
const VALID_UUID = "127781a3-57d4-4dbb-b2cd-dda7b7d7e6e8";
const VALID_TENANT_ID = "b682a485-9978-478c-babc-9b53189c33ed";
const VALID_USER_ID = "a1234567-89ab-4cde-b012-3456789abcde";

// Valid session payload for testing (only required fields)
const validSessionPayload = {
	// REQUIRED - Core Identity
	tenantId: VALID_TENANT_ID,
	userGuid: VALID_USER_ID,
	// REQUIRED - Webhook Execution
	actionsApiBaseUrl: "https://actions-api-staging.resolve.io/",
	clientId: "ED582774-04EE-4F92-A2CE-788A856B7CFD",
	clientKey: "secret-key-value",
};

// Full session payload including optional pass-through fields
const fullSessionPayload = {
	...validSessionPayload,
	// PASS-THROUGH - Optional fields forwarded to Actions API
	accessToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
	refreshToken: "refresh-token-value",
	tabInstanceId: VALID_UUID,
	chatSessionId: VALID_UUID,
	tokenExpiry: 1766593780,
};

// Valid webhook event for testing
const validWebhookEvent = {
	// From session payload (required for webhook)
	...fullSessionPayload,
	// Webhook-specific required fields
	action: "message_created" as const,
	conversation_id: "d425a8db-45d3-4c82-b386-dbe3699120d9",
	message_id: "72de0a1e-2630-4f9f-9ad1-51ab79e9dd0d",
	customer_message: "Create a new custom activity that queries an API",
	source: "rita-chat-iframe" as const,
	timestamp: "2025-12-24T16:21:00.725Z",
	tenant_id: VALID_TENANT_ID,
	user_id: VALID_USER_ID,
};

describe("Jarvis Session Validation", () => {
	describe("ValkeySessionPayloadSchema", () => {
		it("validates a complete valid payload", () => {
			const result = validateValkeyPayload(validSessionPayload);
			expect(result.valid).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.errors).toBeUndefined();
		});

		it("accepts optional fields", () => {
			const payloadWithOptionals = {
				...validSessionPayload,
				refreshToken: "refresh-token-value",
				tenantName: "test-tenant",
				titleText: "Ask Workflow Designer",
				welcomeText: "I can help you build workflows",
				placeholderText: "Describe what you need...",
			};
			const result = validateValkeyPayload(payloadWithOptionals);
			expect(result.valid).toBe(true);
		});

		it("accepts activity context", () => {
			const payloadWithContext = {
				...validSessionPayload,
				context: {
					designer: "activity",
					activityId: 800,
					activityName: "TestActivity",
					activitySource: "using System;",
					language: 1,
					languageName: "C#",
				},
			};
			const result = validateValkeyPayload(payloadWithContext);
			expect(result.valid).toBe(true);
		});

		it("accepts workflow context", () => {
			const payloadWithContext = {
				...validSessionPayload,
				context: {
					designer: "workflow",
					workflowId: 123,
					workflowName: "MyWorkflow",
				},
			};
			const result = validateValkeyPayload(payloadWithContext);
			expect(result.valid).toBe(true);
		});

		describe("required field validation", () => {
			// Core identity fields (REQUIRED)
			it("fails when tenantId is missing", () => {
				const { tenantId: _tenantId, ...payload } = validSessionPayload;
				const result = validateValkeyPayload(payload);
				expect(result.valid).toBe(false);
				expect(result.errorMessages?.some((e) => e.includes("tenantId"))).toBe(
					true,
				);
			});

			it("fails when userGuid is missing", () => {
				const { userGuid: _userGuid, ...payload } = validSessionPayload;
				const result = validateValkeyPayload(payload);
				expect(result.valid).toBe(false);
				expect(result.errorMessages?.some((e) => e.includes("userGuid"))).toBe(
					true,
				);
			});

			// Webhook execution fields (REQUIRED)
			it("fails when actionsApiBaseUrl is missing", () => {
				const { actionsApiBaseUrl: _url, ...payload } = validSessionPayload;
				const result = validateValkeyPayload(payload);
				expect(result.valid).toBe(false);
				expect(
					result.errorMessages?.some((e) => e.includes("actionsApiBaseUrl")),
				).toBe(true);
			});

			it("fails when actionsApiBaseUrl is not a valid URL", () => {
				const result = validateValkeyPayload({
					...validSessionPayload,
					actionsApiBaseUrl: "not-a-url",
				});
				expect(result.valid).toBe(false);
				expect(
					result.errorMessages?.some((e) => e.includes("actionsApiBaseUrl")),
				).toBe(true);
			});

			it("fails when clientId is missing", () => {
				const { clientId: _clientId, ...payload } = validSessionPayload;
				const result = validateValkeyPayload(payload);
				expect(result.valid).toBe(false);
				expect(result.errorMessages?.some((e) => e.includes("clientId"))).toBe(
					true,
				);
			});

			it("fails when clientKey is missing", () => {
				const { clientKey: _clientKey, ...payload } = validSessionPayload;
				const result = validateValkeyPayload(payload);
				expect(result.valid).toBe(false);
				expect(result.errorMessages?.some((e) => e.includes("clientKey"))).toBe(
					true,
				);
			});
		});

		describe("optional pass-through fields", () => {
			// Pass-through fields are OPTIONAL (forwarded to Actions API, not used by RITA)
			it("validates without accessToken (optional)", () => {
				const result = validateValkeyPayload(validSessionPayload);
				expect(result.valid).toBe(true);
			});

			it("validates without tabInstanceId (optional)", () => {
				const result = validateValkeyPayload(validSessionPayload);
				expect(result.valid).toBe(true);
			});

			it("validates without chatSessionId (optional)", () => {
				const result = validateValkeyPayload(validSessionPayload);
				expect(result.valid).toBe(true);
			});

			it("validates without tokenExpiry (optional)", () => {
				const result = validateValkeyPayload(validSessionPayload);
				expect(result.valid).toBe(true);
			});

			it("validates with all pass-through fields provided", () => {
				const result = validateValkeyPayload(fullSessionPayload);
				expect(result.valid).toBe(true);
			});
		});
	});

	describe("WebhookEventSchema", () => {
		it("validates a complete valid event", () => {
			const result = validateWebhookEvent(validWebhookEvent);
			expect(result.valid).toBe(true);
			expect(result.data).toBeDefined();
		});

		it("accepts message_created action", () => {
			const result = validateWebhookEvent({
				...validWebhookEvent,
				action: "message_created",
			});
			expect(result.valid).toBe(true);
		});

		it("accepts workflow_trigger action", () => {
			const result = validateWebhookEvent({
				...validWebhookEvent,
				action: "workflow_trigger",
			});
			expect(result.valid).toBe(true);
		});

		it("fails for invalid action type", () => {
			const result = validateWebhookEvent({
				...validWebhookEvent,
				action: "invalid_action",
			});
			expect(result.valid).toBe(false);
		});

		it("fails when source is not rita-chat-iframe", () => {
			const result = validateWebhookEvent({
				...validWebhookEvent,
				source: "wrong-source",
			});
			expect(result.valid).toBe(false);
		});

		it("fails when customer_message is empty", () => {
			const result = validateWebhookEvent({
				...validWebhookEvent,
				customer_message: "",
			});
			expect(result.valid).toBe(false);
			expect(
				result.errorMessages?.some((e) => e.includes("customer_message")),
			).toBe(true);
		});

		it("fails when conversation_id is not UUID", () => {
			const result = validateWebhookEvent({
				...validWebhookEvent,
				conversation_id: "not-uuid",
			});
			expect(result.valid).toBe(false);
		});

		it("validates without deprecated duplicate fields (tenantId, userGuid)", () => {
			// tenant_id and user_id are the official fields
			// tenantId and userGuid are deprecated duplicates
			const {
				tenantId: _tid,
				userGuid: _uguid,
				...eventWithoutDuplicates
			} = validWebhookEvent;
			const result = validateWebhookEvent(eventWithoutDuplicates);
			expect(result.valid).toBe(true);
		});

		it("fails when timestamp is invalid ISO format", () => {
			const result = validateWebhookEvent({
				...validWebhookEvent,
				timestamp: "not-iso-timestamp",
			});
			expect(result.valid).toBe(false);
		});
	});

	describe("ActivityContextSchema", () => {
		it("validates a complete activity context", () => {
			const context = {
				designer: "activity",
				activityId: 800,
				activityName: "TestActivity",
				activitySource: "using System;",
				language: 1,
				languageName: "C#",
				settings: "{}",
				enabled: true,
				cloud: true,
			};
			const result = ActivityContextSchema.safeParse(context);
			expect(result.success).toBe(true);
		});

		it("requires designer to be activity", () => {
			const context = {
				designer: "workflow",
				activityId: 800,
			};
			const result = ActivityContextSchema.safeParse(context);
			expect(result.success).toBe(false);
		});

		it("requires activityId", () => {
			const context = {
				designer: "activity",
			};
			const result = ActivityContextSchema.safeParse(context);
			expect(result.success).toBe(false);
		});
	});

	describe("WorkflowContextSchema", () => {
		it("validates a complete workflow context", () => {
			const context = {
				designer: "workflow",
				workflowId: 123,
				workflowName: "MyWorkflow",
				workflowDescription: "Test workflow",
			};
			const result = WorkflowContextSchema.safeParse(context);
			expect(result.success).toBe(true);
		});

		it("requires designer to be workflow", () => {
			const context = {
				designer: "activity",
				workflowId: 123,
			};
			const result = WorkflowContextSchema.safeParse(context);
			expect(result.success).toBe(false);
		});

		it("accepts minimal workflow context", () => {
			const context = {
				designer: "workflow",
			};
			const result = WorkflowContextSchema.safeParse(context);
			expect(result.success).toBe(true);
		});
	});

	describe("getRequiredFields", () => {
		it("returns routing fields for SSE/tab/activity routing", () => {
			const fields = getRequiredFields();
			const routingFieldNames = fields.routing.map((r) => r.field);
			// SSE routing
			expect(routingFieldNames).toContain("tenantId");
			expect(routingFieldNames).toContain("userGuid");
			expect(routingFieldNames).toContain("conversationId");
			// Activity routing
			expect(routingFieldNames).toContain("context.activityId");
			// Platform pass-through
			expect(routingFieldNames).toContain("tabInstanceId");
			expect(routingFieldNames).toContain("chatSessionId");
		});

		it("routing fields include purpose descriptions", () => {
			const fields = getRequiredFields();
			const tenantIdField = fields.routing.find((r) => r.field === "tenantId");
			expect(tenantIdField?.purpose).toContain("organization_id");
			const activityField = fields.routing.find(
				(r) => r.field === "context.activityId",
			);
			expect(activityField?.purpose).toContain("activity");
		});

		it("returns session required fields (core identity + webhook auth)", () => {
			const fields = getRequiredFields();
			// Core identity
			expect(fields.session).toContain("tenantId");
			expect(fields.session).toContain("userGuid");
			// Webhook execution
			expect(fields.session).toContain("actionsApiBaseUrl");
			expect(fields.session).toContain("clientId");
			expect(fields.session).toContain("clientKey");
		});

		it("returns SSE event required fields", () => {
			const fields = getRequiredFields();
			expect(fields.sseEvent).toContain("type");
			expect(fields.sseEvent).toContain("messageId");
			expect(fields.sseEvent).toContain("conversationId");
			expect(fields.sseEvent).toContain("role");
			expect(fields.sseEvent).toContain("message");
			expect(fields.sseEvent).toContain("userId");
			expect(fields.sseEvent).toContain("createdAt");
			expect(fields.sseEvent).toContain("metadata.ui_schema");
		});

		it("returns webhook required fields", () => {
			const fields = getRequiredFields();
			expect(fields.webhook).toContain("action");
			expect(fields.webhook).toContain("conversation_id");
			expect(fields.webhook).toContain("message_id");
			expect(fields.webhook).toContain("customer_message");
			expect(fields.webhook).toContain("source");
			expect(fields.webhook).toContain("timestamp");
			expect(fields.webhook).toContain("tenant_id");
			expect(fields.webhook).toContain("user_id");
		});
	});

	describe("SSENewMessageEventSchema", () => {
		const validSSEEvent = {
			type: "new_message" as const,
			messageId: VALID_UUID,
			conversationId: VALID_UUID,
			role: "assistant" as const,
			message: "Hello, how can I help you?",
			userId: VALID_USER_ID,
			createdAt: "2025-12-24T16:21:00.725Z",
		};

		it("validates a minimal new_message event", () => {
			const result = SSENewMessageEventSchema.safeParse(validSSEEvent);
			expect(result.success).toBe(true);
		});

		it("validates event with ui_schema metadata", () => {
			const eventWithSchema = {
				...validSSEEvent,
				metadata: {
					ui_schema: {
						version: "1",
						components: [{ type: "text", content: "Hello" }],
					},
					turn_complete: true,
				},
			};
			const result = SSENewMessageEventSchema.safeParse(eventWithSchema);
			expect(result.success).toBe(true);
		});

		it("fails when type is not new_message", () => {
			const result = SSENewMessageEventSchema.safeParse({
				...validSSEEvent,
				type: "wrong_type",
			});
			expect(result.success).toBe(false);
		});

		it("fails when messageId is not UUID", () => {
			const result = SSENewMessageEventSchema.safeParse({
				...validSSEEvent,
				messageId: "not-a-uuid",
			});
			expect(result.success).toBe(false);
		});

		it("fails when role is invalid", () => {
			const result = SSENewMessageEventSchema.safeParse({
				...validSSEEvent,
				role: "system",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("SSEMessageUpdateEventSchema", () => {
		const validUpdateEvent = {
			type: "message_update" as const,
			messageId: VALID_UUID,
			status: "completed" as const,
		};

		it("validates a minimal message_update event", () => {
			const result = SSEMessageUpdateEventSchema.safeParse(validUpdateEvent);
			expect(result.success).toBe(true);
		});

		it("validates event with responseContent", () => {
			const eventWithContent = {
				...validUpdateEvent,
				responseContent: "Here is the response...",
			};
			const result = SSEMessageUpdateEventSchema.safeParse(eventWithContent);
			expect(result.success).toBe(true);
		});

		it("validates failed status with errorMessage", () => {
			const failedEvent = {
				...validUpdateEvent,
				status: "failed" as const,
				errorMessage: "Something went wrong",
			};
			const result = SSEMessageUpdateEventSchema.safeParse(failedEvent);
			expect(result.success).toBe(true);
		});

		it("accepts all valid statuses", () => {
			for (const status of ["pending", "processing", "completed", "failed"]) {
				const result = SSEMessageUpdateEventSchema.safeParse({
					...validUpdateEvent,
					status,
				});
				expect(result.success).toBe(true);
			}
		});

		it("fails when status is invalid", () => {
			const result = SSEMessageUpdateEventSchema.safeParse({
				...validUpdateEvent,
				status: "unknown",
			});
			expect(result.success).toBe(false);
		});
	});
});
