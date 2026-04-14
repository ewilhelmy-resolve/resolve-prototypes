/**
 * Share Routes — Snapshot-based conversation sharing
 *
 * When a user clicks Share, Rita creates an immutable snapshot of the
 * conversation's messages at that moment. The snapshot lives in
 * shared_conversations with an opaque share_id. Public readers fetch by
 * share_id; the live conversations/messages tables are never touched by
 * the public read path.
 *
 * Endpoints:
 * - GET  /api/share/:shareId                                 (public, no auth)
 * - POST /api/conversations/:conversationId/share/enable     (authenticated)
 * - POST /api/conversations/:conversationId/share/disable    (authenticated)
 *
 * The public GET has no access-control flag to check — if the snapshot row
 * exists, it's shared; otherwise 404. Revoking = DELETE row.
 */
import crypto from "node:crypto";
import express from "express";
import { pool } from "../config/database.js";
import { assertUuid } from "../config/validateUuid.js";
import { getValkeyClient } from "../config/valkey.js";
import { authenticateUser } from "../middleware/auth.js";
import { getIframeService } from "../services/IframeService.js";
import type { AuthenticatedRequest } from "../types/express.js";
import { checkRateLimit } from "../utils/rateLimit.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// =============================================================================
// Public router — mounted at /api/share (no auth middleware)
// =============================================================================
export const publicShareRouter = express.Router();

/**
 * GET /api/share/:shareId
 *
 * Fetch the shared conversation snapshot. Returns 404 for both
 * "never shared" and "un-shared" cases — no existence leak.
 */
