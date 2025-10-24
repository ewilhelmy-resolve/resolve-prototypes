/**
 * CollapsibleListCitations - Default collapsible list variant (baseline)
 *
 * This variant wraps the existing ai-elements Sources component to maintain
 * the current UX as the baseline for A/B testing.
 *
 * Features:
 * - Click trigger to expand/collapse sources
 * - List of clickable source links
 * - Accessible with ARIA attributes
 * - Automatically fetches document titles from blob_id using TanStack Query
 * - Opens modal with full document content on click
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sources,
  SourcesContent,
  SourcesTrigger,
  Source,
} from '@/components/ai-elements/sources'
import { Response } from '@/components/ai-elements/response'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Streamdown } from 'streamdown'
import { useDocumentMetadata, documentMetadataKeys } from '@/hooks/api/useDocumentMetadata'
import { useQueryClient } from '@tanstack/react-query'
import type { CitationsProps } from '../Citations'

/**
 * SourceItem - Individual source item with metadata fetching
 * Uses TanStack Query to fetch document metadata for blob_id sources
 */
function SourceItem({
  source,
  index,
  messageId,
  onSourceClick,
  onValidityChange,
}: {
  source: CitationsProps['sources'][0]
  index: number
  messageId?: string
  onSourceClick: (source: CitationsProps['sources'][0], e: React.MouseEvent) => void
  onValidityChange?: (index: number, isValid: boolean) => void
}) {
  // Fetch document metadata if source has blob_id but no title
  const { data: metadata, isError, isLoading } = useDocumentMetadata(
    source.blob_id && !source.title ? source.blob_id : undefined
  )

  // Notify parent about validity changes
  useEffect(() => {
    if (onValidityChange) {
      if (isError) {
        // Source failed to load
        onValidityChange(index, false)
      } else if (!isLoading && (metadata || source.title)) {
        // Source loaded successfully
        onValidityChange(index, true)
      }
    }
  }, [isError, isLoading, metadata, source.title, index, onValidityChange])

  // If metadata fetch failed, hide this citation and log warning
  if (isError) {
    console.warn('Citation source not found:', {
      blob_id: source.blob_id,
      messageId,
      index,
    })
    return null
  }

  // Get display title - prefer fetched metadata, then source.title, then loading state
  const displayTitle = metadata?.filename || source.title || (isLoading ? 'Loading...' : undefined)

  // If no title can be determined (shouldn't happen after loading), hide the citation
  if (!displayTitle) {
    console.warn('Citation source has no title:', {
      blob_id: source.blob_id,
      messageId,
      index,
    })
    return null
  }

  return (
    <div key={`${messageId}-${index}`} className="space-y-2">
      <Source
        href={source.url || '#'}
        title={displayTitle}
        onClick={(e: React.MouseEvent) => onSourceClick(source, e)}
      />
      {source.content && (
        <div className="pl-6 prose prose-sm dark:prose-invert max-w-none">
          <Response>{source.content}</Response>
        </div>
      )}
    </div>
  )
}

/**
 * CollapsibleListCitations - Collapsible list implementation (baseline)
 *
 * Wraps the existing ai-elements Sources component for consistency
 * with the current chat implementation.
 *
 * @example
 * ```tsx
 * <CollapsibleListCitations
 *   sources={[
 *     { blob_id: 'abc-123' },
 *     { blob_id: 'def-456' }
 *   ]}
 *   messageId="msg-123"
 * />
 * ```
 */
export function CollapsibleListCitations({
  sources,
  className,
  messageId,
}: CitationsProps) {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null)
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)

  // Track which sources are valid (successfully loaded)
  const [validSources, setValidSources] = useState<Set<number>>(new Set())

  // Callback for SourceItem to report validity
  const handleValidityChange = useCallback((index: number, isValid: boolean) => {
    setValidSources(prev => {
      const next = new Set(prev)
      if (isValid) {
        next.add(index)
      } else {
        next.delete(index)
      }
      return next
    })
  }, [])

  // Handle "View full document" click
  const handleSourceClick = async (source: typeof sources[0], e: React.MouseEvent) => {
    e.preventDefault()

    // If source has URL and no blob_id, open in new tab
    if (source.url && !source.blob_id) {
      window.open(source.url, '_blank', 'noopener,noreferrer')
      return
    }

    // If source has blob_id, load document in modal
    if (!source.blob_id) return

    setIsLoadingDocument(true)
    setModalOpen(true)

    // Get cached metadata or fetch it
    const cachedMetadata = queryClient.getQueryData(documentMetadataKeys.detail(source.blob_id))
    const displayTitle = (cachedMetadata as any)?.filename || source.title || 'Document'

    try {
      // Fetch/use cached metadata
      const metadata = await queryClient.ensureQueryData({
        queryKey: documentMetadataKeys.detail(source.blob_id),
        queryFn: async () => {
          const { fileApi } = await import('@/services/api')
          return await fileApi.getDocumentMetadata(source.blob_id!)
        },
      })

      const content = metadata.metadata?.content || 'Document content is being processed. Please try again later.'

      setModalContent({
        title: metadata.filename,
        content,
      })
    } catch (error) {
      console.error('Error loading document:', error)
      setModalContent({
        title: displayTitle,
        content: 'Error loading document. Please try again.',
      })
    } finally {
      setIsLoadingDocument(false)
    }

    // Audit logging
    console.log('Full document requested:', {
      messageId,
      sourceTitle: displayTitle,
      blobId: source.blob_id,
      timestamp: new Date().toISOString(),
    })
  }

  // Don't render anything if no valid sources (all phantom)
  if (validSources.size === 0 && sources.length > 0) {
    // Still render the source items to trigger validity checks, but hide the container
    return (
      <div style={{ display: 'none' }}>
        {sources.map((source, index) => (
          <SourceItem
            key={`${messageId}-${index}`}
            source={source}
            index={index}
            messageId={messageId}
            onSourceClick={handleSourceClick}
            onValidityChange={handleValidityChange}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <Sources className={className} data-message-id={messageId}>
        <SourcesTrigger count={validSources.size} />
        <SourcesContent>
          {sources.map((source, index) => (
            <SourceItem
              key={`${messageId}-${index}`}
              source={source}
              index={index}
              messageId={messageId}
              onSourceClick={handleSourceClick}
              onValidityChange={handleValidityChange}
            />
          ))}
        </SourcesContent>
      </Sources>

      {/* Modal for full document view */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalContent?.title || 'Document'}</DialogTitle>
            <DialogDescription>
              Full document content
            </DialogDescription>
          </DialogHeader>
          <div className="prose dark:prose-invert max-w-none">
            {isLoadingDocument ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : modalContent?.content ? (
              <Streamdown>{modalContent.content}</Streamdown>
            ) : (
              <p className="text-muted-foreground">No content available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
