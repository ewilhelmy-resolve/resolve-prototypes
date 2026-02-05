import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { DB } from "../types/database.js";
import { dbLogger } from "./logger.js";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is required");
}

const dialect = new PostgresDialect({
	pool: new Pool({
		connectionString: databaseUrl,
		max: 20,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 2000,
	}),
});

export const db = new Kysely<DB>({
	dialect,
	log: (event) => {
		if (event.level === "query") {
			dbLogger.debug(
				{
					sql: event.query.sql,
					duration: event.queryDurationMillis,
				},
				"Kysely query executed",
			);
		} else if (event.level === "error") {
			dbLogger.error(
				{
					sql: event.query.sql,
					error: event.error,
				},
				"Kysely query error",
			);
		}
	},
});

dbLogger.info("Kysely database instance initialized");