publicShareRouter.get("/:shareId", async (req, res) => {
	try {
		const clientIp = req.ip || "unknown";
		if (!checkRateLimit(`share-get:${clientIp}`, 60, 60_000)) {
			return res.status(429).json({ error: "Too many requests" });
		}

		const { shareId } = req.params;
		if (!shareId || typeof shareId !== "string" || shareId.length > 128) {
			return res.status(400).json({ error: "Invalid shareId" });
		}

		const result = await pool.query(
			`SELECT share_id, conversation_id, title, messages, created_at
			 FROM shared_conversations
			 WHERE share_id = $1`,
			[shareId],
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Shared conversation not found" });
		}

		const row = result.rows[0];
		return res.json({
			conversation: {
				id: row.conversation_id,
				title: row.title,
				created_at: row.created_at,
			},
			messages: row.messages,
		});
	} catch (error) {
		console.error("[share] Error fetching shared conversation:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
});

// =============================================================================
// Authenticated router — mounted at /api/conversations
// Enable/disable require Keycloak auth + conversation ownership.
// =============================================================================
export const authenticatedShareRouter = express.Router({ mergeParams: true });

/**
 * Extract + validate auth context and conversationId UUID.
 */
function validateAuthRequest(
	req: express.Request,
	res: express.Response,
): { userId: string; organizationId: string; conversationId: string } | null {
	const { conversationId } = req.params;
	try {
		assertUuid(conversationId, "conversationId");
	} catch {
		res.status(400).json({ error: "Invalid conversationId format" });
		return null;
	}
	const authReq = req as AuthenticatedRequest;
	const userId = authReq.user?.id;
	const organizationId = authReq.user?.activeOrganizationId;
	if (!userId || !organizationId) {
		res.status(401).json({ error: "Unauthorized" });
		return null;
	}
	return { userId, organizationId, conversationId };
}

/**
 * POST /api/conversations/:conversationId/share/enable
 *
 * Snapshot the conversation and store it in shared_conversations.
 * Returns { shareUrl, shareId }. Overwrites any existing snapshot for
 * this conversation (one snapshot per conversation).
 */
authenticatedShareRouter.post(
	"/:conversationId/share/enable",
	authenticateUser,
	async (req, res) => {
		try {
			const auth = validateAuthRequest(req, res);
			if (!auth) return;

			// Verify ownership and fetch title in one query
			const conversationResult = await pool.query(
				`SELECT id, title FROM conversations
				 WHERE id = $1 AND organization_id = $2 AND user_id = $3`,
				[auth.conversationId, auth.organizationId, auth.userId],
			);
			if (conversationResult.rows.length === 0) {
				return res.status(404).json({ error: "Conversation not found" });
			}
			const { title } = conversationResult.rows[0];

			const shareId = await writeSnapshot(auth.conversationId, title);

			return res.json({
				shareUrl: `${CLIENT_URL}/jarvis/${shareId}`,
				shareId,
			});
		} catch (error) {
			console.error("[share] Error enabling share:", error);
			return res.status(500).json({ error: "Internal server error" });
		}
	},
);

/**
 * POST /api/conversations/:conversationId/share/disable
 *
 * Delete the snapshot. The share URL returns 404 immediately after.
 */
authenticatedShareRouter.post(
	"/:conversationId/share/disable",
	authenticateUser,
	async (req, res) => {
		try {
			const auth = validateAuthRequest(req, res);
			if (!auth) return;

			// Verify ownership before delete
			const ownership = await pool.query(
				`SELECT id FROM conversations
				 WHERE id = $1 AND organization_id = $2 AND user_id = $3`,
				[auth.conversationId, auth.organizationId, auth.userId],
			);
			if (ownership.rows.length === 0) {
				return res.status(404).json({ error: "Conversation not found" });
			}

			await pool.query(
				`DELETE FROM shared_conversations WHERE conversation_id = $1`,
				[auth.conversationId],
			);

			return res.json({ success: true });
		} catch (error) {
			console.error("[share] Error disabling share:", error);
			return res.status(500).json({ error: "Internal server error" });
		}
	},
);

// =============================================================================
// Platform router — mounted at /api/iframe (auth via Valkey sessionKey)
//
// Actions Platform owns the Share UI for iframe-embedded conversations.
// Platform can't use Keycloak auth (iframe users may not exist as Keycloak
// users), so it authenticates with the same sessionKey already used by
// /api/iframe/validate-instantiation and /api/iframe/execute. The sessionKey
// identifies the Valkey session, which stores the conversationId — so Platform
// can only share the conversation currently embedded in that session.
// =============================================================================
export const iframeShareRouter = express.Router();

async function resolveSessionConversation(
	sessionKey: unknown,
): Promise<
	| { ok: true; conversationId: string }
	| { ok: false; status: number; error: string }
> {
	if (!sessionKey || typeof sessionKey !== "string") {
		return { ok: false, status: 400, error: "sessionKey is required" };
	}
	const config = await getIframeService().fetchValkeyPayload(sessionKey);
	if (!config) {
		return { ok: false, status: 404, error: "Session not found" };
	}
	let conversationId = config.conversationId;
	// Dev mock payloads don't include conversationId — read from actual Valkey
	// where storeConversationIdInValkey wrote it after session init
	if (!conversationId) {
		try {
			const client = getValkeyClient();
			const rawData = await client.hget(`rita:session:${sessionKey}`, "data");
			if (rawData) {
				const data = JSON.parse(rawData);
				conversationId = data.conversationId;
			}
		} catch {
			// Fall through to error below
		}
	}
	if (!conversationId) {
		return { ok: false, status: 400, error: "Session has no conversation yet" };
	}
	try {
		assertUuid(conversationId, "conversationId");
	} catch {
		return {
			ok: false,
			status: 500,
			error: "Session has invalid conversationId",
		};
	}
	return { ok: true, conversationId };
}

/**
 * Snapshot messages for a conversation and upsert into shared_conversations.
 * Caller is responsible for verifying access control.
 *
 * Two queries: SELECT messages + UPSERT. Title is passed in to avoid a
 * duplicate SELECT on conversations (authenticated caller already fetched
 * it for the ownership check).
 *
 * Returns the generated share_id (random 32-char hex).
 */
async function writeSnapshot(
	conversationId: string,
	title: string | null,
): Promise<string> {
	const messagesResult = await pool.query(
		`SELECT id, role, message, metadata, response_group_id, created_at
		 FROM messages
		 WHERE conversation_id = $1
		 ORDER BY created_at ASC, id ASC`,
		[conversationId],
	);

	const shareId = crypto.randomBytes(16).toString("hex");
	await pool.query(
		`INSERT INTO shared_conversations
			(share_id, conversation_id, title, messages)
		 VALUES ($1, $2, $3, $4::jsonb)
		 ON CONFLICT (conversation_id) DO UPDATE
			SET share_id = EXCLUDED.share_id,
				title = EXCLUDED.title,
				messages = EXCLUDED.messages,
				created_at = NOW()`,
		[shareId, conversationId, title, JSON.stringify(messagesResult.rows)],
	);
	return shareId;
}

/**
 * POST /api/iframe/share
 *
 * Create a snapshot for the conversation tied to a Valkey session.
 * Body: { sessionKey }
 * Returns: { shareUrl, shareId }
 */
iframeShareRouter.post("/share", async (req, res) => {
	try {
		const resolved = await resolveSessionConversation(req.body?.sessionKey);
		if (!resolved.ok) {
			return res.status(resolved.status).json({ error: resolved.error });
		}

		// Fetch title (no ownership check — Valkey session is the auth)
		const conversationResult = await pool.query(
			`SELECT title FROM conversations WHERE id = $1`,
			[resolved.conversationId],
		);
		if (conversationResult.rows.length === 0) {
			return res.status(404).json({ error: "Conversation not found" });
		}
		const { title } = conversationResult.rows[0];

		const shareId = await writeSnapshot(resolved.conversationId, title);

		return res.json({
			shareUrl: `${CLIENT_URL}/jarvis/${shareId}`,
			shareId,
		});
	} catch (error) {
		console.error("[share] Error generating iframe share link:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
});

/**
 * POST /api/iframe/share/disable
 *
 * Delete the snapshot for the conversation tied to a Valkey session.
 * Body: { sessionKey }
 */
iframeShareRouter.post("/share/disable", async (req, res) => {
	try {
		const resolved = await resolveSessionConversation(req.body?.sessionKey);
		if (!resolved.ok) {
			return res.status(resolved.status).json({ error: resolved.error });
		}

		await pool.query(
			`DELETE FROM shared_conversations WHERE conversation_id = $1`,
			[resolved.conversationId],
		);
		return res.json({ success: true });
	} catch (error) {
		console.error("[share] Error disabling iframe share:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
});

// Backward-compat default export — public router only.
// Mount in index.ts:
//   app.use("/api/share", shareRoutes)
//   app.use("/api/conversations", authenticatedShareRouter)
//   app.use("/api/iframe", iframeShareRouter)
export default publicShareRouter;
