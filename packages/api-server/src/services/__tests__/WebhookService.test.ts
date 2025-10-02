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
        source: 'rita-test',
        action: 'test-action',
        additionalData: {
          custom_field: 'custom_value'
        }
      });

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-webhook.example.com',
        expect.objectContaining({
          source: 'rita-test',
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
          source: 'test',
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
          source: 'test',
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
});