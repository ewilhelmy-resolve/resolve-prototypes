import express from 'express';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth.js';
import { DataSourceService } from '../services/DataSourceService.js';
import { DataSourceWebhookService } from '../services/DataSourceWebhookService.js';
import type { AuthenticatedRequest } from '../types/express.js';

const router = express.Router();
const dataSourceService = new DataSourceService();
const webhookService = new DataSourceWebhookService();

// Validation schema for verify endpoint (credentials optional for auto-verify)
const verifyCredentialsSchema = z.object({
  credentials: z.record(z.string(), z.any()).optional(),
  settings: z.record(z.string(), z.any()).optional()
});

// Validation schema for sync-tickets endpoint (ITSM Autopilot)
const syncTicketsSchema = z.object({
  time_range_days: z.number().int().min(1).max(365).default(30)
});

/**
 * POST /api/v1/data-sources/:id/verify
 * Verify credentials for a data source
 * - With credentials: Manual verification (first-time setup)
 * - Without credentials: Auto-verification with 10-minute throttle
 */
router.post('/:id/verify', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    // Validate request body
    const validated = verifyCredentialsSchema.parse(req.body);

    // Get data source
    const dataSource = await dataSourceService.getDataSource(
      id,
      authReq.user.activeOrganizationId
    );

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Auto-verification mode (no credentials provided)
    if (!validated.credentials) {
      // Check throttle (10-minute minimum)
      const shouldVerify = await dataSourceService.shouldTriggerVerification(
        id,
        authReq.user.activeOrganizationId
      );

      if (!shouldVerify) {
        return res.json({
          status: 'skipped',
          message: 'Verification throttled (10-minute minimum)',
          last_verification_at: dataSource.last_verification_at
        });
      }
    }

    // Update status to 'verifying' before sending webhook
    await dataSourceService.updateDataSourceStatus(
      id,
      authReq.user.activeOrganizationId,
      'verifying' as any
    );

    // Send verify webhook (await response)
    const webhookResponse = await webhookService.sendVerifyEvent({
      organizationId: authReq.user.activeOrganizationId,
      userId: authReq.user.id,
      userEmail: authReq.user.email,
      connectionId: dataSource.id,
      connectionType: dataSource.type,
      credentials: validated.credentials || {},
      settings: validated.settings || dataSource.settings
    });

    // Handle webhook failure - revert status
    if (!webhookResponse.success) {
      await dataSourceService.updateDataSourceStatus(
        id,
        authReq.user.activeOrganizationId,
        'idle',
        'failed'
      );

      return res.status(500).json({
        success: false,
        error: 'Verification webhook failed',
        details: webhookResponse.error
      });
    }

    // Return success - result will come via RabbitMQ/SSE
    res.json({
      status: 'verifying',
      message: 'Verification in progress'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }

    console.error('[DataSourceWebhook] Error verifying credentials:', error);
    res.status(500).json({ error: 'Failed to verify credentials' });
  }
});

/**
 * POST /api/v1/data-sources/:id/sync
 * Trigger sync for a data source
 */
