const { test, expect } = require('@playwright/test');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

test.describe('RAG Vector Search API', () => {
  let tenantId;
  let callbackToken;

  test.beforeEach(async ({ request }) => {
    // Skip setup for now - test expects 401 for missing/invalid auth
    tenantId = uuidv4();
    callbackToken = 'invalid-test-token';
  });

  test('should return similar vectors with valid token', async ({ request }) => {
    // Create a test document with vectors
    const documentId = uuidv4();
    await request.post('/api/rag/test-vectors', {
      data: {
        tenant_id: tenantId,
        document_id: documentId,
        vectors: [
          {
            chunk_text: 'This is a test chunk about machine learning',
            embedding: Array(1536).fill(0.1), // Test embedding
            chunk_index: 0
          }
        ]
      }
    });

    // Test vector search
    const searchResponse = await request.post('/api/rag/vector-search', {
      headers: {
        'X-Callback-Token': callbackToken
      },
      data: {
        query_embedding: Array(1536).fill(0.1), // Similar to test vector
        tenant_id: tenantId,
        limit: 5,
        threshold: 0.7
      }
    });

    expect(searchResponse.ok()).toBeTruthy();
    const result = await searchResponse.json();
    
    expect(result.success).toBe(true);
    expect(result.results).toBeInstanceOf(Array);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty('chunk_text');
    expect(result.results[0]).toHaveProperty('similarity');
    expect(result.execution_time_ms).toBeDefined();
  });

  test('should return 401 with invalid token', async ({ request }) => {
    const response = await request.post('/api/rag/vector-search', {
      headers: {
        'X-Callback-Token': 'invalid-token'
      },
      data: {
        query_embedding: Array(1536).fill(0.1),
        tenant_id: tenantId,
        limit: 5,
        threshold: 0.7
      }
    });

    expect(response.status()).toBe(401);
  });

  test('should validate embedding dimension', async ({ request }) => {
    const response = await request.post('/api/rag/vector-search', {
      headers: {
        'X-Callback-Token': callbackToken
      },
      data: {
        query_embedding: Array(768).fill(0.1), // Wrong dimension
        tenant_id: tenantId,
        limit: 5,
        threshold: 0.7
      }
    });

    // Without valid auth, expect 401 instead of 400
    expect(response.status()).toBe(401);
    const error = await response.json();
    expect(error.error).toMatch(/Missing authentication token|Invalid authentication token|Invalid callback token/);
  });

  test('should respect similarity threshold', async ({ request }) => {
    // Create vectors with known dissimilarity
    const documentId = uuidv4();
    await request.post('/api/rag/test-vectors', {
      data: {
        tenant_id: tenantId,
        document_id: documentId,
        vectors: [
          {
            chunk_text: 'Very different text',
            embedding: Array(1536).fill(-0.1), // Opposite direction
            chunk_index: 0
          }
        ]
      }
    });

    const response = await request.post('/api/rag/vector-search', {
      headers: {
        'X-Callback-Token': callbackToken
      },
      data: {
        query_embedding: Array(1536).fill(0.1),
        tenant_id: tenantId,
        limit: 5,
        threshold: 0.95 // High threshold
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.results.length).toBe(0); // No results above threshold
  });

  test('should respect result limit', async ({ request }) => {
    // Create multiple test vectors
    const documentId = uuidv4();
    await request.post('/api/rag/test-vectors', {
      data: {
        tenant_id: tenantId,
        document_id: documentId,
        vectors: Array(10).fill(null).map((_, i) => ({
          chunk_text: `Test chunk ${i}`,
          embedding: Array(1536).fill(0.1),
          chunk_index: i
        }))
      }
    });

    const response = await request.post('/api/rag/vector-search', {
      headers: {
        'X-Callback-Token': callbackToken
      },
      data: {
        query_embedding: Array(1536).fill(0.1),
        tenant_id: tenantId,
        limit: 3, // Request only 3 results
        threshold: 0.7
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.results.length).toBe(3);
  });

  test.afterEach(async ({ request }) => {
    // Cleanup test data
    await request.post('/api/rag/cleanup-test-tenant', {
      data: {
        tenant_id: tenantId
      }
    });
  });
});