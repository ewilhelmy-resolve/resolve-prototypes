import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Generated } from "kysely";
import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationHistoryTable {
	id: Generated<number>;
	migration_name: string;
	executed_at: Generated<string>;
}

interface MigrationDB {
	migration_history: MigrationHistoryTable;
}

export class DatabaseMigrator {
	private db: Kysely<MigrationDB>;
	private migrationsDir: string;

	constructor(db: Kysely<MigrationDB>) {
		this.db = db;
		this.migrationsDir = join(__dirname, "migrations");
	}

	async initialize(): Promise<void> {
		await this.db.schema
			.createTable("migration_history")
			.ifNotExists()
			.addColumn("id", "serial", (col) => col.primaryKey())
			.addColumn("migration_name", "text", (col) => col.unique().notNull())
			.addColumn("executed_at", sql`TIMESTAMP WITH TIME ZONE`, (col) =>
				col.defaultTo(sql`NOW()`),
			)
			.execute();
	}

	async getExecutedMigrations(): Promise<string[]> {
		const result = await this.db
			.selectFrom("migration_history")
			.select("migration_name")
			.orderBy("id")
			.execute();
		return result.map((row) => row.migration_name);
	}

	async getPendingMigrations(): Promise<string[]> {
		const allMigrations = readdirSync(this.migrationsDir)
			.filter((file) => file.endsWith(".sql"))
			.sort();

		const executedMigrations = await this.getExecutedMigrations();

		return allMigrations.filter(
			(migration) => !executedMigrations.includes(migration),
		);
	}

	async runMigration(migrationFile: string): Promise<void> {
		const migrationPath = join(this.migrationsDir, migrationFile);
		const migrationSql = readFileSync(migrationPath, "utf8");

		await this.db.transaction().execute(async (trx) => {
			await sql.raw(migrationSql).execute(trx);

			await trx
				.insertInto("migration_history")
				.values({ migration_name: migrationFile })
				.execute();
		});

		console.log(`Executed migration: ${migrationFile}`);
	}

	async runPendingMigrations(): Promise<void> {
		await this.initialize();

		const pendingMigrations = await this.getPendingMigrations();

		if (pendingMigrations.length === 0) {
			console.log("No pending migrations");
			return;
		}

		console.log(`Running ${pendingMigrations.length} pending migrations...`);

		for (const migration of pendingMigrations) {
			await this.runMigration(migration);
		}

		console.log("All migrations completed successfully");
	}
}

// CLI script to run migrations
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
	async function runMigrations() {
		const databaseUrl = process.env.DATABASE_URL;

		if (!databaseUrl) {
			console.error("DATABASE_URL environment variable is required");
			process.exit(1);
		}

		const db = new Kysely<MigrationDB>({
			dialect: new PostgresDialect({
				pool: new Pool({ connectionString: databaseUrl }),
			}),
		});

		try {
			const migrator = new DatabaseMigrator(db);
			await migrator.runPendingMigrations();
		} catch (error) {
			console.error("Migration failed:", error);
			process.exit(1);
		} finally {
			await db.destroy();
		}
	}

	runMigrations();
}
