/**
 * iframe.routes.test.ts
 *
 * Tests for iframe API endpoints:
 * - POST /api/iframe/validate-instantiation
 * - POST /api/iframe/execute
 * - GET /api/iframe/debug
 *
 * /execute endpoint gets all IDs from Valkey config - no session lookup needed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies before imports
const { mockIframeService, mockWorkflowService } =
  vi.hoisted(() => ({
    mockIframeService: {
      validateAndSetup: vi.fn(),
    },
    mockWorkflowService: {
      executeFromHashkey: vi.fn(),
    },
  }));

vi.mock('../../services/IframeService.js', () => ({
  getIframeService: () => mockIframeService,
}));

vi.mock('../../services/WorkflowExecutionService.js', () => ({
  getWorkflowExecutionService: () => mockWorkflowService,
}));

vi.mock('../../config/valkey.js', () => ({
  getValkeyStatus: () => ({
    configured: true,
    url: 'redis://localhost:6379',
    connected: true,
  }),
}));

vi.mock('../../config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import iframeRouter from '../iframe.routes.js';

describe('iframe.routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/iframe', iframeRouter);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/iframe/execute', () => {
    it('should execute workflow and return success', async () => {
      mockWorkflowService.executeFromHashkey.mockResolvedValue({
        success: true,
        eventId: 'event-123',
        debug: {
          valkeyStatus: { configured: true, url: 'redis://localhost', connected: true },
          webhookStatus: 200,
          totalDurationMs: 150,
        },
      });

      const response = await request(app)
        .post('/api/iframe/execute')
        .send({ hashkey: 'my-hashkey-abc' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.eventId).toBe('event-123');

      // Verify hashkey was passed to workflow service (IDs come from Valkey)
      expect(mockWorkflowService.executeFromHashkey).toHaveBeenCalledWith(
        'my-hashkey-abc'
      );
    });

    it('should support sessionKey parameter (portal compatibility)', async () => {
      mockWorkflowService.executeFromHashkey.mockResolvedValue({
        success: true,
        eventId: 'event-123',
        debug: { valkeyStatus: { configured: true, url: '', connected: true } },
      });

      await request(app)
        .post('/api/iframe/execute')
        .send({ sessionKey: 'portal-session-key' })
        .expect(200);

      expect(mockWorkflowService.executeFromHashkey).toHaveBeenCalledWith(
        'portal-session-key'
      );
    });

    it('should prefer hashkey over sessionKey when both provided', async () => {
      mockWorkflowService.executeFromHashkey.mockResolvedValue({
        success: true,
        eventId: 'event-123',
        debug: { valkeyStatus: { configured: true, url: '', connected: true } },
      });

      await request(app)
        .post('/api/iframe/execute')
        .send({ hashkey: 'primary-key', sessionKey: 'fallback-key' })
        .expect(200);

      expect(mockWorkflowService.executeFromHashkey).toHaveBeenCalledWith(
        'primary-key'
      );
    });

    it('should return 400 when hashkey is missing', async () => {
      const response = await request(app)
        .post('/api/iframe/execute')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing hashkey parameter');
      expect(mockWorkflowService.executeFromHashkey).not.toHaveBeenCalled();
    });

    it('should return 400 when workflow execution fails', async () => {
      mockWorkflowService.executeFromHashkey.mockResolvedValue({
        success: false,
        error: 'Config invalid: KEY_NOT_FOUND',
        debug: {
          valkeyStatus: { configured: true, url: '', connected: true },
          errorCode: 'KEY_NOT_FOUND',
        },
      });

      const response = await request(app)
        .post('/api/iframe/execute')
        .send({ hashkey: 'missing-key' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('KEY_NOT_FOUND');
    });

    it('should return 500 on unexpected error', async () => {
      mockWorkflowService.executeFromHashkey.mockRejectedValue(new Error('Valkey error'));

      const response = await request(app)
        .post('/api/iframe/execute')
        .send({ hashkey: 'any-key' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should include debug info in error response', async () => {
      mockWorkflowService.executeFromHashkey.mockResolvedValue({
        success: false,
        error: 'Webhook failed: 401 - Unauthorized',
        debug: {
          valkeyStatus: { configured: true, url: 'redis://localhost', connected: true },
          webhookUrl: 'https://api.example.com/webhook',
          webhookStatus: 401,
          errorCode: 'HTTP_401',
        },
      });

      const response = await request(app)
        .post('/api/iframe/execute')
        .send({ hashkey: 'auth-fail-key' })
        .expect(400);

      expect(response.body.debug).toBeDefined();
      expect(response.body.debug.webhookStatus).toBe(401);
    });
  });

  describe('POST /api/iframe/validate-instantiation', () => {
    it('should validate sessionKey and return session info', async () => {
      mockIframeService.validateAndSetup.mockResolvedValue({
        valid: true,
        conversationId: 'new-conv-123',
        cookie: 'session=abc; Path=/; HttpOnly',
        webhookConfigLoaded: true,
        webhookTenantId: 'tenant-456',
      });

      const response = await request(app)
        .post('/api/iframe/validate-instantiation')
        .send({ sessionKey: 'my-session-key' })
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.conversationId).toBe('new-conv-123');
      expect(response.body.webhookConfigLoaded).toBe(true);
      expect(mockIframeService.validateAndSetup).toHaveBeenCalledWith(
        'my-session-key',
        undefined,
        undefined
      );
    });

    it('should pass intentEid and existingConversationId', async () => {
      mockIframeService.validateAndSetup.mockResolvedValue({
        valid: true,
        conversationId: 'existing-conv-789',
        cookie: 'session=xyz; Path=/; HttpOnly',
        webhookConfigLoaded: true,
      });

      await request(app)
        .post('/api/iframe/validate-instantiation')
        .send({
          sessionKey: 'portal-key',
          intentEid: 'intent-123',
          existingConversationId: 'existing-conv-789',
        })
        .expect(200);

      expect(mockIframeService.validateAndSetup).toHaveBeenCalledWith(
        'portal-key',
        'intent-123',
        'existing-conv-789'
      );
    });

    it('should return 401 for invalid Valkey config', async () => {
      mockIframeService.validateAndSetup.mockResolvedValue({
        valid: false,
        error: 'Invalid or missing Valkey configuration',
      });

      const response = await request(app)
        .post('/api/iframe/validate-instantiation')
        .send({ sessionKey: 'invalid-key' })
        .expect(401);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Invalid or missing Valkey configuration');
    });

    it('should set session cookie on success', async () => {
      mockIframeService.validateAndSetup.mockResolvedValue({
        valid: true,
        conversationId: 'conv-123',
        cookie: 'rita_session=abc123; Path=/; HttpOnly; SameSite=Strict',
        webhookConfigLoaded: true,
      });

      const response = await request(app)
        .post('/api/iframe/validate-instantiation')
        .send({ sessionKey: 'valid-session-key' })
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('GET /api/iframe/debug', () => {
    it('should return Valkey status and env info', async () => {
      const response = await request(app)
        .get('/api/iframe/debug')
        .expect(200);

      expect(response.body.timestamp).toBeDefined();
      expect(response.body.valkey).toBeDefined();
      expect(response.body.valkey.configured).toBe(true);
      expect(response.body.environment).toBeDefined();
    });
  });
});
