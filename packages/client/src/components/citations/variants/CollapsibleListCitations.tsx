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
 * - Automatically fetches document titles from blob_id
 * - Opens modal with full document content on click
 */

'use client'

import { useState, useEffect, useRef } from 'react'
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
import { fileApi } from '@/services/api'
import { Streamdown } from 'streamdown'
import type { CitationsProps } from '../Citations'

/**
 * Fetch document metadata (title/filename) for a given blob_id
 */
async function fetchDocumentTitle(blob_id: string): Promise<string> {
  try {
    console.log('[CollapsibleListCitations] Fetching metadata for blob_id:', blob_id)
    const metadata = await fileApi.getDocumentMetadata(blob_id)
    console.log('[CollapsibleListCitations] Received metadata:', metadata)
    return metadata.filename
  } catch (error) {
    console.error('[CollapsibleListCitations] Error fetching document metadata for blob_id:', blob_id, error)
    return 'Unknown Document' // Fallback title
  }
}

/**
 * Load document content from API using blob_metadata ID
 * Fetches processed content from metadata.content instead of raw blob
 */
async function loadDocument(blob_id: string): Promise<string> {
  try {
    console.log('[CollapsibleListCitations] Loading document metadata for blob_id:', blob_id)
    // Fetch metadata with processed content
    const metadata = await fileApi.getDocumentMetadata(blob_id)
    console.log('[CollapsibleListCitations] Received metadata with content length:', metadata.metadata?.content?.length || 0)

    // Extract processed content from metadata
    const content = metadata.metadata?.content
    if (!content) {
      console.warn('[CollapsibleListCitations] No processed content available in metadata for blob_id:', blob_id)
      return 'Document content is being processed. Please try again later.'
    }

    return content
  } catch (error) {
    console.error('[CollapsibleListCitations] Error loading document metadata:', error)
    throw error
  }
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
  const [documentTitles, setDocumentTitles] = useState<Record<string, string>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null)
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)
  const fetchedBlobIdsRef = useRef<Set<string>>(new Set())

  // Fetch document titles for sources with blob_id (only once per blob_id)
  useEffect(() => {
    const fetchTitles = async () => {
      // Filter out sources that already have titles or have been fetched
      const sourcesToFetch = sources.filter(
        source =>
          source.blob_id &&
          !source.title &&
          !documentTitles[source.blob_id] &&
          !fetchedBlobIdsRef.current.has(source.blob_id)
      )

      if (sourcesToFetch.length === 0) return

      // Mark these blob_ids as being fetched
      sourcesToFetch.forEach(source => {
        if (source.blob_id) {
          fetchedBlobIdsRef.current.add(source.blob_id)
        }
      })

      const titlePromises = sourcesToFetch.map(async (source) => {
        const title = await fetchDocumentTitle(source.blob_id!)
        return { blob_id: source.blob_id!, title }
      })

      const titles = await Promise.all(titlePromises)
      const titleMap = titles.reduce((acc, { blob_id, title }) => {
        acc[blob_id] = title
        return acc
      }, {} as Record<string, string>)

      setDocumentTitles(prev => ({ ...prev, ...titleMap }))
    }

    fetchTitles()
  }, [sources, documentTitles])

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

    // Get the display title (fetched or provided)
    const displayTitle = documentTitles[source.blob_id] || source.title || 'Document'

    try {
      const content = await loadDocument(source.blob_id)
      setModalContent({
        title: displayTitle,
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

  return (
    <>
      <Sources className={className} data-message-id={messageId}>
        <SourcesTrigger count={sources.length} />
        <SourcesContent>
          {sources.map((source, index) => {
            // Get the display title - prefer fetched title from blob_id, then fallback to source.title
            const displayTitle = source.blob_id && documentTitles[source.blob_id]
              ? documentTitles[source.blob_id]
              : source.title || 'Loading...'

            return (
              <div key={`${messageId}-${index}`} className="space-y-2">
                <Source
                  href={source.url || '#'}
                  title={displayTitle}
                  onClick={(e: React.MouseEvent) => handleSourceClick(source, e)}
                />
                {source.content && (
                  <div className="pl-6 prose prose-sm dark:prose-invert max-w-none">
                    <Response>{source.content}</Response>
                  </div>
                )}
              </div>
            )
          })}
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
