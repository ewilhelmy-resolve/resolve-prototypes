import express from "express";
import { logger } from "../config/logger.js";
import { authenticateUser } from "../middleware/auth.js";
import {
	addUserContextToLogs,
	logApiOperation,
} from "../middleware/logging.js";

const router = express.Router();

// SSE test endpoint (no auth)
router.get("/test-sse", (req, res) => {
	res.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
		"Access-Control-Allow-Origin":
			process.env.CLIENT_URL || "http://localhost:5173",
		"Access-Control-Allow-Credentials": "true",
		"Access-Control-Allow-Headers": "Cache-Control",
	});

	let counter = 0;

	const sendEvent = () => {
		counter++;
		const data = JSON.stringify({
			type: "test_message",
			data: {
				message: `Test message ${counter}`,
				timestamp: new Date().toISOString(),
				counter: counter,
			},
		});

		res.write(`data: ${data}\n\n`);
	};

	// Send initial message
	sendEvent();

	// Send a message every 3 seconds
	const interval = setInterval(sendEvent, 3000);

	// Clean up on client disconnect
	req.on("close", () => {
		clearInterval(interval);
		logger.info("Test SSE client disconnected");
	});
});

// Organization context test endpoint (auth required)
router.get(
	"/api/test-org-context",
	authenticateUser,
	addUserContextToLogs,
	logApiOperation("test-org-context"),
	async (req: any, res) => {
		try {
			const { withOrgContext } = await import("../config/database.js");

			req.log.debug("Testing organization context");

			const result = await withOrgContext(
				req.user.id,
				req.user.activeOrganizationId,
				async (client) => {
					// Test query that uses RLS policies
					const messages = await client.query("SELECT * FROM messages LIMIT 5");
					const orgs = await client.query("SELECT * FROM organizations");

					return {
						messagesCount: messages.rows.length,
						organizationsCount: orgs.rows.length,
					};
				},
			);

			req.log.info({ result }, "Organization context test successful");

			res.json({
				user: req.user,
				orgContext: result,
				message: "Organization context working",
			});
		} catch (error) {
			req.log.error({ error }, "Organization context test failed");
			res.status(500).json({
				error: "Failed to test organization context",
			});
		}
	},
);

export default router;
