import cors from "cors";
import express from "express";
import { logger } from "./config/logger.js";
import { closeValkeyConnection } from "./config/valkey.js";
import { authenticateUser } from "./middleware/auth.js";
import {
	addUserContextToLogs,
	errorLoggingMiddleware,
	healthCheckLoggingMiddleware,
	logApiOperation,
	requestLoggingMiddleware,
} from "./middleware/logging.js";
import authRoutes from "./routes/auth.js";
import clusterRoutes from "./routes/clusters.js";
import conversationRoutes from "./routes/conversations.js";
import credentialDelegationRoutes from "./routes/credentialDelegations.js";
import dataSourceRoutes from "./routes/dataSources.js";
// IMPORTANT: docs.ts must be imported AFTER all routes so OpenAPI spec includes all paths
import docsRoutes from "./routes/docs.js";
import featureFlagRoutes from "./routes/featureFlags.js";
import filesRoutes from "./routes/files.js";
import iframeRoutes from "./routes/iframe.routes.js";
import invitationRoutes from "./routes/invitations.js";
import memberRoutes from "./routes/members.js";
import mlModelRoutes from "./routes/mlModels.js";
import organizationRoutes from "./routes/organizations.js";
import sseRoutes from "./routes/sse.js";
import ticketRoutes from "./routes/tickets.js";
import workflowRoutes from "./routes/workflows.js";
import { getRabbitMQService } from "./services/rabbitmq.js";
import { destroySessionStore } from "./services/sessionStore.js";
import { getSSEService } from "./services/sse.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Logging middleware (must be first)
app.use(healthCheckLoggingMiddleware);
app.use(requestLoggingMiddleware);

// CORS origins - only allow localhost in development
const corsOrigins = [process.env.CLIENT_URL || "http://localhost:5173"];
if (process.env.NODE_ENV !== "production") {
	corsOrigins.push("http://localhost:5174"); // iframe demo app (dev only)
}

// Basic middleware
app.use(
	cors({
		origin: corsOrigins,
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
	}),
);
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
	const rabbitmqService = getRabbitMQService();
	const rabbitMQHealth = rabbitmqService.getHealthStatus();

	const isHealthy = rabbitMQHealth.status === "connected";
	const health = {
		status: isHealthy ? "ok" : "degraded",
		timestamp: new Date().toISOString(),
		services: {
			api: "ok",
			rabbitmq: {
				status: rabbitMQHealth.status,
				lastConnectedAt: rabbitMQHealth.lastConnectedAt,
				reconnectAttempts: rabbitMQHealth.reconnectAttempts,
				consecutiveFailures: rabbitMQHealth.consecutiveFailures,
				message: rabbitMQHealth.message,
			},
		},
	};

	const statusCode = isHealthy ? 200 : 503;
	res.status(statusCode).json(health);
});

// Webhook routes (no auth required)

// API Documentation (no auth required)
app.use("/api-docs", docsRoutes);

// Authentication routes (no auth required)
app.use("/auth", authRoutes);

// Iframe routes (no auth required - public access)
app.use("/api/iframe", iframeRoutes);

// Invitation routes (mixed auth - some public, some protected)
app.use("/api/invitations", invitationRoutes);

// Credential delegation routes (mixed auth - some public, some protected)
app.use("/api/credential-delegations", credentialDelegationRoutes);

// Test SSE endpoint (no auth required)
app.get("/test-sse", (req, res) => {
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
		console.log("Test SSE client disconnected");
	});
});

