import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fileApi } from '../../services/api'

export interface FileDocument {
  id: string
  filename: string
  size: number
  type: string
  status: 'processing' | 'processed' | 'failed' | 'uploaded'
  content_type?: 'text' | 'binary' | 'unknown'
  metadata?: {
    error?: string
    [key: string]: any
  }
  created_at?: Date
  updated_at?: Date
}

// Query keys
export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (filters: string) => [...fileKeys.lists(), { filters }] as const,
}

// List user's documents
export function useFiles() {
  return useQuery({
    queryKey: fileKeys.lists(),
    queryFn: async () => {
      const response = await fileApi.listDocuments()

      const documents: FileDocument[] = response.documents.map((doc: any) => ({
        id: doc.id,
        filename: doc.file_name,
        size: doc.file_size,
        type: doc.mime_type,
        status: doc.status,
        content_type: doc.content_type,
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
    staleTime: 1000 * 60 * 5, // 5 minutes
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
          created_at: new Date(response.document.created_at),
        } as FileDocument
      }
    },
    onSuccess: () => {
      // Invalidate files list to refresh it
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
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
          created_at: new Date(response.document.created_at),
        } as FileDocument
      }
    },
    onSuccess: () => {
      // Invalidate files list to refresh it
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
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
    onSuccess: () => {
      // Invalidate files list to refresh it
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
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
      // Invalidate files list to refresh it
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
    },
  })
}