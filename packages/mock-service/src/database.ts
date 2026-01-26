import pg from "pg";
import pino from "pino";

const { Pool } = pg;

const logger = pino({
	name: "mock-service-db",
	level: process.env.LOG_LEVEL || "info",
});

// Use same DATABASE_URL as api-server, or construct from individual vars
const databaseUrl =
	process.env.DATABASE_URL ||
	`postgresql://${process.env.PGUSER || "rita"}:${process.env.PGPASSWORD || "rita"}@${process.env.PGHOST || "localhost"}:${process.env.PGPORT || "5432"}/${process.env.PGDATABASE || "onboarding"}`;

const poolConfig = {
	connectionString: databaseUrl,
	max: 5, // Smaller pool for mock service
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000,
};

let pool: pg.Pool | null = null;

export const getPool = (): pg.Pool => {
	if (!pool) {
		pool = new Pool(poolConfig);

		pool.on("connect", () => {
			logger.debug("Mock service connected to database");
		});

		pool.on("error", (err) => {
			logger.error({ err }, "Database pool error");
		});

		logger.info(
			{ host: process.env.PGHOST || "localhost" },
			"Database pool initialized",
		);
	}
	return pool;
};

/**
 * Execute a query without RLS context (simulating Workflow Platform direct writes)
 */
export const query = async <T = any>(
	text: string,
	params?: any[],
): Promise<pg.QueryResult<T>> => {
	const pool = getPool();
	const start = Date.now();

	try {
		const result = await pool.query<T>(text, params);
		const duration = Date.now() - start;

		logger.debug(
			{
				query: text.substring(0, 100),
				duration,
				rowCount: result.rowCount,
			},
			"Query executed",
		);

		return result;
	} catch (error) {
		logger.error({ error, query: text.substring(0, 100) }, "Query failed");
		throw error;
	}
};

/**
 * Execute multiple queries in a transaction
 */
export const withTransaction = async <T>(
	callback: (client: pg.PoolClient) => Promise<T>,
): Promise<T> => {
	const pool = getPool();
	const client = await pool.connect();

	try {
		await client.query("BEGIN");
		const result = await callback(client);
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

export const closePool = async (): Promise<void> => {
	if (pool) {
		await pool.end();
		pool = null;
		logger.info("Database pool closed");
	}
};
