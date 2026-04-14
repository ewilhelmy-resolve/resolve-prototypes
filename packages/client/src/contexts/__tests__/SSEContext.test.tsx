/**
 * SSEContext.test.tsx - Baseline SSE event verification tests (Phase 0d)
 *
 * Tests the SSE event handling pipeline: SSE event -> store -> grouped messages.
 * Does NOT render SSEProvider (requires Router, QueryClient, real SSE connection).
 * Instead tests the store integration directly, simulating what handleMessage does.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	type ChatMessage,
	type GroupedChatMessage,
	type Message,
	type SimpleChatMessage,
	useConversationStore,
} from "@/stores/conversationStore";

// Helper: build a Message matching the shape SSEContext constructs from new_message events
function buildSSEMessage(
	overrides: Partial<Message> & { id: string },
): Message {
	return {
		role: "assistant",
		message: "",
		timestamp: new Date("2025-01-01T00:00:00Z"),
		conversation_id: "test-conv",
		status: "completed",
		...overrides,
	};
}

// Helper: typed access to grouped parts
function asGrouped(msg: ChatMessage): GroupedChatMessage {
	expect(msg.isGroup).toBe(true);
	return msg as GroupedChatMessage;
}

function asSimple(msg: ChatMessage): SimpleChatMessage {
	expect(msg.isGroup).toBe(false);
	return msg as SimpleChatMessage;
}

describe("SSE Event -> Store Integration", () => {
	beforeEach(() => {
		useConversationStore.getState().reset();
		useConversationStore.setState({ currentConversationId: "test-conv" });
	});

	// ─── new_message: conversation routing ───────────────────────────

	describe("new_message conversation routing", () => {
		it("addMessage adds message when conversationId matches current", () => {
			const msg = buildSSEMessage({
				id: "msg-1",
				message: "Hello",
				conversation_id: "test-conv",
			});

			useConversationStore.getState().addMessage(msg);

			const state = useConversationStore.getState();
			expect(state.messages).toHaveLength(1);
			expect(state.messages[0].id).toBe("msg-1");
			expect(state.chatMessages).toHaveLength(1);
		});

		it("messages from different conversations stay separate in flat store", () => {
			// SSEContext would skip this (conversationId !== currentConversationId).
			// But if somehow added, the store holds them all.
			// This test documents that the FILTERING happens in SSEContext, not the store.
			const msg = buildSSEMessage({
				id: "msg-1",
				message: "From other conv",
				conversation_id: "other-conv",
			});

			useConversationStore.getState().addMessage(msg);

			const state = useConversationStore.getState();
			expect(state.messages).toHaveLength(1);
			// Store does NOT filter by conversation - SSEContext does that check
		});
	});

	// ─── new_message: message construction ───────────────────────────

	describe("new_message message construction", () => {
		it("constructs message with all expected fields from SSE event data", () => {
			const timestamp = new Date("2025-06-15T10:30:00Z");
			const msg = buildSSEMessage({
				id: "msg-full",
				role: "assistant",
				message: "Here is your answer",
				timestamp,
				conversation_id: "test-conv",
				status: "completed",
				response_group_id: "group-1",
				metadata: {
					reasoning: { content: "Thought about it", title: "Analysis" },
				},
			});

			useConversationStore.getState().addMessage(msg);

			const stored = useConversationStore.getState().messages[0];
			expect(stored.id).toBe("msg-full");
			expect(stored.role).toBe("assistant");
			expect(stored.message).toBe("Here is your answer");
			expect(stored.timestamp).toEqual(timestamp);
			expect(stored.conversation_id).toBe("test-conv");
			expect(stored.status).toBe("completed");
			expect(stored.response_group_id).toBe("group-1");
			expect(stored.metadata?.reasoning?.content).toBe("Thought about it");
		});

		it("ui_form_request type sets status to pending", () => {
			// SSEContext sets status = "pending" when metadata.type === "ui_form_request"
			const msg = buildSSEMessage({
				id: "msg-form",
				message: "Please fill this form",
				status: "pending", // SSEContext would set this
				metadata: {
					type: "ui_form_request",
					request_id: "req-1",
					interrupt: true,
				},
			});

			useConversationStore.getState().addMessage(msg);

			const stored = useConversationStore.getState().messages[0];
			expect(stored.status).toBe("pending");
			expect(stored.metadata?.type).toBe("ui_form_request");
			expect(stored.metadata?.request_id).toBe("req-1");
		});

		it("non-form messages default to completed status", () => {
			const msg = buildSSEMessage({
				id: "msg-normal",
				message: "Regular response",
				// status defaults to "completed" in buildSSEMessage, matching SSEContext logic
			});

			useConversationStore.getState().addMessage(msg);

			expect(useConversationStore.getState().messages[0].status).toBe(
				"completed",
			);
		});
	});

	// ─── new_message: metadata passthrough ───────────────────────────

	describe("new_message metadata passthrough", () => {
		it("reasoning metadata passes through unchanged", () => {
			const reasoning = {
				content: "Deep analysis of the problem",
				title: "Research & Analysis",
				duration: 3500,
				streaming: false,
			};

			const msg = buildSSEMessage({
				id: "msg-r",
				metadata: { reasoning },
			});

			useConversationStore.getState().addMessage(msg);

			const stored = useConversationStore.getState().messages[0];
			expect(stored.metadata?.reasoning).toEqual(reasoning);
		});

		it("sources metadata passes through unchanged", () => {
			const sources = [
				{
					url: "https://docs.example.com/guide",
					title: "Setup Guide",
					snippet: "Follow these steps...",
					blob_metadata_id: "blob-123",
				},
				{
					url: "https://kb.example.com/faq",
					title: "FAQ",
				},
			];

			const msg = buildSSEMessage({
				id: "msg-s",
				message: "Based on these sources...",
				metadata: { sources },
			});

			useConversationStore.getState().addMessage(msg);

			const stored = useConversationStore.getState().messages[0];
			expect(stored.metadata?.sources).toEqual(sources);
		});

		it("tasks metadata passes through unchanged", () => {
			const tasks = [
				{
					title: "Setup Steps",
					items: ["Install dependencies", "Configure env"],
					defaultOpen: true,
				},
			];

			const msg = buildSSEMessage({
				id: "msg-t",
				message: "Here are the steps:",
				metadata: { tasks },
			});

			useConversationStore.getState().addMessage(msg);

			const stored = useConversationStore.getState().messages[0];
			expect(stored.metadata?.tasks).toEqual(tasks);
		});

		it("turn_complete flag passes through unchanged", () => {
			const msg = buildSSEMessage({
				id: "msg-tc",
				message: "Final response",
				metadata: { turn_complete: true },
			});

			useConversationStore.getState().addMessage(msg);

			expect(
				useConversationStore.getState().messages[0].metadata?.turn_complete,
			).toBe(true);
		});

		it("response_group_id passes through unchanged", () => {
			const msg = buildSSEMessage({
				id: "msg-rg",
				response_group_id: "group-abc-123",
			});

			useConversationStore.getState().addMessage(msg);

			expect(
				useConversationStore.getState().messages[0].response_group_id,
			).toBe("group-abc-123");
		});
	});

	// ─── Full SSE -> Store -> GroupedMessages pipeline ──────────────

	describe("SSE -> Store -> GroupedMessages pipeline", () => {
		it("single text message produces 1 SimpleChatMessage", () => {
			const msg = buildSSEMessage({
				id: "msg-1",
				message: "Hello, how can I help?",
			});

			useConversationStore.getState().addMessage(msg);

			const { chatMessages } = useConversationStore.getState();
			expect(chatMessages).toHaveLength(1);

			const simple = asSimple(chatMessages[0]);
			expect(simple.message).toBe("Hello, how can I help?");
			expect(simple.role).toBe("assistant");
		});

		it("reasoning + text in same group produces 1 GroupedChatMessage with merged reasoning", () => {
			const reasoning = buildSSEMessage({
				id: "msg-1",
				timestamp: new Date("2025-01-01T00:00:00Z"),
				response_group_id: "group-1",
				metadata: {
					reasoning: { content: "Let me think about this..." },
				},
			});

			const text = buildSSEMessage({
				id: "msg-2",
				message: "Here is your answer",
				timestamp: new Date("2025-01-01T00:00:01Z"),
				response_group_id: "group-1",
				metadata: {
					reasoning: { content: "Confirmed the answer" },
				},
			});

			const store = useConversationStore.getState();
			store.addMessage(reasoning);
			store.addMessage(text);

			const { chatMessages } = useConversationStore.getState();
			expect(chatMessages).toHaveLength(1);

			const grouped = asGrouped(chatMessages[0]);
			expect(grouped.parts).toHaveLength(1); // Merged into 1 part
			expect(grouped.parts[0].message).toBe("Here is your answer");
			expect(grouped.parts[0].metadata.reasoning.content).toBe(
				"Let me think about this...\n\nConfirmed the answer",
			);
		});

		it("three reasoning messages merge into 1 GroupedChatMessage", () => {
			const store = useConversationStore.getState();

			store.addMessage(
				buildSSEMessage({
					id: "msg-1",
					timestamp: new Date("2025-01-01T00:00:00Z"),
					response_group_id: "group-1",
					metadata: { reasoning: { content: "Step 1: Parse the question" } },
				}),
			);
			store.addMessage(
				buildSSEMessage({
					id: "msg-2",
					timestamp: new Date("2025-01-01T00:00:01Z"),
					response_group_id: "group-1",
					metadata: {
						reasoning: { content: "Step 2: Research knowledge base" },
					},
				}),
			);
			store.addMessage(
				buildSSEMessage({
					id: "msg-3",
					timestamp: new Date("2025-01-01T00:00:02Z"),
					response_group_id: "group-1",
					metadata: {
						reasoning: {
							content: "Step 3: Formulate response",
							title: "Complete",
						},
					},
				}),
			);

			const { chatMessages } = useConversationStore.getState();
			expect(chatMessages).toHaveLength(1);

			const grouped = asGrouped(chatMessages[0]);
			expect(grouped.parts).toHaveLength(1);
			expect(grouped.parts[0].metadata.reasoning.content).toBe(
				"Step 1: Parse the question\n\nStep 2: Research knowledge base\n\nStep 3: Formulate response",
			);
			expect(grouped.parts[0].metadata.reasoning.title).toBe("Complete");
		});

		it("reasoning + text + sources in same group preserves all metadata", () => {
			const store = useConversationStore.getState();

			store.addMessage(
				buildSSEMessage({
					id: "msg-1",
					timestamp: new Date("2025-01-01T00:00:00Z"),
					response_group_id: "group-1",
					metadata: { reasoning: { content: "Searching docs..." } },
				}),
			);
			store.addMessage(
				buildSSEMessage({
					id: "msg-2",
					message: "Based on our documentation...",
					timestamp: new Date("2025-01-01T00:00:01Z"),
					response_group_id: "group-1",
					metadata: {
						reasoning: { content: "Found relevant articles" },
						sources: [
							{ url: "https://kb.example.com", title: "Knowledge Base" },
						],
					},
				}),
			);

			const { chatMessages } = useConversationStore.getState();
			const grouped = asGrouped(chatMessages[0]);

			expect(grouped.parts).toHaveLength(1);
			expect(grouped.parts[0].message).toBe("Based on our documentation...");
			expect(grouped.parts[0].metadata.reasoning.content).toBe(
				"Searching docs...\n\nFound relevant articles",
			);
			expect(grouped.parts[0].metadata.sources).toEqual([
				{ url: "https://kb.example.com", title: "Knowledge Base" },
			]);
		});

		it("user message + assistant message produce 2 separate SimpleChatMessages", () => {
			const store = useConversationStore.getState();

			store.addMessage(
				buildSSEMessage({
					id: "msg-user",
					role: "user",
					message: "How do I reset my password?",
					status: "sent",
				}),
			);
			store.addMessage(
				buildSSEMessage({
					id: "msg-assistant",
					role: "assistant",
					message: "Go to Settings > Security > Reset Password",
				}),
			);

			const { chatMessages } = useConversationStore.getState();
			expect(chatMessages).toHaveLength(2);

			const user = asSimple(chatMessages[0]);
			expect(user.role).toBe("user");
			expect(user.message).toBe("How do I reset my password?");

			const assistant = asSimple(chatMessages[1]);
			expect(assistant.role).toBe("assistant");
			expect(assistant.message).toBe(
				"Go to Settings > Security > Reset Password",
			);
		});

		it("ui_form_request message is stored with pending status and form metadata", () => {
			const store = useConversationStore.getState();

			store.addMessage(
				buildSSEMessage({
					id: "msg-form",
					message: "Please provide the following information:",
					status: "pending",
					metadata: {
						type: "ui_form_request",
						request_id: "req-abc",
						interrupt: false,
						workflow_id: "wf-1",
						activity_id: "act-1",
					},
				}),
			);

			const { messages, chatMessages } = useConversationStore.getState();
			expect(messages).toHaveLength(1);
			expect(messages[0].status).toBe("pending");
			expect(messages[0].metadata?.type).toBe("ui_form_request");
			expect(messages[0].metadata?.workflow_id).toBe("wf-1");

			// Form request without reasoning/sources/tasks/files renders as simple
			expect(chatMessages).toHaveLength(1);
			expect(chatMessages[0].isGroup).toBe(false);
		});
	});

	// ─── addMessage auto-regroups on every call ─────────────────────

	describe("addMessage auto-regroups chatMessages", () => {
		it("chatMessages update incrementally as messages arrive", () => {
			const store = useConversationStore.getState();

			// First message arrives
			store.addMessage(
				buildSSEMessage({
					id: "msg-1",
					timestamp: new Date("2025-01-01T00:00:00Z"),
					response_group_id: "group-1",
					metadata: { reasoning: { content: "Thinking..." } },
				}),
			);

			let { chatMessages } = useConversationStore.getState();
			expect(chatMessages).toHaveLength(1);
			const firstGrouped = asGrouped(chatMessages[0]);
			expect(firstGrouped.parts).toHaveLength(1);
			expect(firstGrouped.parts[0].metadata.reasoning.content).toBe(
				"Thinking...",
			);

			// Second message arrives in same group
			store.addMessage(
				buildSSEMessage({
					id: "msg-2",
					message: "The answer is 42",
					timestamp: new Date("2025-01-01T00:00:01Z"),
					response_group_id: "group-1",
					metadata: { reasoning: { content: "Verified" } },
				}),
			);

			({ chatMessages } = useConversationStore.getState());
			expect(chatMessages).toHaveLength(1); // Still 1 group
			const updatedGrouped = asGrouped(chatMessages[0]);
			expect(updatedGrouped.parts).toHaveLength(1); // Merged
			expect(updatedGrouped.parts[0].metadata.reasoning.content).toBe(
				"Thinking...\n\nVerified",
			);
			expect(updatedGrouped.parts[0].message).toBe("The answer is 42");
		});
	});
});
