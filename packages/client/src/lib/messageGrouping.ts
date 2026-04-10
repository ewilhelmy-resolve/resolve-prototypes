import type {
	ChatMessage,
	GroupedChatMessage,
	Message,
	SimpleChatMessage,
} from "@/stores/conversationStore";

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
export function mergeConsecutiveReasoning(
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
			.map((part) => part.metadata?.reasoning?.content ?? "")
			.join("\n\n");

		// Use last part's title and streaming state
		const lastPart = reasoningParts[reasoningParts.length - 1];
		const lastReasoning = lastPart.metadata?.reasoning;

		// Determine which part to use as base:
		// - If last part has text content or other metadata → use last part
		// - Otherwise → use first part
		const hasTextOrMetadata =
			(lastPart.message && lastPart.message.trim().length > 0) ||
			lastPart.metadata?.sources ||
			lastPart.metadata?.tasks ||
			lastPart.metadata?.files ||
			lastPart.metadata?.completion;

		const basePart = hasTextOrMetadata ? lastPart : reasoningParts[0];

		// Create merged part
		merged.push({
			id: basePart.id,
			message: basePart.message,
			metadata: {
				...basePart.metadata,
				reasoning: {
					content: mergedReasoningContent,
					title: lastReasoning?.title,
					duration: lastReasoning?.duration,
					streaming: lastReasoning?.streaming,
				},
			},
		});

		// Skip all merged parts
		i = j;
	}

	return merged;
}

/**
 * Group flat messages into UI-ready ChatMessage array.
 * Messages with response_group_id are grouped together.
 * Consecutive standalone messages with metadata are wrapped as GroupedChatMessage.
 * Plain text messages become SimpleChatMessage.
 */
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
			groups.get(message.response_group_id)?.push(message);
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

				const groupMsgs = groups.get(message.response_group_id) ?? [];
				const sortedMessages = groupMsgs.sort(
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
				);
				if (!originalMessage) continue;

				const hasMetadata =
					part.metadata &&
					(part.metadata.reasoning ||
						part.metadata.completion ||
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
