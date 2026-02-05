import { useQuery } from '@tanstack/react-query'
import { fileApi } from '@/services/api'

/**
 * Document metadata interface
 */
export interface DocumentMetadata {
  id: string
  filename: string
  file_size: number
  mime_type: string
  created_at: string
  updated_at: string
  metadata: {
    content?: string
    [key: string]: any
  }
}

// Query keys for document metadata
export const documentMetadataKeys = {
  all: ['documentMetadata'] as const,
  detail: (id: string) => [...documentMetadataKeys.all, id] as const,
}

/**
 * Hook to fetch document metadata for a single document
 * Used by citation components to fetch document titles and content
 */
export function useDocumentMetadata(documentId: string | undefined) {
  return useQuery({
    queryKey: documentMetadataKeys.detail(documentId ?? ''),
    queryFn: async () => {
      if (!documentId) {
        throw new Error('Document ID is required')
      }
      return await fileApi.getDocumentMetadata(documentId)
    },
    enabled: !!documentId, // Only run query if documentId is provided
    staleTime: 1000 * 60 * 10, // 10 minutes - metadata doesn't change often
  })
}
