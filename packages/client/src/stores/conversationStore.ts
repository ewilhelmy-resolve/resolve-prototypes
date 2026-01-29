import { create } from "zustand";
import { devtools } from "zustand/middleware";
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

	// NEW: Hybrid approach - metadata for rich types, grouping for UI
	metadata?: {
		// Each property is self-contained with its own content
		reasoning?: {
			content: string; // Reasoning text content
			title?: string; // Optional custom title (e.g., "Research & Analysis", "Planning")
			duration?: number; // How long AI spent thinking
			streaming?: boolean; // Real-time streaming state
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
		// Dynamic UI schema - when present, render UI components from JSON schema
		ui_schema?: UISchema;
	};

	// Grouping for multi-part AI responses
	response_group_id?: string; // Links related messages together
}

// Helper function for type detection
export function getMessageType(message: Message): string {
	if (!message.metadata) return "text";

	if (message.metadata.reasoning) return "reasoning";
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

/**
 * Check if a message part has any reasoning metadata
 */
function hasReasoning(part: { message: string; metadata?: any }): boolean {
	return Boolean(part.metadata?.reasoning);
}

/**
 * Merge consecutive reasoning messages into single reasoning blocks
 *
 * Merging rules:
 * 1. Consecutive reasoning-only messages → merge into one
 * 2. Reasoning-only → Reasoning+Text → merge reasoning content into the text message's reasoning
 * 3. Stop merging when a message has NO reasoning metadata
 *
 * @param parts - Array of message parts
 * @returns Array with merged reasoning parts
 */
function mergeConsecutiveReasoning(
	parts: Array<{ id: string; message: string; metadata?: any }>,
): Array<{ id: string; message: string; metadata?: any }> {
	if (parts.length === 0) return parts;

	const merged: Array<{ id: string; message: string; metadata?: any }> = [];
	let i = 0;

	while (i < parts.length) {
		const currentPart = parts[i];

		// If no reasoning at all, add as-is and continue
		if (!hasReasoning(currentPart)) {
			merged.push(currentPart);
			i++;
			continue;
		}

		// Found part with reasoning - collect all consecutive parts with reasoning
		const reasoningParts = [currentPart];
		let j = i + 1;

		while (j < parts.length && hasReasoning(parts[j])) {
			reasoningParts.push(parts[j]);
			j++;
		}

		// Merge all reasoning content
		const mergedReasoningContent = reasoningParts
			.map((part) => part.metadata!.reasoning!.content)
			.join("\n\n");

		// Use last part's title and streaming state
		const lastPart = reasoningParts[reasoningParts.length - 1];
		const lastReasoning = lastPart.metadata!.reasoning!;

		// Determine which part to use as base:
		// - If last part has text content or other metadata → use last part
		// - Otherwise → use first part
		const hasTextOrMetadata =
			(lastPart.message && lastPart.message.trim().length > 0) ||
			lastPart.metadata?.sources ||
			lastPart.metadata?.tasks ||
			lastPart.metadata?.files;

		const basePart = hasTextOrMetadata ? lastPart : reasoningParts[0];

		// Create merged part
		merged.push({
			id: basePart.id,
			message: basePart.message,
			metadata: {
				...basePart.metadata,
				reasoning: {
					content: mergedReasoningContent,
					title: lastReasoning.title,
					duration: lastReasoning.duration,
					streaming: lastReasoning.streaming,
				},
			},
		});

		// Skip all merged parts
		i = j;
	}

	return merged;
}

// Message grouping utility
export function groupMessages(flatMessages: Message[]): ChatMessage[] {
	if (flatMessages.length === 0) return [];

	const grouped: ChatMessage[] = [];
	const groups: Map<string, Message[]> = new Map();

	// First pass: Collect all grouped messages
	for (const message of flatMessages) {
		if (message.response_group_id) {
			if (!groups.has(message.response_group_id)) {
				groups.set(message.response_group_id, []);
			}
			groups.get(message.response_group_id)!.push(message);
		}
	}

	// Second pass: Process messages in order, grouping consecutive standalone messages
	const processedGroups = new Set<string>();
	let i = 0;

	while (i < flatMessages.length) {
		const message = flatMessages[i];

		if (message.response_group_id) {
			// Process this group if we haven't already
			if (!processedGroups.has(message.response_group_id)) {
				processedGroups.add(message.response_group_id);

				const groupMessages = groups.get(message.response_group_id)!;
				const sortedMessages = groupMessages.sort(
					(a, b) =>
						new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
				);

				// Convert to parts and merge
				const parts = sortedMessages.map((msg) => ({
					id: msg.id,
					message: msg.message,
					metadata: msg.metadata,
				}));

				const mergedParts = mergeConsecutiveReasoning(parts);

				grouped.push({
					id: message.response_group_id,
					role: sortedMessages[0].role,
					isGroup: true,
					parts: mergedParts,
					timestamp: sortedMessages[0].timestamp,
				} as GroupedChatMessage);
			}
			i++;
		} else {
			// Collect consecutive standalone messages
			const standaloneMessages: Message[] = [];
			while (i < flatMessages.length && !flatMessages[i].response_group_id) {
				standaloneMessages.push(flatMessages[i]);
				i++;
			}

			// Convert to parts and merge
			const parts = standaloneMessages.map((msg) => ({
				id: msg.id,
				message: msg.message,
				metadata: msg.metadata,
			}));

			const mergedParts = mergeConsecutiveReasoning(parts);

			// Add each merged part as a chat message
			for (const part of mergedParts) {
				const originalMessage = standaloneMessages.find(
					(m) => m.id === part.id,
				)!;

				const hasMetadata =
					part.metadata &&
					(part.metadata.reasoning ||
						part.metadata.sources ||
						part.metadata.tasks ||
						part.metadata.files);

				if (hasMetadata) {
					grouped.push({
						id: part.id,
						role: originalMessage.role,
						isGroup: true,
						parts: [part],
						timestamp: originalMessage.timestamp,
					} as GroupedChatMessage);
				} else {
					grouped.push({
						id: part.id,
						role: originalMessage.role,
						message: part.message,
						metadata: part.metadata,
						isGroup: false,
						timestamp: originalMessage.timestamp,
					} as SimpleChatMessage);
				}
			}
		}
	}

	return grouped;
}

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
