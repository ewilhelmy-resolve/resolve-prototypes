import express from 'express';
import { z } from 'zod';
import { ALLOWED_DATA_SOURCE_TYPES } from '../constants/dataSources.js';
import { authenticateUser } from '../middleware/auth.js';
import { DataSourceService } from '../services/DataSourceService.js';
import type { AuthenticatedRequest } from '../types/express.js';
import dataSourceWebhookRoutes from './dataSourceWebhooks.js';

const router = express.Router();
const dataSourceService = new DataSourceService();

// Validation schemas
const createDataSourceSchema = z.object({
  type: z.enum(ALLOWED_DATA_SOURCE_TYPES),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  settings: z.record(z.string(), z.any()).optional()
});

const updateDataSourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  enabled: z.boolean().optional()
});

/**
 * GET /api/data-sources
 * List all data sources for the authenticated user's organization
 */
router.get('/', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const dataSources = await dataSourceService.getDataSources(
      authReq.user.activeOrganizationId
    );

    res.json({ data: dataSources });
  } catch (error) {
    console.error('[DataSources] Error fetching data sources:', error);
    res.status(500).json({ error: 'Failed to fetch data sources' });
  }
});

/**
 * POST /api/data-sources/seed
 * Seed default data sources for the organization (idempotent)
 * IMPORTANT: Must be defined BEFORE /:id route to avoid matching "seed" as an ID
 */
router.post('/seed', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const result = await dataSourceService.seedDefaultDataSources(
      authReq.user.activeOrganizationId,
      authReq.user.id
    );

    res.json({
      success: true,
      created: result.created.length,
      existing: result.existing.length,
      message: `Created ${result.created.length} new data sources, ${result.existing.length} already existed`
    });
  } catch (error) {
    console.error('[DataSources] Error seeding data sources:', error);
    res.status(500).json({ error: 'Failed to seed data sources' });
  }
});

/**
 * GET /api/data-sources/:id
 * Get a single data source by ID
 */
router.get('/:id', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    const dataSource = await dataSourceService.getDataSource(
      id,
      authReq.user.activeOrganizationId
    );

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    res.json({ data: dataSource });
  } catch (error) {
    console.error('[DataSources] Error fetching data source:', error);
    res.status(500).json({ error: 'Failed to fetch data source' });
  }
});

/**
 * POST /api/data-sources
 * Create a new data source
 */
router.post('/', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    // Validate request body
    const validated = createDataSourceSchema.parse(req.body);

    const dataSource = await dataSourceService.createDataSource(
      authReq.user.activeOrganizationId,
      authReq.user.id,
      validated
    );

    res.status(201).json({ data: dataSource });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }

    console.error('[DataSources] Error creating data source:', error);
    res.status(500).json({ error: 'Failed to create data source' });
  }
});

/**
 * PUT /api/data-sources/:id
 * Update an existing data source
 */
router.put('/:id', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    // Validate request body
    const validated = updateDataSourceSchema.parse(req.body);

    const dataSource = await dataSourceService.updateDataSource(
      id,
      authReq.user.activeOrganizationId,
      authReq.user.id,
      validated
    );

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    res.json({ data: dataSource });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }

    console.error('[DataSources] Error updating data source:', error);
    res.status(500).json({ error: 'Failed to update data source' });
  }
});

/**
 * DELETE /api/data-sources/:id
 * Delete a data source
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    const deleted = await dataSourceService.deleteDataSource(
      id,
      authReq.user.activeOrganizationId
    );

    if (!deleted) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    res.json({ success: true, message: 'Data source deleted' });
  } catch (error) {
    console.error('[DataSources] Error deleting data source:', error);
    res.status(500).json({ error: 'Failed to delete data source' });
  }
});

// Mount webhook routes (verify, sync)
router.use('/', dataSourceWebhookRoutes);

export default router;