router.post('/:id/sync', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    // Get data source
    const dataSource = await dataSourceService.getDataSource(
      id,
      authReq.user.activeOrganizationId
    );

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    if (!dataSource.enabled) {
      return res.status(400).json({
        error: 'Data source not configured',
        message: 'Please configure the data source before triggering a sync'
      });
    }

    if (dataSource.status === 'syncing') {
      return res.status(409).json({
        error: 'Sync already in progress',
        message: 'A sync is already running for this data source'
      });
    }

    // Update status to syncing
    await dataSourceService.updateDataSourceStatus(
      id,
      authReq.user.activeOrganizationId,
      'syncing'
    );

    // Send sync trigger webhook
    const webhookResponse = await webhookService.sendSyncTriggerEvent({
      organizationId: authReq.user.activeOrganizationId,
      userId: authReq.user.id,
      userEmail: authReq.user.email,
      connectionId: dataSource.id,
      connectionType: dataSource.type,
      settings: dataSource.settings
    });

    if (!webhookResponse.success) {
      // Revert status to idle on failure
      await dataSourceService.updateDataSourceStatus(
        id,
        authReq.user.activeOrganizationId,
        'idle',
        'failed'
      );

      return res.status(500).json({
        success: false,
        error: 'Sync trigger failed',
        details: webhookResponse.error
      });
    }

    // Get updated data source to return in response
    const updatedDataSource = await dataSourceService.getDataSource(
      id,
      authReq.user.activeOrganizationId
    );

    if (!updatedDataSource) {
      throw new Error('Data source not found after update');
    }

    res.json({
      data: {
        id: updatedDataSource.id,
        status: 'syncing' as const,
        triggeredAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[DataSourceWebhook] Error triggering sync:', error);

    // Try to revert status on error
    try {
      await dataSourceService.updateDataSourceStatus(
        id,
        authReq.user.activeOrganizationId,
        'idle',
        'failed'
      );
    } catch (revertError) {
      console.error('[DataSourceWebhook] Failed to revert status:', revertError);
    }

    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

/**
 * POST /api/v1/data-sources/:id/cancel-sync
 * Cancel an ongoing sync operation
 *
 * Platform team implementation:
 * Platform team polls sync_cancellation_requests table for pending requests,
 * stops the running sync jobs, and updates status to 'completed' when done.
 */
router.post('/:id/cancel-sync', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    // Get data source
    const dataSource = await dataSourceService.getDataSource(
      id,
      authReq.user.activeOrganizationId
    );

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Check if sync is actually in progress
    if (dataSource.status !== 'syncing') {
      return res.status(400).json({
        error: 'No sync in progress',
        message: `Cannot cancel sync - current status is '${dataSource.status}'`
      });
    }

    // Cancel the sync locally first (update database status)
    const updatedDataSource = await dataSourceService.cancelSync(
      id,
      authReq.user.activeOrganizationId
    );

    if (!updatedDataSource) {
      throw new Error('Data source not found after cancel operation');
    }

    // Create cancellation request for platform team to process
    await dataSourceService.createCancellationRequest({
      tenantId: authReq.user.activeOrganizationId,
      userId: authReq.user.id,
      connectionId: dataSource.id,
      connectionType: dataSource.type,
      connectionUrl: dataSource.settings?.url || '',
      email: dataSource.settings?.email || ''
    });

    console.log('[DataSourceWebhook] Cancellation request created:', {
      connectionId: dataSource.id,
      tenantId: authReq.user.activeOrganizationId,
      connectionType: dataSource.type
    });

    res.json({
      success: true,
      data: {
        id: updatedDataSource.id,
        status: updatedDataSource.status,
        last_sync_status: updatedDataSource.last_sync_status,
        last_sync_error: updatedDataSource.last_sync_error,
        cancelledAt: new Date().toISOString()
      },
      message: 'Sync cancelled successfully'
    });
  } catch (error) {
    console.error('[DataSourceWebhook] Error cancelling sync:', error);
    res.status(500).json({ error: 'Failed to cancel sync' });
  }
});

/**
 * POST /api/v1/data-sources/:id/sync-tickets
 * Trigger ITSM ticket sync for autopilot clustering
 * Creates ingestion_runs record, sends webhook, returns 202
 */
router.post('/:id/sync-tickets', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    // Validate request body
    const validated = syncTicketsSchema.parse(req.body);

    // Get data source
    const dataSource = await dataSourceService.getDataSource(
      id,
      authReq.user.activeOrganizationId
    );

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    if (!dataSource.enabled) {
      return res.status(400).json({
        error: 'Data source not configured',
        message: 'Please configure the data source before triggering a sync'
      });
    }

    // TODO: Check itsm_enabled flag once migration is applied
    // For now, allow servicenow and jira types
    if (!['servicenow', 'jira'].includes(dataSource.type)) {
      return res.status(400).json({
        error: 'Invalid data source type',
        message: 'Ticket sync is only supported for ServiceNow and Jira connections'
      });
    }

    // Create ingestion_runs record
    const ingestionRunResult = await dataSourceService.createIngestionRun({
      organizationId: authReq.user.activeOrganizationId,
      dataSourceConnectionId: dataSource.id,
      startedBy: authReq.user.id,
      metadata: {
        time_range_days: validated.time_range_days,
        connection_type: dataSource.type
      }
    });

    if (!ingestionRunResult) {
      return res.status(500).json({ error: 'Failed to create ingestion run' });
    }

    // Send sync tickets webhook
    const webhookResponse = await webhookService.sendSyncTicketsEvent({
      organizationId: authReq.user.activeOrganizationId,
      userId: authReq.user.id,
      userEmail: authReq.user.email,
      connectionId: dataSource.id,
      connectionType: dataSource.type,
      ingestionRunId: ingestionRunResult.id,
      settings: {
        ...dataSource.settings,
        time_range_days: validated.time_range_days
      }
    });

    if (!webhookResponse.success) {
      // Update ingestion run status to failed
      await dataSourceService.updateIngestionRunStatus(
        ingestionRunResult.id,
        'failed',
        webhookResponse.error || 'Webhook request failed'
      );

      return res.status(500).json({
        success: false,
        error: 'Sync tickets webhook failed',
        details: webhookResponse.error
      });
    }

    // Update ingestion run status to running
    await dataSourceService.updateIngestionRunStatus(ingestionRunResult.id, 'running');

    // Return 202 Accepted - result will arrive via RabbitMQ/SSE
    res.status(202).json({
      ingestion_run_id: ingestionRunResult.id,
      status: 'SYNCING',
      message: 'Ticket sync in progress'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }

    console.error('[DataSourceWebhook] Error triggering ticket sync:', error);
    res.status(500).json({ error: 'Failed to trigger ticket sync' });
  }
});

export default router;