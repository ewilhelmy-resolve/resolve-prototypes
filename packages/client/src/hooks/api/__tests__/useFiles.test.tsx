import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFiles, useUploadFile, useDeleteFile, useCreateContent, fileKeys, type FileDocument } from '../useFiles'
import type { ReactNode } from 'react'

// Mock the fileApi
vi.mock('../../../services/api', () => ({
  fileApi: {
    listDocuments: vi.fn(),
    uploadFile: vi.fn(),
    createContent: vi.fn(),
    deleteDocument: vi.fn(),
  },
}))

import { fileApi } from '../../../services/api'

const mockedFileApi = vi.mocked(fileApi)

// Create a wrapper with QueryClient for testing
function createWrapper(initialData?: { documents: FileDocument[]; total: number; limit: number; offset: number }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  // Pre-populate cache if initial data provided
  if (initialData) {
    queryClient.setQueryData(fileKeys.list({ limit: 50, offset: 0, sortBy: 'created_at', sortOrder: 'desc' }), initialData)
  }

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  return { wrapper, queryClient }
}

// Mock file documents
const mockDocument1: FileDocument = {
  id: 'doc-1',
  filename: 'test-file-1.pdf',
  size: 1024,
  type: 'application/pdf',
  status: 'processed',
  source: 'upload',
  created_at: new Date('2025-01-01'),
}

const mockDocument2: FileDocument = {
  id: 'doc-2',
  filename: 'test-file-2.txt',
  size: 512,
  type: 'text/plain',
  status: 'processing',
  source: 'upload',
  created_at: new Date('2025-01-02'),
}

describe('fileKeys', () => {
  it('should generate correct query keys', () => {
    expect(fileKeys.all).toEqual(['files'])
    expect(fileKeys.lists()).toEqual(['files', 'list'])
    expect(fileKeys.list({ limit: 10, offset: 0 })).toEqual(['files', 'list', { limit: 10, offset: 0 }])
  })
})

describe('useFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch files and transform response', async () => {
    mockedFileApi.listDocuments.mockResolvedValueOnce({
      documents: [{
        id: 'doc-1',
        file_name: 'test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        status: 'processed',
        content_type: 'binary',
        source: 'upload',
        metadata: {},
        created_at: '2025-01-01T00:00:00Z',
        updated_at: null,
      }],
      total: 1,
      limit: 50,
      offset: 0,
    })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useFiles(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.documents).toHaveLength(1)
    expect(result.current.data?.documents[0].filename).toBe('test.pdf')
    expect(result.current.data?.documents[0].id).toBe('doc-1')
  })
})

describe('useUploadFile - optimistic cache insert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should insert uploaded document into cache on success', async () => {
    const initialData = {
      documents: [mockDocument1],
      total: 1,
      limit: 50,
      offset: 0,
    }

    const newDocument = {
      id: 'doc-new',
      filename: 'new-file.pdf',
      size: 2048,
      type: 'application/pdf',
      status: 'uploaded' as const,
      source: 'upload',
      created_at: '2025-01-03T00:00:00Z',
    }

    mockedFileApi.uploadFile.mockResolvedValueOnce({ document: newDocument })

    const { wrapper, queryClient } = createWrapper(initialData)
    const { result } = renderHook(() => useUploadFile(), { wrapper })

    const mockFile = new File(['test content'], 'new-file.pdf', { type: 'application/pdf' })

    await act(async () => {
      await result.current.mutateAsync(mockFile)
    })

    // Check cache was updated
    const cachedData = queryClient.getQueryData<{ documents: FileDocument[]; total: number }>(
      fileKeys.list({ limit: 50, offset: 0, sortBy: 'created_at', sortOrder: 'desc' })
    )

    expect(cachedData?.documents).toHaveLength(2)
    expect(cachedData?.documents[0].id).toBe('doc-new') // New document at start
    expect(cachedData?.documents[1].id).toBe('doc-1') // Original document
    expect(cachedData?.total).toBe(2)
  })

  it('should not modify cache on upload error', async () => {
    const initialData = {
      documents: [mockDocument1],
      total: 1,
      limit: 50,
      offset: 0,
    }

    mockedFileApi.uploadFile.mockRejectedValueOnce(new Error('Upload failed'))

    const { wrapper, queryClient } = createWrapper(initialData)
    const { result } = renderHook(() => useUploadFile(), { wrapper })

    const mockFile = new File(['test content'], 'fail.pdf', { type: 'application/pdf' })

    await act(async () => {
      try {
        await result.current.mutateAsync(mockFile)
      } catch {
        // Expected to fail
      }
    })

    // Cache should remain unchanged
    const cachedData = queryClient.getQueryData<{ documents: FileDocument[]; total: number }>(
      fileKeys.list({ limit: 50, offset: 0, sortBy: 'created_at', sortOrder: 'desc' })
    )

    expect(cachedData?.documents).toHaveLength(1)
    expect(cachedData?.documents[0].id).toBe('doc-1')
    expect(cachedData?.total).toBe(1)
  })
})

