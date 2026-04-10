/**
 * Share Routes — Public conversation sharing (no auth required)
 *
 * Phase 1: Public read-only access to shared conversations
 * Phase 2: JWT token validation for private shares
 */
import express from "express";
import { pool } from "../config/database.js";

const router = express.Router();

/**
 * GET /api/share/:conversationId
 *
 * Returns conversation title + messages for read-only sharing.
 * No auth middleware — public access.
 *
 * Phase 2 will add optional ?token= for private shares.
 */
router.get("/:conversationId", async (req, res) => {
	try {
		const { conversationId } = req.params;

		if (!conversationId) {
			return res.status(400).json({ error: "conversationId is required" });
		}

		// Fetch conversation metadata
		const conversationResult = await pool.query(
			"SELECT id, title, created_at FROM conversations WHERE id = $1",
			[conversationId],
		);

		if (conversationResult.rows.length === 0) {
			return res.status(404).json({ error: "Conversation not found" });
		}

		// Fetch messages ordered chronologically
		const messagesResult = await pool.query(
			`SELECT id, role, message, metadata, response_group_id, created_at
			 FROM messages
			 WHERE conversation_id = $1
			 ORDER BY created_at ASC, id ASC`,
			[conversationId],
		);

		return res.json({
			conversation: conversationResult.rows[0],
			messages: messagesResult.rows,
		});
	} catch (error) {
		console.error("[share] Error fetching shared conversation:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
