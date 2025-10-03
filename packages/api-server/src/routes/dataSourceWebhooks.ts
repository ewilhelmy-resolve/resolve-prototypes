import express from 'express';
import { z } from 'zod';
import { DataSourceService } from '../services/DataSourceService.js';
import { DataSourceWebhookService } from '../services/DataSourceWebhookService.js';
import { authenticateUser } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/express.js';

const router = express.Router();
const dataSourceService = new DataSourceService();
const webhookService = new DataSourceWebhookService();

// Validation schema for verify endpoint
const verifyCredentialsSchema = z.object({
  credentials: z.record(z.string(), z.any()),
  settings: z.record(z.string(), z.any()).optional()
});

/**
 * POST /api/v1/data-sources/:id/verify
 * Verify credentials for a data source by sending to external service
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

    // Send verify webhook
    const webhookResponse = await webhookService.sendVerifyEvent({
      organizationId: authReq.user.activeOrganizationId,
      userId: authReq.user.id,
      userEmail: authReq.user.email,
      connectionId: dataSource.id,
      connectionType: dataSource.type,
      credentials: validated.credentials,
      settings: validated.settings || dataSource.settings
    });

    if (!webhookResponse.success) {
      return res.status(500).json({
        success: false,
        error: 'Verification failed',
        details: webhookResponse.error
      });
    }

    // Update data source if settings were provided
    if (validated.settings) {
      await dataSourceService.updateDataSource(
        id,
        authReq.user.activeOrganizationId,
        authReq.user.id,
        {
          settings: validated.settings,
          enabled: true
        }
      );
    }

    res.json({
      success: true,
      message: 'Credentials verified successfully',
      data: webhookResponse.data
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

    res.json({
      success: true,
      message: 'Sync triggered successfully',
      data: webhookResponse.data
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

export default router;