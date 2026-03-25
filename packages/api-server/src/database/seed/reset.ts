/**
 * Database reset script for e2e validation.
 *
 * Drops all tables (preserving the database), re-runs all migrations,
 * executes the deterministic seed, flushes Valkey sessions, and purges
 * RabbitMQ queues.
 *
 * Usage: pnpm db:reset
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ──────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error("❌ DATABASE_URL environment variable is required");
	process.exit(1);
}

const VALKEY_URL =
	process.env.VALKEY_URL || process.env.REDIS_URL || "redis://localhost:6379";
const RABBITMQ_URL =
	process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
	const startTime = Date.now();
	console.log("🔄 Resetting database to deterministic seed state...\n");

	// Step 1: Drop all tables and recreate schema
	await dropAllTables();

	// Step 2: Run all migrations
	await runMigrations();

	// Step 3: Execute seed SQL
	await executeSeed();

	// Step 4: Flush Valkey (sessions)
	await flushValkey();

	// Step 5: Purge RabbitMQ queues
	await purgeRabbitMQ();

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(`\n✅ Reset complete in ${elapsed}s`);
	console.log("   DB: clean schema + deterministic seed");
	console.log("   Valkey: flushed");
	console.log("   RabbitMQ: queues purged");
}

// ── Step 1: Drop all tables ────────────────────────────────────────────────────

async function dropAllTables() {
	const client = new Client({ connectionString: DATABASE_URL });
	await client.connect();

	try {
		console.log("1/5 Dropping all tables...");

		// Drop all tables in public schema (CASCADE handles FK dependencies)
		const tablesResult = await client.query(`
			SELECT tablename FROM pg_tables
			WHERE schemaname = 'public'
		`);

		if (tablesResult.rows.length === 0) {
			console.log("     No tables to drop");
			return;
		}

		const tableNames = tablesResult.rows
			.map((r) => `"${r.tablename}"`)
			.join(", ");
		await client.query(`DROP TABLE IF EXISTS ${tableNames} CASCADE`);
		console.log(`     Dropped ${tablesResult.rows.length} tables`);

		// Drop user-defined functions (skip extension-owned ones like pgvector)
		await client.query(`
			DO $$ DECLARE
				r RECORD;
			BEGIN
				FOR r IN (
					SELECT p.proname AS routine_name, p.oid
					FROM pg_proc p
					JOIN pg_namespace n ON p.pronamespace = n.oid
					WHERE n.nspname = 'public'
					AND NOT EXISTS (
						SELECT 1 FROM pg_depend d
						JOIN pg_extension e ON d.refobjid = e.oid
						WHERE d.objid = p.oid AND d.deptype = 'e'
					)
				)
				LOOP
					EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.routine_name) || ' CASCADE';
				END LOOP;
			END $$;
		`);
	} finally {
		await client.end();
	}
}

// ── Step 2: Run migrations ─────────────────────────────────────────────────────

async function runMigrations() {
	console.log("2/5 Running migrations...");

	// Import and use the existing migrator
	const { Kysely, PostgresDialect } = await import("kysely");
	const pgModule = await import("pg");
	const { DatabaseMigrator } = await import("../migrate.js");

	const db = new Kysely<any>({
		dialect: new PostgresDialect({
			pool: new pgModule.default.Pool({ connectionString: DATABASE_URL }),
		}),
	});

	try {
		const migrator = new DatabaseMigrator(db as any);
		await migrator.runPendingMigrations();
	} finally {
		await db.destroy();
	}
}

// ── Step 3: Execute seed SQL ───────────────────────────────────────────────────

async function executeSeed() {
	console.log("3/5 Seeding deterministic test data...");

	const seedPath = join(__dirname, "base.sql");
	const seedSql = readFileSync(seedPath, "utf8");

	const client = new Client({ connectionString: DATABASE_URL });
	await client.connect();

	try {
		await client.query(seedSql);
		console.log("     Seed data inserted");
	} finally {
		await client.end();
	}
}

// ── Step 4: Flush Valkey ───────────────────────────────────────────────────────

async function flushValkey() {
	console.log("4/5 Flushing Valkey sessions...");

	try {
		// Use a raw TCP connection to send FLUSHALL — avoids adding ioredis dependency
		const url = new URL(VALKEY_URL);
		const host = url.hostname || "localhost";
		const port = parseInt(url.port || "6379", 10);

		const net = await import("node:net");
		await new Promise<void>((resolve, reject) => {
			const socket = net.createConnection({ host, port }, () => {
				socket.write("FLUSHALL\r\n");
			});

			socket.on("data", (data) => {
				const response = data.toString().trim();
				if (response === "+OK") {
					console.log("     Valkey flushed");
					socket.end();
					resolve();
				} else {
					socket.end();
					reject(new Error(`Unexpected Valkey response: ${response}`));
				}
			});

			socket.on("error", (err) => {
				console.warn(
					`     ⚠️  Valkey flush failed (is it running?): ${err.message}`,
				);
				resolve(); // Non-fatal — continue reset
			});

			socket.setTimeout(3000, () => {
				socket.end();
				console.warn("     ⚠️  Valkey flush timed out");
				resolve(); // Non-fatal
			});
		});
	} catch (err) {
		console.warn(`     ⚠️  Valkey flush skipped: ${(err as Error).message}`);
	}
}

// ── Step 5: Purge RabbitMQ ─────────────────────────────────────────────────────

async function purgeRabbitMQ() {
	console.log("5/5 Purging RabbitMQ queues...");

	try {
		// Use RabbitMQ Management HTTP API to purge all queues
		const url = new URL(RABBITMQ_URL);
		const host = url.hostname || "localhost";
		const user = url.username || "guest";
		const pass = url.password || "guest";
		const managementUrl = `http://${host}:15672`;
		const authHeader = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

		// List all queues
		const listRes = await fetch(`${managementUrl}/api/queues`, {
			headers: { Authorization: authHeader },
		});

		if (!listRes.ok) {
			console.warn(
				`     ⚠️  RabbitMQ management API returned ${listRes.status}`,
			);
			return;
		}

		const queues = (await listRes.json()) as Array<{
			name: string;
			vhost: string;
		}>;

		if (queues.length === 0) {
			console.log("     No queues to purge");
			return;
		}

		// Purge each queue
		let purged = 0;
		for (const queue of queues) {
			const vhost = encodeURIComponent(queue.vhost);
			const name = encodeURIComponent(queue.name);
			const purgeRes = await fetch(
				`${managementUrl}/api/queues/${vhost}/${name}/contents`,
				{
					method: "DELETE",
					headers: { Authorization: authHeader },
				},
			);
			if (purgeRes.ok || purgeRes.status === 204) {
				purged++;
			}
		}

		console.log(`     Purged ${purged} queue(s)`);
	} catch (err) {
		console.warn(`     ⚠️  RabbitMQ purge skipped: ${(err as Error).message}`);
	}
}

// ── Run ────────────────────────────────────────────────────────────────────────

main().catch((err) => {
	console.error("❌ Reset failed:", err);
	process.exit(1);
});
