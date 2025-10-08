import keycloak from './keycloak';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}

async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = 'GET', headers = {}, body } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include', // Include cookies for session-based auth
  };

  // Cookie-only authentication: Refresh session cookie when Keycloak token refreshes
  if (keycloak.authenticated && keycloak.token) {
    try {
      const refreshed = await keycloak.updateToken(5); // Refresh if token expires in 5s
      if (refreshed) {
        console.log('API request: Keycloak token refreshed, updating session cookie');
        // Update backend session cookie with new token
        await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: keycloak.token }),
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Failed to refresh token, logging out.', error);
      keycloak.logout();
    }
  }

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Special handling for 401 to trigger re-authentication
    if (response.status === 401) {
      console.error('API request returned 401. Session may have expired.');
    }
    throw new ApiError(
      response.status,
      errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      errorData
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Conversation API
export const conversationApi = {
  getConversations: () =>
    apiRequest<{ conversations: any[] }>('/api/conversations'),

  createConversation: (data: { title: string }) =>
    apiRequest<{ conversation: any }>('/api/conversations', {
      method: 'POST',
      body: data,
    }),

  getConversationMessages: (conversationId: string) =>
    apiRequest<{ messages: any[] }>(`/api/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: string, data: { content: string }) =>
    apiRequest<{ message: any }>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: data,
    }),

  updateConversation: (conversationId: string, data: { title: string }) =>
    apiRequest<{ conversation: any }>(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      body: data,
    }),

  deleteConversation: (conversationId: string) =>
    apiRequest<{ deleted: boolean }>(`/api/conversations/${conversationId}`, {
      method: 'DELETE',
    }),

  getMessage: (messageId: string) =>
    apiRequest<{ message: any }>(`/api/messages/${messageId}`),
};

// Organization API
export const organizationApi = {
  switchOrganization: (organizationId: string) =>
    apiRequest<{ success: boolean }>('/api/organizations/switch', {
      method: 'POST',
      body: { organizationId },
    }),
};

// File API
export const fileApi = {
  // Upload file directly to database
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.error || `Upload failed: ${response.statusText}`,
        errorData
      );
    }

    return response.json();
  },

  // Create text content
  createContent: (data: { content: string; filename: string; metadata?: any }) =>
    apiRequest<{ document: any }>('/api/files/content', {
      method: 'POST',
      body: data,
    }),

  // Download file directly from database
  downloadFile: async (documentId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/files/${documentId}/download`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.error || `Download failed: ${response.statusText}`,
        errorData
      );
    }

    return response;
  },

  // List documents
  listDocuments: () =>
    apiRequest<{ documents: any[]; total: number; limit: number; offset: number }>('/api/files'),

  // Delete document
  deleteDocument: (documentId: string) =>
    apiRequest<{ deleted: boolean }>(`/api/files/${documentId}`, {
      method: 'DELETE',
    }),
};

// Data Sources API
export const dataSourcesApi = {
  // List all data sources
  list: () =>
    apiRequest<{ data: import('../types/dataSource').DataSourceConnection[] }>('/api/data-sources'),

  // Get single data source by ID
  get: (id: string) =>
    apiRequest<{ data: import('../types/dataSource').DataSourceConnection }>(`/api/data-sources/${id}`),

  // Seed default data sources (idempotent)
  seed: () =>
    apiRequest<import('../types/dataSource').SeedDataSourcesResponse>('/api/data-sources/seed', {
      method: 'POST',
    }),

  // Update data source
  update: (id: string, data: import('../types/dataSource').UpdateDataSourceRequest) =>
    apiRequest<{ data: import('../types/dataSource').DataSourceConnection }>(`/api/data-sources/${id}`, {
      method: 'PUT',
      body: data,
    }),

  // Verify credentials (async - result via SSE)
  verify: (id: string, payload: import('../types/dataSource').VerifyDataSourceRequest) =>
    apiRequest<import('../types/dataSource').VerifyDataSourceResponse>(`/api/data-sources/${id}/verify`, {
      method: 'POST',
      body: payload,
    }),

  // Trigger sync
  sync: (id: string) =>
    apiRequest<import('../types/dataSource').TriggerSyncResponse>(`/api/data-sources/${id}/sync`, {
      method: 'POST',
    }),
};

export { ApiError };