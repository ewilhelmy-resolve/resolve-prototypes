import { pool } from "../config/database.js";
import {
	DEFAULT_DATA_SOURCES,
	isValidDataSourceType,
} from "../constants/dataSources.js";
import type {
	CreateDataSourceRequest,
	DataSourceConnection,
	IngestionRun,
	UpdateDataSourceRequest,
} from "../types/dataSource.js";

export class DataSourceService {
	/**
	 * Get all data sources for an organization
	 */
	async getDataSources(
		organizationId: string,
	): Promise<DataSourceConnection[]> {
		const result = await pool.query<DataSourceConnection>(
			`SELECT * FROM data_source_connections
       WHERE organization_id = $1
       ORDER BY created_at ASC`,
			[organizationId],
		);

		return result.rows;
	}

	/**
	 * Get a single data source by ID
	 */
	async getDataSource(
		id: string,
		organizationId: string,
	): Promise<DataSourceConnection | null> {
		const result = await pool.query<DataSourceConnection>(
			`SELECT * FROM data_source_connections
       WHERE id = $1 AND organization_id = $2`,
			[id, organizationId],
		);

		return result.rows[0] || null;
	}

	/**
	 * Get a data source by type (1:1 per org per type)
	 * Used for ServiceNow credential sync between KB and ITSM
	 */
	async getDataSourceByType(
		organizationId: string,
		type: string,
	): Promise<DataSourceConnection | null> {
		const result = await pool.query<DataSourceConnection>(
			`SELECT * FROM data_source_connections
       WHERE organization_id = $1 AND type = $2
       LIMIT 1`,
			[organizationId, type],
		);

		return result.rows[0] || null;
	}

	/**
	 * Create a new data source
	 */
	async createDataSource(
		organizationId: string,
		userId: string,
		data: CreateDataSourceRequest,
	): Promise<DataSourceConnection> {
		// Validate type
		if (!isValidDataSourceType(data.type)) {
			throw new Error(`Invalid data source type: ${data.type}`);
		}

		const result = await pool.query<DataSourceConnection>(
			`INSERT INTO data_source_connections (
        organization_id, type, name, description, settings,
        status, enabled, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, 'idle', false, $6, $6)
      RETURNING *`,
			[
				organizationId,
				data.type,
				data.name,
				data.description || null,
				JSON.stringify(data.settings || {}),
				userId,
			],
		);

		return result.rows[0];
	}

	/**
	 * Update an existing data source
	 */
	async updateDataSource(
		id: string,
		organizationId: string,
		userId: string,
		data: UpdateDataSourceRequest,
	): Promise<DataSourceConnection | null> {
		const updates: string[] = [];
		const values: any[] = [];
		let paramIndex = 1;

		if (data.name !== undefined) {
			updates.push(`name = $${paramIndex++}`);
			values.push(data.name);
		}

		if (data.description !== undefined) {
			updates.push(`description = $${paramIndex++}`);
			values.push(data.description);
		}

		if (data.settings !== undefined) {
			updates.push(`settings = $${paramIndex++}`);
			values.push(JSON.stringify(data.settings));
			// Clear error states when re-configuring credentials
			updates.push(`last_verification_error = NULL`);
			updates.push(`last_sync_status = NULL`);
			updates.push(`last_sync_error = NULL`);
		}

		if (data.enabled !== undefined) {
			updates.push(`enabled = $${paramIndex++}`);
			values.push(data.enabled);
		}

		if (updates.length === 0) {
			// No updates, just return current data
			return this.getDataSource(id, organizationId);
		}

		updates.push(`updated_by = $${paramIndex++}`);
		values.push(userId);

		updates.push(`updated_at = NOW()`);

		values.push(id, organizationId);

		const result = await pool.query<DataSourceConnection>(
			`UPDATE data_source_connections
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++}
       RETURNING *`,
			values,
		);

		return result.rows[0] || null;
	}

	/**
	 * Delete a data source
	 */
	async deleteDataSource(id: string, organizationId: string): Promise<boolean> {
		const result = await pool.query(
			`DELETE FROM data_source_connections
       WHERE id = $1 AND organization_id = $2`,
			[id, organizationId],
		);

		return (result.rowCount || 0) > 0;
	}

