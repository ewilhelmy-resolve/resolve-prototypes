import { pool } from '../config/database.js';
import { DEFAULT_DATA_SOURCES, isValidDataSourceType } from '../constants/dataSources.js';
import type {
  CreateDataSourceRequest,
  DataSourceConnection,
  UpdateDataSourceRequest
} from '../types/dataSource.js';

export class DataSourceService {
  /**
   * Get all data sources for an organization
   */
  async getDataSources(organizationId: string): Promise<DataSourceConnection[]> {
    const result = await pool.query<DataSourceConnection>(
      `SELECT * FROM data_source_connections
       WHERE organization_id = $1
       ORDER BY created_at ASC`,
      [organizationId]
    );

    return result.rows;
  }

  /**
   * Get a single data source by ID
   */
  async getDataSource(id: string, organizationId: string): Promise<DataSourceConnection | null> {
    const result = await pool.query<DataSourceConnection>(
      `SELECT * FROM data_source_connections
       WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new data source
   */
  async createDataSource(
    organizationId: string,
    userId: string,
    data: CreateDataSourceRequest
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
        userId
      ]
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
    data: UpdateDataSourceRequest
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
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++}
       RETURNING *`,
      values
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
      [id, organizationId]
    );

    return (result.rowCount || 0) > 0;
  }

  /**
   * Seed default data sources for an organization (idempotent)
   */
  async seedDefaultDataSources(organizationId: string, userId: string): Promise<{
    created: DataSourceConnection[];
    existing: string[];
  }> {
    const created: DataSourceConnection[] = [];
    const existing: string[] = [];

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const source of DEFAULT_DATA_SOURCES) {
        const result = await client.query<DataSourceConnection>(
          `INSERT INTO data_source_connections (
            organization_id, type, name, description,
            status, enabled, created_by, updated_by
          )
          VALUES ($1, $2, $3, $4, 'idle', false, $5, $5)
          ON CONFLICT (organization_id, type) DO NOTHING
          RETURNING *`,
          [organizationId, source.type, source.name, source.description, userId]
        );

        if (result.rows.length > 0) {
          created.push(result.rows[0]);
        } else {
          existing.push(source.type);
        }
      }

      await client.query('COMMIT');

      return { created, existing };
    } catch (error) {
      await client.query('ROLLBACK');
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
    status: 'idle' | 'syncing',
    lastSyncStatus?: 'completed' | 'failed' | null,
    updateLastSyncAt: boolean = false
  ): Promise<DataSourceConnection | null> {
    const updates = ['status = $1'];
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

    const result = await pool.query<DataSourceConnection>(
      `UPDATE data_source_connections
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Check if verification should be triggered (throttle: 10 minutes)
   */
  async shouldTriggerVerification(
    connectionId: string,
    organizationId: string
  ): Promise<boolean> {
    const result = await pool.query<{ last_verification_at: Date | null }>(
      `SELECT last_verification_at
       FROM data_source_connections
       WHERE id = $1 AND organization_id = $2`,
      [connectionId, organizationId]
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
    status: 'success' | 'failed',
    options?: Record<string, any>,
    error?: string
  ): Promise<DataSourceConnection | null> {
    const updates = ['status = $1', 'last_verification_at = NOW()'];
    const values: any[] = ['idle']; // Always return to idle after verification
    let paramIndex = 2;

    if (status === 'success') {
      // On success: clear error, store options
      updates.push(`last_verification_error = NULL`);

      if (options) {
        updates.push(`latest_options = $${paramIndex++}`);
        values.push(JSON.stringify(options));
      }
    } else {
      // On failure: store error
      updates.push(`last_verification_error = $${paramIndex++}`);
      values.push(error || 'Verification failed');
    }

    updates.push(`updated_at = NOW()`);

    values.push(connectionId, organizationId);

    const result = await pool.query<DataSourceConnection>(
      `UPDATE data_source_connections
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }
}