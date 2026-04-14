import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPool, mockSendToUser, mockQueueLogger } = vi.hoisted(() => ({
	mockPool: {
		query: vi.fn(),
	},
	mockSendToUser: vi.fn(),
	mockQueueLogger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("../../config/database.js", () => ({
	pool: mockPool,
}));

vi.mock("../sse.js", () => ({
	getSSEService: () => ({ sendToUser: mockSendToUser }),
}));

vi.mock("../../config/logger.js", () => ({
	queueLogger: mockQueueLogger,
}));

import { sendToConversationParticipants } from "../conversationParticipants.js";
import type { SSEEvent } from "../sse.js";

describe("sendToConversationParticipants", () => {
	const conversationId = "conv-1";
	const ownerId = "owner-1";
	const organizationId = "org-1";

	const makeEvent = (type: "message_update" | "new_message"): SSEEvent =>
		type === "message_update"
			? {
					type: "message_update",
					data: {
						messageId: "msg-1",
						status: "completed" as any,
						responseContent: undefined,
						errorMessage: undefined,
						processedAt: new Date().toISOString(),
					},
				}
			: {
					type: "new_message",
					data: {
						messageId: "msg-2",
						conversationId,
						role: "assistant",
						message: "hello",
						metadata: {},
						userId: ownerId,
						createdAt: new Date().toISOString(),
					},
				};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sends event to owner when no participants exist", async () => {
		mockPool.query.mockResolvedValue({ rows: [] });

		const event = makeEvent("message_update");
		await sendToConversationParticipants(
			conversationId,
			ownerId,
			organizationId,
			event,
		);

		expect(mockSendToUser).toHaveBeenCalledTimes(1);
		expect(mockSendToUser).toHaveBeenCalledWith(ownerId, organizationId, event);
	});

	it("sends event to owner + all participants", async () => {
		mockPool.query.mockResolvedValue({
			rows: [{ user_id: "user-2" }, { user_id: "user-3" }],
		});

		const event = makeEvent("message_update");
		await sendToConversationParticipants(
			conversationId,
			ownerId,
			organizationId,
			event,
		);

		expect(mockSendToUser).toHaveBeenCalledTimes(3);
		expect(mockSendToUser).toHaveBeenNthCalledWith(
			1,
			ownerId,
			organizationId,
			event,
		);
		expect(mockSendToUser).toHaveBeenNthCalledWith(
			2,
			"user-2",
			organizationId,
			event,
		);
		expect(mockSendToUser).toHaveBeenNthCalledWith(
			3,
			"user-3",
			organizationId,
			event,
		);
	});

	it("does NOT send duplicate to owner (excluded via SQL WHERE)", async () => {
		// The SQL query filters user_id != ownerId, so even if the owner were
		// a participant row the DB won't return them.
		mockPool.query.mockResolvedValue({
			rows: [{ user_id: "user-2" }],
		});

		const event = makeEvent("new_message");
		await sendToConversationParticipants(
			conversationId,
			ownerId,
			organizationId,
			event,
		);

		const ownerCalls = mockSendToUser.mock.calls.filter(
			(c: any[]) => c[0] === ownerId,
		);
		expect(ownerCalls).toHaveLength(1);
	});

	it("passes correct params to pool query", async () => {
		mockPool.query.mockResolvedValue({ rows: [] });

		await sendToConversationParticipants(
			conversationId,
			ownerId,
			organizationId,
			makeEvent("message_update"),
		);

		expect(mockPool.query).toHaveBeenCalledWith(
			"SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2 AND organization_id = $3",
			[conversationId, ownerId, organizationId],
		);
	});

	it("catches DB error gracefully — sends to owner, logs warning, does not throw", async () => {
		const dbError = new Error("connection refused");
		mockPool.query.mockRejectedValue(dbError);

		const event = makeEvent("message_update");

		// Should not throw
		await expect(
			sendToConversationParticipants(
				conversationId,
				ownerId,
				organizationId,
				event,
			),
		).resolves.toBeUndefined();

		// Owner still received the event (sent before the query)
		expect(mockSendToUser).toHaveBeenCalledWith(ownerId, organizationId, event);

		// Warning logged with error message
		expect(mockQueueLogger.warn).toHaveBeenCalledWith(
			{ error: "connection refused" },
			"Failed to send SSE to participants",
		);
	});

	it("each participant receives the exact same event object", async () => {
		mockPool.query.mockResolvedValue({
			rows: [{ user_id: "user-2" }, { user_id: "user-3" }],
		});

		const event = makeEvent("new_message");
		await sendToConversationParticipants(
			conversationId,
			ownerId,
			organizationId,
			event,
		);

		// All three calls receive the same event reference
		for (const call of mockSendToUser.mock.calls) {
			expect(call[2]).toBe(event);
		}
	});

	it("works with message_update event type", async () => {
		mockPool.query.mockResolvedValue({
			rows: [{ user_id: "user-2" }],
		});

		const event = makeEvent("message_update");
		await sendToConversationParticipants(
			conversationId,
			ownerId,
			organizationId,
			event,
		);

		expect(mockSendToUser).toHaveBeenCalledTimes(2);
		expect(mockSendToUser.mock.calls[0][2].type).toBe("message_update");
		expect(mockSendToUser.mock.calls[1][2].type).toBe("message_update");
	});

	it("works with new_message event type", async () => {
		mockPool.query.mockResolvedValue({
			rows: [{ user_id: "user-2" }],
		});

		const event = makeEvent("new_message");
		await sendToConversationParticipants(
			conversationId,
			ownerId,
			organizationId,
			event,
		);

		expect(mockSendToUser).toHaveBeenCalledTimes(2);
		expect(mockSendToUser.mock.calls[0][2].type).toBe("new_message");
		expect(mockSendToUser.mock.calls[1][2].type).toBe("new_message");
	});
});