	/**
	 * Seed default data sources for an organization (idempotent)
	 */
	async seedDefaultDataSources(
		organizationId: string,
		userId: string,
	): Promise<{
		created: DataSourceConnection[];
		existing: string[];
	}> {
		const created: DataSourceConnection[] = [];
		const existing: string[] = [];

		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			for (const source of DEFAULT_DATA_SOURCES) {
				const result = await client.query<DataSourceConnection>(
					`INSERT INTO data_source_connections (
            organization_id, type, name, description,
            status, enabled, created_by, updated_by
          )
          VALUES ($1, $2, $3, $4, 'idle', false, $5, $5)
          ON CONFLICT (organization_id, type) DO NOTHING
          RETURNING *`,
					[
						organizationId,
						source.type,
						source.name,
						source.description,
						userId,
					],
				);

				if (result.rows.length > 0) {
					created.push(result.rows[0]);
				} else {
					existing.push(source.type);
				}
			}

			await client.query("COMMIT");

			return { created, existing };
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	/**
	 * Update data source status (used by RabbitMQ consumer)
	 */
	async updateDataSourceStatus(
		connectionId: string,
		organizationId: string,
		status: "idle" | "syncing" | "cancelled",
		lastSyncStatus?: "completed" | "failed" | null,
		updateLastSyncAt: boolean = false,
		requireSyncingStatus: boolean = false,
	): Promise<DataSourceConnection | null> {
		const updates = ["status = $1"];
		const values: any[] = [status];
		let paramIndex = 2;

		if (lastSyncStatus !== undefined) {
			updates.push(`last_sync_status = $${paramIndex++}`);
			values.push(lastSyncStatus);
		}

		if (updateLastSyncAt) {
			updates.push(`last_sync_at = NOW()`);
		}

		updates.push(`updated_at = NOW()`);

		values.push(connectionId, organizationId);

		// Add status check to prevent race condition: only update if status is 'syncing'
		// This prevents sync_completed messages from overwriting 'cancelled' status
		const whereClause = requireSyncingStatus
			? `WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++} AND status = 'syncing'`
			: `WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++}`;

		const result = await pool.query<DataSourceConnection>(
			`UPDATE data_source_connections
       SET ${updates.join(", ")}
       ${whereClause}
       RETURNING *`,
			values,
		);

		return result.rows[0] || null;
	}

	/**
	 * Check if verification should be triggered (throttle: 10 minutes)
	 */
	async shouldTriggerVerification(
		connectionId: string,
		organizationId: string,
	): Promise<boolean> {
		const result = await pool.query<{ last_verification_at: Date | null }>(
			`SELECT last_verification_at
       FROM data_source_connections
       WHERE id = $1 AND organization_id = $2`,
			[connectionId, organizationId],
		);

		if (!result.rows[0]) {
			return false; // Connection not found
		}

		const lastVerifiedAt = result.rows[0].last_verification_at;

		// If never verified, allow verification
		if (!lastVerifiedAt) {
			return true;
		}

		// Check if 10 minutes have passed
		const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
		return new Date(lastVerifiedAt) < tenMinutesAgo;
	}

	/**
	 * Update verification status (used by RabbitMQ consumer)
	 */
	async updateVerificationStatus(
		connectionId: string,
		organizationId: string,
		status: "success" | "failed",
		options?: Record<string, any>,
		error?: string,
	): Promise<DataSourceConnection | null> {
		const updates = ["status = $1", "last_verification_at = NOW()"];
		const values: any[] = ["idle"]; // Always return to idle after verification
		let paramIndex = 2;

		if (status === "success") {
			// On success: clear error, store options
			updates.push(`last_verification_error = NULL`);

			if (options) {
				updates.push(`latest_options = $${paramIndex++}`);
				values.push(JSON.stringify(options));
			}
		} else {
			// On failure: store error
			updates.push(`last_verification_error = $${paramIndex++}`);
			values.push(error || "Verification failed");
		}

		updates.push(`updated_at = NOW()`);

		values.push(connectionId, organizationId);

		const result = await pool.query<DataSourceConnection>(
			`UPDATE data_source_connections
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++}
       RETURNING *`,
			values,
		);

		return result.rows[0] || null;
	}

	/**
	 * Cancel an ongoing sync operation
	 * Sets status to 'cancelled' and marks last_sync_status as 'failed'
	 */
	async cancelSync(
		connectionId: string,
		organizationId: string,
	): Promise<DataSourceConnection | null> {
		const result = await pool.query<DataSourceConnection>(
			`UPDATE data_source_connections
       SET status = 'cancelled',
           last_sync_status = 'failed',
           last_sync_error = 'Sync cancelled by user',
           last_sync_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
			[connectionId, organizationId],
		);

		return result.rows[0] || null;
	}

	/**
	 * Cancel an ongoing ingestion run (ticket sync)
	 * Only cancels if status is 'running' or 'pending'
	 */
	async cancelIngestionRun(
		connectionId: string,
		organizationId: string,
	): Promise<IngestionRun | null> {
		const result = await pool.query<IngestionRun>(
			`UPDATE ingestion_runs
       SET status = 'cancelled',
           error_message = 'Cancelled by user',
           completed_at = NOW(),
           updated_at = NOW()
       WHERE data_source_connection_id = $1
         AND organization_id = $2
         AND status IN ('running', 'pending')
         AND id = (
           SELECT id FROM ingestion_runs
           WHERE data_source_connection_id = $1
             AND organization_id = $2
           ORDER BY created_at DESC
           LIMIT 1
         )
       RETURNING *`,
			[connectionId, organizationId],
		);

		return result.rows[0] || null;
	}

	/**
	 * Create a cancellation request for the platform team to process
	 * Inserts into sync_cancellation_requests table
	 */
	async createCancellationRequest(params: {
		tenantId: string;
		userId: string;
		connectionId: string;
		connectionType: string;
		connectionUrl: string;
		email: string;
	}): Promise<void> {
		await pool.query(
			`INSERT INTO sync_cancellation_requests (
        tenant_id, user_id, connection_id, connection_type,
        connection_url, email, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
			[
				params.tenantId,
				params.userId,
				params.connectionId,
				params.connectionType,
				params.connectionUrl,
				params.email,
			],
		);
	}

	/**
	 * Create an ingestion run record (ITSM Autopilot)
	 * Returns the created ingestion run with its ID
	 */
	async createIngestionRun(params: {
		organizationId: string;
		dataSourceConnectionId: string;
		startedBy: string;
		metadata?: Record<string, any>;
	}): Promise<{ id: string; status: string } | null> {
		try {
			const result = await pool.query<{ id: string; status: string }>(
				`INSERT INTO ingestion_runs (
          organization_id, data_source_connection_id, started_by,
          status, metadata
        ) VALUES ($1, $2, $3, 'pending', $4)
        RETURNING id, status`,
				[
					params.organizationId,
					params.dataSourceConnectionId,
					params.startedBy,
					JSON.stringify(params.metadata || {}),
				],
			);

			return result.rows[0] || null;
		} catch (error) {
			console.error(
				"[DataSourceService] Failed to create ingestion run:",
				error,
			);
			return null;
		}
	}

	/**
	 * Update ingestion run status
	 */
	async updateIngestionRunStatus(
		ingestionRunId: string,
		status: "pending" | "running" | "completed" | "failed" | "cancelled",
		errorMessage?: string,
	): Promise<void> {
		const updates = ["status = $1", "updated_at = NOW()"];
		const values: any[] = [status];
		let paramIndex = 2;

		if (errorMessage) {
			updates.push(`error_message = $${paramIndex++}`);
			values.push(errorMessage);
		}

		if (
			status === "completed" ||
			status === "failed" ||
			status === "cancelled"
		) {
			updates.push("completed_at = NOW()");
		}

		values.push(ingestionRunId);

		await pool.query(
			`UPDATE ingestion_runs
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex}`,
			values,
		);
	}

	/**
	 * Update ingestion run record counts
	 */
	async updateIngestionRunRecords(
		ingestionRunId: string,
		recordsProcessed?: number,
		recordsFailed?: number,
	): Promise<void> {
		const updates: string[] = ["updated_at = NOW()"];
		const values: any[] = [];
		let paramIndex = 1;

		if (recordsProcessed !== undefined) {
			updates.push(`records_processed = $${paramIndex++}`);
			values.push(recordsProcessed);
		}

		if (recordsFailed !== undefined) {
			updates.push(`records_failed = $${paramIndex++}`);
			values.push(recordsFailed);
		}

		if (values.length === 0) return;

		values.push(ingestionRunId);

		await pool.query(
			`UPDATE ingestion_runs
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex}`,
			values,
		);
	}

	/**
	 * Update ingestion run progress (for 'running' status only)
	 * Updates record counts and optionally sets total_estimated in metadata
	 * Returns true if updated, false if skipped (e.g., run was cancelled)
	 */
	async updateIngestionRunProgress(
		ingestionRunId: string,
		recordsProcessed: number,
		recordsFailed: number,
		totalEstimated?: number,
	): Promise<boolean> {
		let result: { rowCount: number | null };
		if (totalEstimated !== undefined) {
			result = await pool.query(
				`UPDATE ingestion_runs
         SET records_processed = $1,
             records_failed = $2,
             metadata = jsonb_set(
               COALESCE(metadata, '{}'::jsonb),
               '{progress,total_estimated}',
               $3::jsonb,
               true
             ),
             updated_at = NOW()
         WHERE id = $4 AND status = 'running'`,
				[
					recordsProcessed,
					recordsFailed,
					JSON.stringify(totalEstimated),
					ingestionRunId,
				],
			);
		} else {
			result = await pool.query(
				`UPDATE ingestion_runs
         SET records_processed = $1,
             records_failed = $2,
             updated_at = NOW()
         WHERE id = $3 AND status = 'running'`,
				[recordsProcessed, recordsFailed, ingestionRunId],
			);
		}
		return (result.rowCount ?? 0) > 0;
	}

	/**
	 * Get the latest ingestion run for a data source connection
	 * Returns null if no ingestion runs exist
	 */
	async getLatestIngestionRun(
		connectionId: string,
		organizationId: string,
	): Promise<IngestionRun | null> {
		const result = await pool.query<IngestionRun>(
			`SELECT
        id,
        organization_id,
        data_source_connection_id,
        started_by,
        status,
        records_processed,
        records_failed,
        metadata,
        error_message,
        completed_at,
        created_at,
        updated_at
       FROM ingestion_runs
       WHERE data_source_connection_id = $1 AND organization_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
			[connectionId, organizationId],
		);

		return result.rows[0] || null;
	}
}
