/**
 * Baseline tests for message grouping behavior.
 *
 * Tests groupMessages() logic used by ChatV2MessageRenderer.
 */

import { describe, expect, it } from "vitest";
import {
	type GroupedChatMessage,
	groupMessages,
	type Message,
	type SimpleChatMessage,
} from "@/stores/conversationStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(overrides: Partial<Message>): Message {
	return {
		id: `msg-${Math.random().toString(36).slice(2, 8)}`,
		role: "assistant",
		message: "",
		timestamp: new Date("2025-01-01T00:00:00Z"),
		conversation_id: "conv-1",
		status: "completed",
		...overrides,
	};
}

// ===================================================================
// groupMessages() — diverse message scenarios
// ===================================================================

describe("groupMessages", () => {
	describe("mixed message types in a single response group", () => {
		it("groups user text, assistant reasoning, assistant text+sources, assistant tasks", () => {
			const messages: Message[] = [
				makeMessage({
					id: "u1",
					role: "user",
					message: "How do I reset my password?",
					status: "sent",
				}),
				makeMessage({
					id: "a1",
					message: "",
					response_group_id: "grp-1",
					timestamp: new Date("2025-01-01T00:00:01Z"),
					metadata: { reasoning: { content: "Checking docs..." } },
				}),
				makeMessage({
					id: "a2",
					message: "Here are the steps to reset your password.",
					response_group_id: "grp-1",
					timestamp: new Date("2025-01-01T00:00:02Z"),
					metadata: {
						sources: [
							{
								url: "https://docs.example.com/reset",
								title: "Password Reset Guide",
							},
						],
					},
				}),
				makeMessage({
					id: "a3",
					message: "",
					response_group_id: "grp-1",
					timestamp: new Date("2025-01-01T00:00:03Z"),
					metadata: {
						tasks: [
							{
								title: "Reset steps",
								items: ["Go to settings", "Click reset", "Check email"],
							},
						],
					},
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(2);

			const userMsg = result[0] as SimpleChatMessage;
			expect(userMsg.isGroup).toBe(false);
			expect(userMsg.role).toBe("user");

			const grouped = result[1] as GroupedChatMessage;
			expect(grouped.isGroup).toBe(true);
			expect(grouped.id).toBe("grp-1");
			expect(grouped.parts.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("standalone messages with metadata become GroupedChatMessage", () => {
		it("wraps a standalone message with reasoning as isGroup: true", () => {
			const messages: Message[] = [
				makeMessage({
					id: "s1",
					metadata: { reasoning: { content: "Thinking..." } },
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(true);
			const grouped = result[0] as GroupedChatMessage;
			expect(grouped.parts).toHaveLength(1);
			expect(grouped.parts[0].metadata.reasoning.content).toBe("Thinking...");
		});

		it("wraps a standalone message with sources as isGroup: true", () => {
			const messages: Message[] = [
				makeMessage({
					id: "s2",
					message: "Here is info.",
					metadata: {
						sources: [{ url: "https://example.com", title: "Example" }],
					},
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(true);
		});

		it("wraps a standalone message with tasks as isGroup: true", () => {
			const messages: Message[] = [
				makeMessage({
					id: "s3",
					metadata: {
						tasks: [{ title: "TODO", items: ["item 1"] }],
					},
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(true);
		});

		it("wraps a standalone message with files as isGroup: true", () => {
			const messages: Message[] = [
				makeMessage({
					id: "s4",
					metadata: {
						files: [
							{
								url: "https://cdn.example.com/f.pdf",
								mediaType: "application/pdf",
							},
						],
					},
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(true);
		});
	});

	describe("standalone messages without metadata become SimpleChatMessage", () => {
		it("returns isGroup: false for plain text user message", () => {
			const messages: Message[] = [
				makeMessage({
					id: "p1",
					role: "user",
					message: "Hello",
					status: "sent",
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(false);
			expect((result[0] as SimpleChatMessage).message).toBe("Hello");
		});

		it("returns isGroup: false for plain text assistant message", () => {
			const messages: Message[] = [
				makeMessage({ id: "p2", message: "Hi there!" }),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(false);
			expect((result[0] as SimpleChatMessage).message).toBe("Hi there!");
		});

		it("returns isGroup: false when metadata has no rich fields", () => {
			const messages: Message[] = [
				makeMessage({
					id: "p3",
					message: "Done",
					metadata: { turn_complete: true },
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(false);
		});
	});

	describe("messages with response_group_id are grouped together", () => {
		it("groups messages sharing the same response_group_id", () => {
			const messages: Message[] = [
				makeMessage({
					id: "g1",
					response_group_id: "grp-A",
					message: "Part 1",
					timestamp: new Date("2025-01-01T00:00:00Z"),
				}),
				makeMessage({
					id: "g2",
					response_group_id: "grp-A",
					message: "Part 2",
					timestamp: new Date("2025-01-01T00:00:01Z"),
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(true);
			expect((result[0] as GroupedChatMessage).parts).toHaveLength(2);
		});

		it("keeps separate groups for different response_group_ids", () => {
			const messages: Message[] = [
				makeMessage({
					id: "g1",
					response_group_id: "grp-A",
					message: "A",
					timestamp: new Date("2025-01-01T00:00:00Z"),
				}),
				makeMessage({
					id: "g2",
					response_group_id: "grp-B",
					message: "B",
					timestamp: new Date("2025-01-01T00:00:01Z"),
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("grp-A");
			expect(result[1].id).toBe("grp-B");
		});
	});

	describe("timestamp ordering within groups", () => {
		it("sorts parts by timestamp ascending regardless of input order", () => {
			const messages: Message[] = [
				makeMessage({
					id: "late",
					response_group_id: "grp-T",
					message: "Second",
					timestamp: new Date("2025-01-01T00:00:05Z"),
				}),
				makeMessage({
					id: "early",
					response_group_id: "grp-T",
					message: "First",
					timestamp: new Date("2025-01-01T00:00:01Z"),
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			const grouped = result[0] as GroupedChatMessage;
			expect(grouped.parts[0].id).toBe("early");
			expect(grouped.parts[1].id).toBe("late");
		});
	});

	describe("interleaved grouped and standalone messages", () => {
		it("preserves order: standalone, grouped, standalone", () => {
			const messages: Message[] = [
				makeMessage({
					id: "s1",
					role: "user",
					message: "Question 1",
					status: "sent",
					timestamp: new Date("2025-01-01T00:00:00Z"),
				}),
				makeMessage({
					id: "g1",
					response_group_id: "grp-1",
					message: "Grouped part 1",
					timestamp: new Date("2025-01-01T00:00:01Z"),
				}),
				makeMessage({
					id: "g2",
					response_group_id: "grp-1",
					message: "Grouped part 2",
					timestamp: new Date("2025-01-01T00:00:02Z"),
				}),
				makeMessage({
					id: "s2",
					role: "user",
					message: "Question 2",
					status: "sent",
					timestamp: new Date("2025-01-01T00:00:03Z"),
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(3);
			expect(result[0].isGroup).toBe(false);
			expect(result[1].isGroup).toBe(true);
			expect(result[2].isGroup).toBe(false);
		});
	});
});
