import { pool } from "../config/database.js";
import { queueLogger } from "../config/logger.js";
import type { SSEEvent } from "./sse.js";
import { getSSEService } from "./sse.js";

/**
 * Send an SSE event to the conversation owner + all participants.
 * Looks up participants from the conversation_participants table.
 * No-op extra query for conversations without participants (returns 0 rows, PK-indexed).
 */
export async function sendToConversationParticipants(
	conversationId: string,
	ownerId: string,
	organizationId: string,
	event: SSEEvent,
): Promise<void> {
	const sseService = getSSEService();

	// Always send to owner
	sseService.sendToUser(ownerId, organizationId, event);

	// Also send to participants (deduplicate with owner)
	try {
		const participants = await pool.query(
			"SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2 AND organization_id = $3",
			[conversationId, ownerId, organizationId],
		);
		for (const p of participants.rows) {
			sseService.sendToUser(p.user_id, organizationId, event);
		}
	} catch (err) {
		// Don't break message processing if participant lookup fails
		queueLogger.warn(
			{ error: err instanceof Error ? err.message : String(err) },
			"Failed to send SSE to participants",
		);
	}
}
