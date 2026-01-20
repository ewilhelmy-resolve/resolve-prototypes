import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { WebhookService } from '../WebhookService.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Mock database module
vi.mock('../../config/database.js', () => ({
  pool: {
    connect: vi.fn(() => ({
      query: vi.fn(),
      release: vi.fn()
    }))
  }
}));

describe('WebhookService', () => {
  let webhookService: WebhookService;

  beforeEach(() => {
    vi.clearAllMocks();
    webhookService = new WebhookService({
      url: 'https://test-webhook.example.com',
      authHeader: 'Basic test-auth',
      timeout: 5000,
      retryAttempts: 2,
      retryDelay: 100
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendMessageEvent', () => {
    it('should send message webhook successfully', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await webhookService.sendMessageEvent({
        organizationId: 'org-123',
        userId: 'user-456',
        userEmail: 'test@example.com',
        conversationId: 'conv-789',
        messageId: 'msg-101',
        customerMessage: 'Hello world',
        documentIds: ['doc-1', 'doc-2']
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-webhook.example.com',
        expect.objectContaining({
          source: 'rita-chat',
          action: 'message_created',
          tenant_id: 'org-123', // organization_id mapped to tenant_id
          user_email: 'test@example.com',
          user_id: 'user-456',
          conversation_id: 'conv-789',
          message_id: 'msg-101',
          customer_message: 'Hello world',
          document_ids: ['doc-1', 'doc-2']
        }),
        expect.objectContaining({
          headers: {
            'Authorization': 'Basic test-auth',
            'Content-Type': 'application/json'
          },
          timeout: 5000
        })
      );
    });

    it('should send message webhook with transcript successfully', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const transcript = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' }
      ];

      const result = await webhookService.sendMessageEvent({
        organizationId: 'org-123',
        userId: 'user-456',
        userEmail: 'test@example.com',
        conversationId: 'conv-789',
        messageId: 'msg-101',
        customerMessage: 'How are you?',
        documentIds: ['doc-1'],
        transcript: transcript
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-webhook.example.com',
        expect.objectContaining({
          source: 'rita-chat',
          action: 'message_created',
          tenant_id: 'org-123',
          user_email: 'test@example.com',
          user_id: 'user-456',
          conversation_id: 'conv-789',
          message_id: 'msg-101',
          customer_message: 'How are you?',
          document_ids: ['doc-1'],
          transcript_ids: {
            transcripts: transcript
          }
        }),
        expect.objectContaining({
          headers: {
            'Authorization': 'Basic test-auth',
            'Content-Type': 'application/json'
          },
          timeout: 5000
        })
      );
    });

    it('should handle webhook failure with retry', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        },
        message: 'Request failed'
      };

      mockedAxios.post
        .mockRejectedValueOnce(mockError) // First attempt fails
        .mockResolvedValueOnce({ status: 200, data: { success: true } }); // Second attempt succeeds

      const result = await webhookService.sendMessageEvent({
        organizationId: 'org-123',
        userId: 'user-456',
        userEmail: 'test@example.com',
        conversationId: 'conv-789',
        messageId: 'msg-101',
        customerMessage: 'Hello world'
      });

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        },
        message: 'Request failed'
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const result = await webhookService.sendMessageEvent({
        organizationId: 'org-123',
        userId: 'user-456',
        userEmail: 'test@example.com',
        conversationId: 'conv-789',
        messageId: 'msg-101',
        customerMessage: 'Hello world'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request failed');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should not retry on 4xx errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { error: 'Bad request' }
        },
        message: 'Bad request'
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      const result = await webhookService.sendMessageEvent({
        organizationId: 'org-123',
        userId: 'user-456',
        userEmail: 'test@example.com',
        conversationId: 'conv-789',
        messageId: 'msg-101',
        customerMessage: 'Hello world'
      });

      expect(result.success).toBe(false);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // No retry for 4xx
    });
  });

  describe('sendDocumentEvent', () => {
    it('should send document processing webhook successfully', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await webhookService.sendDocumentEvent({
        organizationId: 'org-123',
        userId: 'user-456',
        userEmail: 'test@example.com',
        blobMetadataId: 'doc-789',
        blobId: 'blob-456',
        documentUrl: 'https://example.com/documents/doc-789',
        fileType: 'application/pdf',
        fileSize: 1024000,
        originalFilename: 'test-document.pdf'
      });

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-webhook.example.com',
        expect.objectContaining({
          source: 'rita-documents',
          action: 'document_uploaded',
          tenant_id: 'org-123', // organization_id mapped to tenant_id
          user_email: 'test@example.com',
          user_id: 'user-456',
          blob_metadata_id: 'doc-789',
          blob_id: 'blob-456',
          document_url: 'https://example.com/documents/doc-789',
          file_type: 'application/pdf',
          file_size: 1024000,
          original_filename: 'test-document.pdf'
        }),
        expect.anything()
      );
    });

  });

  describe('sendGenericEvent', () => {
    it('should send generic webhook with organization_id mapped to tenant_id', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await webhookService.sendGenericEvent({
        organizationId: 'org-123',
        userId: 'user-456',
        userEmail: 'test@example.com',
        source: 'rita-chat-workflows',
        action: 'test-action',
        additionalData: {
          custom_field: 'custom_value'
        }
      });

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-webhook.example.com',
        expect.objectContaining({
          source: 'rita-chat-workflows',
          action: 'test-action',
          tenant_id: 'org-123', // organization_id mapped to tenant_id
          user_email: 'test@example.com',
          user_id: 'user-456',
          custom_field: 'custom_value'
        }),
        expect.anything()
      );
    });
  });

  describe('error handling', () => {
    it('should identify retryable errors correctly', async () => {
      const retryableErrors = [
        { response: { status: 500 } }, // Server error
        { response: { status: 502 } }, // Bad gateway
        { response: { status: 503 } }, // Service unavailable
        { response: { status: 429 } }, // Too many requests
        { response: { status: 408 } }, // Request timeout
        { code: 'ECONNABORTED' },      // Network timeout
        { code: 'ENOTFOUND' }          // DNS error
      ];

      for (const error of retryableErrors) {
        mockedAxios.post.mockRejectedValueOnce(error);

        const result = await webhookService.sendGenericEvent({
          organizationId: 'org-123',
          source: 'rita-chat',
          action: 'test'
        });

        expect(result.success).toBe(false);
        // Should have attempted retries (initial + retries = 2 total)
        expect(mockedAxios.post).toHaveBeenCalledTimes(2);

        vi.clearAllMocks();
      }
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableErrors = [
        { response: { status: 400 } }, // Bad request
        { response: { status: 401 } }, // Unauthorized
        { response: { status: 403 } }, // Forbidden
        { response: { status: 404 } }  // Not found
      ];

      for (const error of nonRetryableErrors) {
        mockedAxios.post.mockRejectedValueOnce(error);

        const result = await webhookService.sendGenericEvent({
          organizationId: 'org-123',
          source: 'rita-chat',
          action: 'test'
        });

        expect(result.success).toBe(false);
        // Should not have retried (only 1 attempt)
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);

        vi.clearAllMocks();
      }
    });
  });

  describe('configuration', () => {
    it('should use environment variables as defaults', () => {
      const defaultService = new WebhookService();

      // Should use default values (can't easily test env vars in unit tests)
      expect(defaultService).toBeInstanceOf(WebhookService);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        url: 'https://custom.webhook.com',
        authHeader: 'Bearer custom-token',
        timeout: 15000,
        retryAttempts: 5,
        retryDelay: 2000
      };

      const customService = new WebhookService(customConfig);
      expect(customService).toBeInstanceOf(WebhookService);
    });
  });

  /**
   * Chat Source Tests
   *
   * Rita has three chat applications, each with a distinct source:
   * - rita-chat: Main app (/chat)
   * - rita-chat-iframe: Iframe embed (/iframe/chat)
   * - rita-chat-workflows: Workflow builder (/jirita)
   */
  describe('chat sources', () => {
    it('should use rita-chat source by default for sendMessageEvent', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

      await webhookService.sendMessageEvent({
        organizationId: 'org-123',
        userId: 'user-456',
        userEmail: 'test@example.com',
        conversationId: 'conv-789',
        messageId: 'msg-101',
        customerMessage: 'Hello',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ source: 'rita-chat' }),
        expect.anything()
      );
    });

    it('should use rita-chat-iframe source for iframe sessions', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

      await webhookService.sendMessageEvent({
        organizationId: 'org-123',
        userId: 'user-456',
        userEmail: 'test@example.com',
        conversationId: 'conv-789',
        messageId: 'msg-101',
        customerMessage: 'Hello from iframe',
        source: 'rita-chat-iframe',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ source: 'rita-chat-iframe' }),
        expect.anything()
      );
    });

    it('should use rita-chat-workflows source for workflow chat', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

      await webhookService.sendMessageEvent({
        organizationId: 'org-123',
        userId: 'user-456',
        userEmail: 'test@example.com',
        conversationId: 'conv-789',
        messageId: 'msg-101',
        customerMessage: 'Generate workflow',
        source: 'rita-chat-workflows',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ source: 'rita-chat-workflows' }),
        expect.anything()
      );
    });

    it('should use correct source in sendGenericEvent for workflows', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

      await webhookService.sendGenericEvent({
        organizationId: 'org-123',
        userId: 'user-456',
        userEmail: 'test@example.com',
        source: 'rita-chat-workflows',
        action: 'generate_dynamic_workflow',
        additionalData: { query: 'Create automation' },
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          source: 'rita-chat-workflows',
          action: 'generate_dynamic_workflow',
        }),
        expect.anything()
      );
    });
  });

  /**
   * Webhook Payload Behavior Tests
   *
   * Two distinct behaviors:
   * - sendMessageEvent (rita-chat): Includes ALL Rita internal IDs
   * - sendTenantMessageEvent (rita-chat-iframe): Only Valkey config + message content
   */
  describe('sendMessageEvent - Rita Go (includes document_ids, transcript_ids)', () => {
    it('should include document_ids and transcript_ids in payload', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

      await webhookService.sendMessageEvent({
        organizationId: 'org-123',
        userId: 'user-456',
        userEmail: 'user@example.com',
        conversationId: 'conv-789',
        messageId: 'msg-101',
        customerMessage: 'Hello from Rita Go',
        documentIds: ['doc-1', 'doc-2'],
        transcript: [{ role: 'user', content: 'Hello' }],
      });

      const calledPayload = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

      // Should include ALL Rita internal IDs
      expect(calledPayload.user_id).toBe('user-456');
      expect(calledPayload.user_email).toBe('user@example.com');
      expect(calledPayload.tenant_id).toBe('org-123');
      expect(calledPayload.conversation_id).toBe('conv-789');
      expect(calledPayload.message_id).toBe('msg-101');
      expect(calledPayload.document_ids).toEqual(['doc-1', 'doc-2']);
      expect(calledPayload.transcript_ids).toEqual({ transcripts: [{ role: 'user', content: 'Hello' }] });
      expect(calledPayload.customer_message).toBe('Hello from Rita Go');
      expect(calledPayload.source).toBe('rita-chat');
    });
  });

  /**
   * sendTenantMessageEvent - Valkey camelCase → Webhook snake_case
   *
   * Platform stores Valkey config in camelCase (tenantId, userGuid, uiConfig).
   * WebhookService must include BOTH:
   * - Original camelCase fields (for Actions API compatibility)
   * - Snake_case routing fields (for RabbitMQ response routing)
   *
   * Required snake_case fields for RabbitMQ routing:
   * - tenant_id: maps to organizationId in Rita
   * - user_guid: Jarvis user identifier
   * - conversation_id: for message routing
   * - message_id: to update original message
   */
  describe('sendTenantMessageEvent - Valkey camelCase to webhook snake_case routing', () => {
    // Canonical Valkey payload from platform (all camelCase)
    const canonicalIframeConfig = {
      accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      tabInstanceId: '62ea2274-8ecc-4390-9c16-2a007cd97850',
      tenantName: 'staging',
      tenantId: '00F4F67D-3B92-4FD2-A574-7BE22C6BE796',
      chatSessionId: 'b08c2f5c-2071-4e69-b753-dd381c41bf64',
      clientId: 'E14730FA-D1B5-4037-ACE3-CF97FBC676C2',
      clientKey: 'O$Q2K!NPQ)XQO9ZI0!I&O97UVANMX16P',
      tokenExpiry: 1768945670,
      context: { designer: 'activity', activityId: 2209 },
      actionsApiBaseUrl: 'https://actions-api-staging.resolve.io/',
      userGuid: '472e6672-b1f5-4ee4-86d8-3804eb8d064d',
      uiConfig: {
        titleText: 'Jarvis Activity Builder',
        welcomeText: 'Start by just describing in detail what you want.',
        placeholderText: 'Enter a description of what the activity should do.',
      },
    };

    it('should include snake_case routing fields for RabbitMQ', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

      await webhookService.sendTenantMessageEvent({
        organizationId: 'rita-org-id',
        userId: 'rita-user-id',
        conversationId: 'conv-123',
        messageId: 'msg-456',
        customerMessage: 'Build an activity that calls Salesforce API',
        iframeConfig: canonicalIframeConfig,
      });

      const calledPayload = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

      // REQUIRED snake_case fields for RabbitMQ routing
      expect(calledPayload.tenant_id).toBe('00F4F67D-3B92-4FD2-A574-7BE22C6BE796');
      expect(calledPayload.user_guid).toBe('472e6672-b1f5-4ee4-86d8-3804eb8d064d');
      expect(calledPayload.conversation_id).toBe('conv-123');
      expect(calledPayload.message_id).toBe('msg-456');
    });

    it('should preserve camelCase fields from Valkey for Actions API', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

      await webhookService.sendTenantMessageEvent({
        organizationId: 'rita-org-id',
        userId: 'rita-user-id',
        conversationId: 'conv-123',
        messageId: 'msg-456',
        customerMessage: 'Hello',
        iframeConfig: canonicalIframeConfig,
      });

      const calledPayload = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

      // Original camelCase fields should be preserved
      expect(calledPayload.tenantId).toBe('00F4F67D-3B92-4FD2-A574-7BE22C6BE796');
      expect(calledPayload.userGuid).toBe('472e6672-b1f5-4ee4-86d8-3804eb8d064d');
      expect(calledPayload.chatSessionId).toBe('b08c2f5c-2071-4e69-b753-dd381c41bf64');
      expect(calledPayload.tabInstanceId).toBe('62ea2274-8ecc-4390-9c16-2a007cd97850');
      expect(calledPayload.actionsApiBaseUrl).toBe('https://actions-api-staging.resolve.io/');
      expect(calledPayload.context).toEqual({ designer: 'activity', activityId: 2209 });
    });

    it('should include uiConfig in camelCase for Actions API', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

      await webhookService.sendTenantMessageEvent({
        organizationId: 'rita-org-id',
        userId: 'rita-user-id',
        conversationId: 'conv-123',
        messageId: 'msg-456',
        customerMessage: 'Hello',
        iframeConfig: canonicalIframeConfig,
      });

      const calledPayload = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;
      const uiConfig = calledPayload.uiConfig as Record<string, unknown>;

      // uiConfig should be passed through in camelCase
      expect(uiConfig.titleText).toBe('Jarvis Activity Builder');
      expect(uiConfig.welcomeText).toBe('Start by just describing in detail what you want.');
      expect(uiConfig.placeholderText).toBe('Enter a description of what the activity should do.');
    });

    it('should use correct source (rita-chat-iframe) and action', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

      await webhookService.sendTenantMessageEvent({
        organizationId: 'rita-org-id',
        userId: 'rita-user-id',
        conversationId: 'conv-123',
        messageId: 'msg-456',
        customerMessage: 'Hello',
        iframeConfig: canonicalIframeConfig,
      });

      const calledPayload = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

      expect(calledPayload.source).toBe('rita-chat-iframe');
      expect(calledPayload.action).toBe('message_created');
      expect(calledPayload.customer_message).toBe('Hello');
      expect(calledPayload.timestamp).toBeDefined();
    });

    it('should call tenant-specific webhook URL with Basic auth', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

      await webhookService.sendTenantMessageEvent({
        organizationId: 'rita-org-id',
        userId: 'rita-user-id',
        conversationId: 'conv-123',
        messageId: 'msg-456',
        customerMessage: 'Hello',
        iframeConfig: canonicalIframeConfig,
      });

      const expectedAuth = Buffer.from(`${canonicalIframeConfig.clientId}:${canonicalIframeConfig.clientKey}`).toString('base64');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://actions-api-staging.resolve.io/api/Webhooks/postEvent/00F4F67D-3B92-4FD2-A574-7BE22C6BE796',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedAuth}`,
          }),
        })
      );
    });
  });

  describe('sendTenantMessageEvent - iframe (NO document_ids, transcript_ids, user_email)', () => {
    const mockIframeConfig = {
      accessToken: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
      tabInstanceId: 'tab-123',
      tenantId: 'tenant-456',
      tenantName: 'Test Tenant',
      clientId: 'client-abc',
      clientKey: 'secret-key-xyz',
      tokenExpiry: Date.now() + 3600000,
      actionsApiBaseUrl: 'https://actions.example.com',
      userGuid: 'jarvis-user-guid-123',
    };

    it('should include both Valkey config (camelCase) and Rita routing fields (snake_case)', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

      await webhookService.sendTenantMessageEvent({
        organizationId: 'rita-org-id',
        userId: 'rita-user-id',
        conversationId: 'rita-conv-id',
        messageId: 'rita-msg-id',
        customerMessage: 'Hello from iframe',
        iframeConfig: mockIframeConfig,
      });

      const calledPayload = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;

      // Should include Valkey config fields (camelCase)
      expect(calledPayload.userGuid).toBe('jarvis-user-guid-123');
      expect(calledPayload.tenantId).toBe('tenant-456');
      expect(calledPayload.accessToken).toBe('jwt-access-token');

      // Should include snake_case fields for RabbitMQ routing
      expect(calledPayload.tenant_id).toBe('tenant-456');
      expect(calledPayload.user_guid).toBe('jarvis-user-guid-123');
      expect(calledPayload.conversation_id).toBe('rita-conv-id');
      expect(calledPayload.message_id).toBe('rita-msg-id');

      // Should NOT include user_email, document_ids, or transcript_ids for iframe (SOC2)
      expect(calledPayload.user_email).toBeUndefined();
      expect(calledPayload.document_ids).toBeUndefined();
      expect(calledPayload.transcript_ids).toBeUndefined();

      // Should include message content
      expect(calledPayload.customer_message).toBe('Hello from iframe');
      expect(calledPayload.source).toBe('rita-chat-iframe');
      expect(calledPayload.action).toBe('message_created');
      expect(calledPayload.timestamp).toBeDefined();
    });

    it('should call tenant-specific webhook URL with Basic auth', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

      await webhookService.sendTenantMessageEvent({
        organizationId: 'rita-org-id',
        userId: 'rita-user-id',
        conversationId: 'rita-conv-id',
        messageId: 'rita-msg-id',
        customerMessage: 'Hello',
        iframeConfig: mockIframeConfig,
      });

      const expectedAuth = Buffer.from('client-abc:secret-key-xyz').toString('base64');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://actions.example.com/api/Webhooks/postEvent/tenant-456',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedAuth}`,
          }),
        })
      );
    });
  });
});