// Protected routes (require authentication)
// IMPORTANT: Register /api/organizations/members BEFORE /api/organizations to avoid route conflicts
app.use(
	"/api/organizations/members",
	authenticateUser,
	addUserContextToLogs,
	memberRoutes,
);
app.use(
	"/api/organizations",
	authenticateUser,
	addUserContextToLogs,
	organizationRoutes,
);
app.use("/api/clusters", authenticateUser, addUserContextToLogs, clusterRoutes);
app.use(
	"/api/ml-models",
	authenticateUser,
	addUserContextToLogs,
	mlModelRoutes,
);
app.use("/api/tickets", authenticateUser, addUserContextToLogs, ticketRoutes);
app.use(
	"/api/conversations",
	authenticateUser,
	addUserContextToLogs,
	conversationRoutes,
);
app.use(
	"/api/data-sources",
	authenticateUser,
	addUserContextToLogs,
	dataSourceRoutes,
);
app.use("/api/files", authenticateUser, addUserContextToLogs, filesRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/sse", authenticateUser, addUserContextToLogs, sseRoutes);
app.use(
	"/api/feature-flags",
	authenticateUser,
	addUserContextToLogs,
	featureFlagRoutes,
);

// Test organization context
app.get(
	"/api/test-org-context",
	authenticateUser,
	addUserContextToLogs,
	logApiOperation("test-org-context"),
	async (req: any, res) => {
		try {
			const { withOrgContext } = await import("./config/database.js");

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
			res.status(500).json({ error: "Failed to test organization context" });
		}
	},
);

// Error handling middleware (must be last)
app.use(errorLoggingMiddleware);

app.listen(PORT, async () => {
	logger.info(
		{
			port: PORT,
			environment: process.env.NODE_ENV || "development",
			endpoints: {
				health: `http://localhost:${PORT}/health`,
				auth: `http://localhost:${PORT}/auth`,
				profile: `http://localhost:${PORT}/auth/profile`,
				conversations: `http://localhost:${PORT}/api/conversations`,
				conversationMessages: `http://localhost:${PORT}/api/conversations/:id/messages`,
				messages: `http://localhost:${PORT}/api/messages (convenience method)`,
				files: `http://localhost:${PORT}/api/files`,
				invitations: `http://localhost:${PORT}/api/invitations`,
				members: `http://localhost:${PORT}/api/organizations/members`,
				organizations: `http://localhost:${PORT}/api/organizations`,
				sse: `http://localhost:${PORT}/api/sse/events`,
			},
		},
		"Rita API Server started successfully",
	);

	// Initialize services
	try {
		// Initialize SSE service
		getSSEService();
		logger.info("SSE service initialized successfully");
	} catch (error) {
		logger.fatal({ error }, "Failed to initialize SSE service");
		process.exit(1);
	}

	// Initialize RabbitMQ with automatic retry on failure
	const rabbitmqService = getRabbitMQService();
	try {
		await rabbitmqService.connect();
		await rabbitmqService.startConsumer();
		logger.info("RabbitMQ consumer initialized successfully");
	} catch (error) {
		// Don't crash the server - automatic reconnection will handle this
		logger.warn(
			{
				error: (error as Error).message,
				errorCode: (error as any).code,
			},
			"RabbitMQ initial connection failed - will retry automatically in background",
		);

		// Start reconnection in background
		rabbitmqService["reconnect"]();
	}
});

// Graceful shutdown
process.on("SIGINT", async () => {
	logger.info("Received SIGINT, shutting down gracefully...");

	try {
		// Shutdown SSE service first
		const sseService = getSSEService();
		sseService.shutdown();
		logger.info("SSE service shutdown complete");
	} catch (error) {
		logger.error({ error }, "Error during SSE shutdown");
	}

	try {
		// Then shutdown RabbitMQ
		const rabbitmqService = getRabbitMQService();
		await rabbitmqService.close();
		logger.info("RabbitMQ connection closed");
	} catch (error) {
		logger.error({ error }, "Error during RabbitMQ shutdown");
	}

	try {
		// Cleanup session store
		destroySessionStore();
		logger.info("Session store cleaned up");
	} catch (error) {
		logger.error({ error }, "Error during session store cleanup");
	}

	try {
		// Close Valkey connection
		await closeValkeyConnection();
		logger.info("Valkey connection closed");
	} catch (error) {
		logger.error({ error }, "Error during Valkey shutdown");
	}

	logger.info("Server shutdown complete");
	process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
	logger.fatal(
		{
			error: {
				name: error.name,
				message: error.message,
				stack: error.stack,
			},
		},
		"Uncaught exception occurred",
	);
	process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
	logger.fatal(
		{
			reason:
				reason instanceof Error
					? {
							name: reason.name,
							message: reason.message,
							stack: reason.stack,
						}
					: reason,
			promise: promise,
		},
		"Unhandled promise rejection occurred",
	);
	process.exit(1);
});
