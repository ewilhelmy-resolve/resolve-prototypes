import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { groupMessages } from "@/lib/messageGrouping";
import type { UISchema } from "../types/uiSchema";

// Hybrid Message Schema - Simple flat database structure with rich UI grouping
export interface Message {
	id: string;
	role: "user" | "assistant";
	message: string; // Keep existing column for text content
	timestamp: Date;
	conversation_id: string;
	status:
		| "pending"
		| "processing"
		| "completed"
		| "failed"
		| "sending"
		| "sent";
	error_message?: string;

	/**
	 * Message metadata — drives all rich UI rendering.
	 *
	 * Sent via SSE `new_message` events from the API/Actions Platform.
	 * Each field maps to a specific UI component in the chat.
	 *
	 * @constraint All fields are optional for backward compatibility
	 */
	metadata?: {
		/**
		 * Reasoning/thinking step — renders in the "Thinking..." accordion.
		 *
		 * Each SSE message with `reasoning` becomes one step. Consecutive reasoning
		 * messages are merged into a multi-step accordion with structured rendering.
		 *
		 * Step text is auto-classified by keywords for icon assignment:
		 * - "is working" / "analyst" / "developer" → Bot icon
		 * - "verifying" / "checking" → Search icon
		 * - "generate" / "code" → Code icon
		 * - "starting" / "running" → Zap icon
		 * - "polling" / "execution status" → Workflow icon
		 *
		 * Duplicate consecutive steps are collapsed with ×N badge.
		 * UUIDs in parentheses are auto-hidden (visible on hover).
		 */
		reasoning?: {
			/** The step text displayed in the accordion. Use action verbs and agent names for best icon matching. */
			content: string;
			/** Custom accordion header text. Default: "Thinking..." while streaming, "Thought for N seconds" after. */
			title?: string;
			/** Seconds spent thinking (auto-calculated from streaming duration if not provided). */
			duration?: number;
			/** Real-time streaming state — set by frontend, not typically sent from API. */
			streaming?: boolean;
		};
		sources?: Array<{
			url: string;
			title: string;
			snippet?: string; // Optional excerpt/preview of source content (200-300 chars recommended)
			blob_metadata_id?: string; // NEW: Reference to blob_metadata.id (preferred, from Barista)
			blob_id?: string; // LEGACY: Reference to blob_id (backward compatibility for old messages)
		}>;
		citation_variant?:
			| "hover-card"
			| "modal"
			| "right-panel"
			| "collapsible-list"
			| "inline"; // Controls how citations are displayed
		tasks?: Array<{
			title: string;
			items: string[];
			defaultOpen?: boolean;
		}>;
		files?: Array<{
			url: string;
			filename?: string;
			mediaType: string;
			size?: number;
		}>;
		turn_complete?: boolean; // UI hint: true = turn finished, false/undefined = more messages coming
		/**
		 * Rich completion card — renders a styled result card instead of plain text.
		 * Sent by Actions Platform on the final message (with turn_complete: true).
		 *
		 * - status "success" → green card with confetti (first time only)
		 * - status "error" → red card
		 * - status "warning" → amber card
		 * - details → key-value pairs shown below the title
		 *
		 * Without this field, the response renders as plain markdown (backward compatible).
		 */
		completion?: {
			status: "success" | "error" | "warning";
			title: string;
			details?: Record<string, string | number>;
			confetti?: boolean;
		};
		// Dynamic UI schema - when present, render UI components from JSON schema
		ui_schema?: UISchema;
		// UI form request fields (metadata.type === "ui_form_request")
		type?: string;
		request_id?: string;
		interrupt?: boolean;
		status?: "pending" | "completed" | "cancelled";
		form_data?: Record<string, string>;
		form_action?: string;
		submitted_at?: string;
		workflow_id?: string;
		activity_id?: string;
	};

	// Grouping for multi-part AI responses
	response_group_id?: string; // Links related messages together
}

// Helper function for type detection
export function getMessageType(message: Message): string {
	if (!message.metadata) return "text";

	if (message.metadata.reasoning) return "reasoning";
	if (message.metadata.completion) return "completion";
	if (message.metadata.sources) return "sources";
	if (message.metadata.tasks) return "tasks";
	if (message.metadata.files) return "files";

	return "text"; // Default fallback
}

