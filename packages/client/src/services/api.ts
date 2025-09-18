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

  if (keycloak.authenticated && keycloak.token) {
    try {
      const refreshed = await keycloak.updateToken(5); // Refresh if token expires in 5s
      if (refreshed) {
        console.log('API request: Token was refreshed');
      }
    } catch {
      console.error('Failed to refresh token, logging out.');
      keycloak.logout();
    }
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${keycloak.token}`,
    };
  }

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Special handling for 401 to trigger re-authentication
    if (response.status === 401) {
      console.error('API request returned 401. This may trigger a logout.');
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

export { ApiError };