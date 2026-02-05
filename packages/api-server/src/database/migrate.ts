import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import type { Pool as PoolType } from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseMigrator {
  private pool: PoolType;
  private migrationsDir: string;

  constructor(pool: PoolType) {
    this.pool = pool;
    this.migrationsDir = join(__dirname, 'migrations');
  }

  async initialize(): Promise<void> {
    // Create migrations tracking table if it doesn't exist
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  }

  async getExecutedMigrations(): Promise<string[]> {
    const result = await this.pool.query(
      'SELECT migration_name FROM migration_history ORDER BY id'
    );
    return result.rows.map((row: any) => row.migration_name);
  }

  async getPendingMigrations(): Promise<string[]> {
    const allMigrations = readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const executedMigrations = await this.getExecutedMigrations();

    return allMigrations.filter(migration =>
      !executedMigrations.includes(migration)
    );
  }

  async runMigration(migrationFile: string): Promise<void> {
    const migrationPath = join(this.migrationsDir, migrationFile);
    const sql = readFileSync(migrationPath, 'utf8');

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Execute the migration SQL
      await client.query(sql);

      // Record the migration as executed
      await client.query(
        'INSERT INTO migration_history (migration_name) VALUES ($1)',
        [migrationFile]
      );

      await client.query('COMMIT');
      console.log(`✅ Executed migration: ${migrationFile}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Failed to execute migration: ${migrationFile}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runPendingMigrations(): Promise<void> {
    await this.initialize();

    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`🔄 Running ${pendingMigrations.length} pending migrations...`);

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }

    console.log('✅ All migrations completed successfully');
  }
}

// CLI script to run migrations
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  async function runMigrations() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      console.error('❌ DATABASE_URL environment variable is required');
      process.exit(1);
    }

    const pool = new Pool({
      connectionString: databaseUrl,
    });

    try {
      const migrator = new DatabaseMigrator(pool);
      await migrator.runPendingMigrations();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  }

  runMigrations();
}