import pg from "pg";

const { Pool } = pg;

import { dbLogger, logError, PerformanceTimer } from "./logger.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	dbLogger.fatal("DATABASE_URL environment variable is required");
	throw new Error("DATABASE_URL environment variable is required");
}

// Database pool configuration
const poolConfig = {
	connectionString: databaseUrl,
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

// Log pool events
pool.on("connect", (_client) => {
	dbLogger.debug("New client connected to database pool");
});

pool.on("error", (err) => {
	logError(dbLogger, err, { component: "database-pool" });
});

// Log successful initialization
dbLogger.info(
	{
		config: {
			maxConnections: poolConfig.max,
			idleTimeoutMillis: poolConfig.idleTimeoutMillis,
			connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
		},
	},
	"Database pool initialized",
);

// Safe query execution with organization context
export const withOrgContext = async <T>(
	userId: string,
	organizationId: string,
	callback: (client: any) => Promise<T>,
): Promise<T> => {
	const timer = new PerformanceTimer(dbLogger, "withOrgContext");
	const contextLogger = dbLogger.child({
		userId,
		organizationId,
		operation: "withOrgContext",
	});

	contextLogger.debug(
		"Starting database transaction with organization context",
	);

	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		// Set session variables for RLS policies (SET commands don't support parameters)
		await client.query(`SET LOCAL app.current_user_id = '${userId}'`);
		await client.query(
			`SET LOCAL app.current_organization_id = '${organizationId}'`,
		);

		contextLogger.debug("Session variables set for RLS policies");

		const result = await callback(client);

		await client.query("COMMIT");

		// const duration = timer.end({
		//   userId,
		//   organizationId,
		//   success: true
		// });

		contextLogger.info("Transaction completed successfully");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");

		timer.end({
			userId,
			organizationId,
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		});

		logError(
			contextLogger,
			error instanceof Error ? error : new Error(String(error)),
			{
				userId,
				organizationId,
				operation: "withOrgContext",
			},
		);

		throw error;
	} finally {
		// Critical: Reset session variables to prevent leakage
		try {
			await client.query("RESET app.current_user_id");
			await client.query("RESET app.current_organization_id");
			contextLogger.debug("Session variables reset");
		} catch (resetError) {
			logError(
				contextLogger,
				resetError instanceof Error
					? resetError
					: new Error(String(resetError)),
				{
					operation: "session-variable-reset",
				},
			);
		}

		client.release();
		contextLogger.debug("Database client released");
	}
};