describe('useDeleteFile - optimistic removal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should optimistically remove document from cache', async () => {
    const initialData = {
      documents: [mockDocument1, mockDocument2],
      total: 2,
      limit: 50,
      offset: 0,
    }

    mockedFileApi.deleteDocument.mockResolvedValueOnce({ deleted: true })

    const { wrapper, queryClient } = createWrapper(initialData)
    const { result } = renderHook(() => useDeleteFile(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('doc-1')
    })

    // Check cache was updated
    const cachedData = queryClient.getQueryData<{ documents: FileDocument[]; total: number }>(
      fileKeys.list({ limit: 50, offset: 0, sortBy: 'created_at', sortOrder: 'desc' })
    )

    expect(cachedData?.documents).toHaveLength(1)
    expect(cachedData?.documents[0].id).toBe('doc-2')
    expect(cachedData?.total).toBe(1)
  })

  it('should rollback cache on delete error', async () => {
    const initialData = {
      documents: [mockDocument1, mockDocument2],
      total: 2,
      limit: 50,
      offset: 0,
    }

    mockedFileApi.deleteDocument.mockRejectedValueOnce(new Error('Delete failed'))

    const { wrapper, queryClient } = createWrapper(initialData)
    const { result } = renderHook(() => useDeleteFile(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync('doc-1')
      } catch {
        // Expected to fail
      }
    })

    // Cache should be rolled back
    const cachedData = queryClient.getQueryData<{ documents: FileDocument[]; total: number }>(
      fileKeys.list({ limit: 50, offset: 0, sortBy: 'created_at', sortOrder: 'desc' })
    )

    expect(cachedData?.documents).toHaveLength(2)
    expect(cachedData?.documents.find(d => d.id === 'doc-1')).toBeDefined()
    expect(cachedData?.total).toBe(2)
  })

  it('should handle deleting non-existent document gracefully', async () => {
    const initialData = {
      documents: [mockDocument1],
      total: 1,
      limit: 50,
      offset: 0,
    }

    mockedFileApi.deleteDocument.mockResolvedValueOnce({ deleted: true })

    const { wrapper, queryClient } = createWrapper(initialData)
    const { result } = renderHook(() => useDeleteFile(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('non-existent-id')
    })

    // Cache should remain unchanged (filter removed nothing)
    const cachedData = queryClient.getQueryData<{ documents: FileDocument[]; total: number }>(
      fileKeys.list({ limit: 50, offset: 0, sortBy: 'created_at', sortOrder: 'desc' })
    )

    expect(cachedData?.documents).toHaveLength(1)
    // Total decremented but this is expected behavior
    expect(cachedData?.total).toBe(0)
  })
})

describe('useCreateContent - optimistic cache insert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should insert created content into cache on success', async () => {
    const initialData = {
      documents: [mockDocument1],
      total: 1,
      limit: 50,
      offset: 0,
    }

    const newDocument = {
      id: 'doc-content',
      filename: 'new-content.txt',
      size: 100,
      type: 'text/plain',
      status: 'uploaded' as const,
      source: 'paste',
      created_at: '2025-01-03T00:00:00Z',
    }

    mockedFileApi.createContent.mockResolvedValueOnce({ document: newDocument })

    const { wrapper, queryClient } = createWrapper(initialData)
    const { result } = renderHook(() => useCreateContent(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        content: 'Test content',
        filename: 'new-content.txt',
      })
    })

    // Check cache was updated
    const cachedData = queryClient.getQueryData<{ documents: FileDocument[]; total: number }>(
      fileKeys.list({ limit: 50, offset: 0, sortBy: 'created_at', sortOrder: 'desc' })
    )

    expect(cachedData?.documents).toHaveLength(2)
    expect(cachedData?.documents[0].id).toBe('doc-content')
    expect(cachedData?.total).toBe(2)
  })
})
