import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fileApi } from '../../services/api'

export interface FileDocument {
  id: string
  filename: string
  size: number
  type: string
  status: 'processing' | 'processed' | 'failed' | 'uploaded'
  content_type?: 'text' | 'binary' | 'unknown'
  source?: string
  metadata?: {
    error?: string
    [key: string]: any
  }
  created_at?: Date
  updated_at?: Date
}

export interface FilesQueryParams {
  limit?: number
  offset?: number
  sortBy?: 'filename' | 'size' | 'type' | 'status' | 'source' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  search?: string
  status?: string
  source?: string
}

// Query keys
export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (params: FilesQueryParams) => [...fileKeys.lists(), params] as const,
}

// List user's documents
export function useFiles(params: FilesQueryParams = {}) {
  const { limit = 50, offset = 0, sortBy = 'created_at', sortOrder = 'desc', search, status, source } = params

  return useQuery({
    queryKey: fileKeys.list({ limit, offset, sortBy, sortOrder, search, status, source }),
    queryFn: async () => {
      const response = await fileApi.listDocuments(limit, offset, sortBy, sortOrder, search, status, source)

      const documents: FileDocument[] = response.documents.map((doc: any) => ({
        id: doc.id,
        filename: doc.file_name,
        size: doc.file_size,
        type: doc.mime_type,
        status: doc.status,
        content_type: doc.content_type,
        source: doc.source,
        metadata: doc.metadata,
        created_at: new Date(doc.created_at),
        updated_at: doc.updated_at ? new Date(doc.updated_at) : undefined,
      }))

      return {
        documents,
        total: response.total,
        limit: response.limit,
        offset: response.offset
      }
    },
    staleTime: 1000 * 30, // 30 seconds - shorter for better UX after mutations
  })
}

// Upload file mutation
export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const response = await fileApi.uploadFile(file)

      return {
        document: {
          id: response.document.id,
          filename: response.document.filename,
          size: response.document.size,
          type: response.document.type,
          status: response.document.status,
          source: response.document.source,
          created_at: new Date(response.document.created_at),
        } as FileDocument
      }
    },
    onSuccess: (data) => {
      // Insert new document into cache immediately (no refetch)
      queryClient.setQueriesData<{ documents: FileDocument[]; total: number; limit: number; offset: number }>(
        { queryKey: fileKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            documents: [data.document, ...oldData.documents],
            total: oldData.total + 1,
          }
        }
      )
    },
  })
}

// Create text content mutation
export function useCreateContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { content: string; filename: string; metadata?: any }) => {
      const response = await fileApi.createContent(data)

      return {
        document: {
          id: response.document.id,
          filename: response.document.filename,
          size: response.document.size,
          type: response.document.type,
          status: response.document.status,
          source: response.document.source,
          created_at: new Date(response.document.created_at),
        } as FileDocument
      }
    },
    onSuccess: (data) => {
      // Insert new document into cache immediately (no refetch)
      queryClient.setQueriesData<{ documents: FileDocument[]; total: number; limit: number; offset: number }>(
        { queryKey: fileKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            documents: [data.document, ...oldData.documents],
            total: oldData.total + 1,
          }
        }
      )
    },
  })
}

// Download file helper
export function useDownloadFile() {
  return useMutation({
    mutationFn: async ({ documentId, filename }: { documentId: string; filename: string }) => {
      const response = await fileApi.downloadFile(documentId)

      // Create a blob from the response and trigger download
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      URL.revokeObjectURL(url)

      return response
    },
  })
}

// Delete file mutation
export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fileApi.deleteDocument(documentId)
      return response
    },
    onMutate: async (documentId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: fileKeys.lists() })

      // Snapshot for rollback
      const previousQueries = queryClient.getQueriesData<{ documents: FileDocument[]; total: number; limit: number; offset: number }>({ queryKey: fileKeys.lists() })

      // Optimistically remove from all list queries
      queryClient.setQueriesData<{ documents: FileDocument[]; total: number; limit: number; offset: number }>(
        { queryKey: fileKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            documents: oldData.documents.filter((doc) => doc.id !== documentId),
            total: Math.max(0, oldData.total - 1),
          }
        }
      )

      return { previousQueries }
    },
    onError: (_err, _documentId, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
  })
}

// Reprocess file mutation
export function useReprocessFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fileApi.reprocessDocument(documentId)
      return response
    },
    onSuccess: () => {
      // Invalidate files list and force immediate refetch
      queryClient.invalidateQueries({ queryKey: fileKeys.lists(), refetchType: 'active' })
    },
  })
}