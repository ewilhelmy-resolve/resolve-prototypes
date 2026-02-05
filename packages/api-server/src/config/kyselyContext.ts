import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import type { DB } from "../types/database.js";
import { dbLogger, logError, PerformanceTimer } from "./logger.js";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
	connectionString: databaseUrl,
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
});

export async function withKyselyOrgContext<T>(
	userId: string,
	organizationId: string,
	callback: (trx: Kysely<DB>) => Promise<T>,
): Promise<T> {
	const timer = new PerformanceTimer(dbLogger, "withKyselyOrgContext");
	const contextLogger = dbLogger.child({
		userId,
		organizationId,
		operation: "withKyselyOrgContext",
	});

	contextLogger.debug("Starting Kysely transaction with organization context");

	const client = await pool.connect();

	// Create a Kysely instance that uses this specific client
	const trxDb = new Kysely<DB>({
		dialect: new PostgresDialect({
			pool: {
				connect: async () => client,
			} as pg.Pool,
		}),
	});

	try {
		await sql`BEGIN`.execute(trxDb);

		// Set session variables for RLS policies
		await sql.raw(`SET LOCAL app.current_user_id = '${userId}'`).execute(trxDb);
		await sql
			.raw(`SET LOCAL app.current_organization_id = '${organizationId}'`)
			.execute(trxDb);

		contextLogger.debug("Session variables set for RLS policies");

		const result = await callback(trxDb);

		await sql`COMMIT`.execute(trxDb);

		contextLogger.info("Kysely transaction completed successfully");
		return result;
	} catch (error) {
		await sql`ROLLBACK`.execute(trxDb);

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
				operation: "withKyselyOrgContext",
			},
		);

		throw error;
	} finally {
		// Reset session variables to prevent leakage
		try {
			await sql`RESET app.current_user_id`.execute(trxDb);
			await sql`RESET app.current_organization_id`.execute(trxDb);
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
}