// Frontend grouping for UI display
export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	timestamp: Date;
	isGroup: boolean;
}

export interface SimpleChatMessage extends ChatMessage {
	isGroup: false;
	message: string;
	metadata?: any;
}

export interface GroupedChatMessage extends ChatMessage {
	isGroup: true;
	parts: Array<{
		id: string;
		message: string;
		metadata?: any;
	}>;
}

// Re-export grouping utilities for backward compatibility
export {
	groupMessages,
	mergeConsecutiveReasoning,
} from "@/lib/messageGrouping";

export interface Conversation {
	id: string;
	title: string;
	created_at: Date;
	updated_at: Date;
}

interface ConversationState {
	// Current conversation
	currentConversationId: string | null;
	conversations: Conversation[];
	messages: Message[]; // Flat messages (matches database)
	chatMessages: ChatMessage[]; // Grouped for UI display

	// UI state
	isLoading: boolean;
	isSending: boolean;

	// Pagination state
	hasMoreMessages: boolean; // Are there older messages to load?
	isLoadingMore: boolean; // Currently loading older messages?

	// Actions
	setCurrentConversation: (conversationId: string | null) => void;
	setConversations: (conversations: Conversation[]) => void;
	addConversation: (conversation: Conversation) => void;
	setMessages: (messages: Message[]) => void;
	addMessage: (message: Message) => void;
	updateMessage: (messageId: string, updates: Partial<Message>) => void;
	setLoading: (loading: boolean) => void;
	setSending: (sending: boolean) => void;
	setHasMoreMessages: (hasMore: boolean) => void;
	setLoadingMore: (loading: boolean) => void;
	clearCurrentConversation: () => void;
	reset: () => void;
	recomputeChatMessages: () => void; // Force regrouping
}

export const useConversationStore = create<ConversationState>()(
	devtools(
		(set) => ({
			// Initial state
			currentConversationId: null,
			conversations: [],
			messages: [],
			chatMessages: [],
			isLoading: false,
			isSending: false,
			hasMoreMessages: false,
			isLoadingMore: false,

			// Actions
			setCurrentConversation: (conversationId) =>
				set({
					currentConversationId: conversationId,
					messages: [],
					chatMessages: [],
					hasMoreMessages: false,
				}),

			setConversations: (conversations) => set({ conversations }),

			addConversation: (conversation) =>
				set((state) => ({
					conversations: [conversation, ...state.conversations],
				})),

			setMessages: (messages) => {
				const chatMessages = groupMessages(messages);
				set({ messages, chatMessages });
			},

			addMessage: (message) =>
				set((state) => {
					const newMessages = [...state.messages, message];
					return {
						messages: newMessages,
						chatMessages: groupMessages(newMessages), // Auto-regroup on every add
					};
				}),

			updateMessage: (messageId, updates) =>
				set((state) => {
					const newMessages = state.messages.map((msg) =>
						msg.id === messageId ? { ...msg, ...updates } : msg,
					);
					return {
						messages: newMessages,
						chatMessages: groupMessages(newMessages), // Auto-regroup on update
					};
				}),

			setLoading: (loading) => set({ isLoading: loading }),

			setSending: (sending) => set({ isSending: sending }),

			setHasMoreMessages: (hasMore) => set({ hasMoreMessages: hasMore }),

			setLoadingMore: (loading) => set({ isLoadingMore: loading }),

			clearCurrentConversation: () =>
				set({
					currentConversationId: null,
					messages: [],
					chatMessages: [],
					hasMoreMessages: false,
					isLoadingMore: false,
				}),

			reset: () =>
				set({
					currentConversationId: null,
					conversations: [],
					messages: [],
					chatMessages: [],
					isLoading: false,
					isSending: false,
					hasMoreMessages: false,
					isLoadingMore: false,
				}),

			recomputeChatMessages: () => {
				set((state) => ({
					chatMessages: groupMessages(state.messages),
				}));
			},
		}),
		{ name: "conversation-store" },
	),
);
