/**
 * HoverCardCitations - Hover badge with carousel variant for citation display
 *
 * This variant uses hover cards with badges and carousels for inline citation viewing.
 * Based on the existing inline-citation components.
 *
 * Features:
 * - Hover over badge to see sources
 * - Carousel navigation for multiple sources
 * - Inline viewing experience
 * - No click required (hover interaction)
 */

'use client'

import { useState } from 'react'
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
} from '@/components/ai-elements/inline-citation'
import { Response } from '@/components/ai-elements/response'
import { cn } from '@/lib/utils'
import type { CitationsProps, CitationSource } from '../Citations'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Streamdown } from 'streamdown'
import { ExternalLinkIcon } from 'lucide-react'

/**
 * Get document ID from source (supports both old and new formats)
 * Prefers blob_metadata_id (new), falls back to blob_id (legacy)
 */
function getDocumentId(source: CitationSource): string | undefined {
  return source.blob_metadata_id || source.blob_id
}

/**
 * HoverCardCitations - Hover badge with carousel implementation
 *
 * Uses inline citation components for a hover-based viewing experience.
 *
 * @example
 * ```tsx
 * <HoverCardCitations
 *   sources={[
 *     { url: 'https://docs.example.com', title: 'Documentation' },
 *     { url: 'https://github.com/example', title: 'GitHub' }
 *   ]}
 *   messageId="msg-123"
 * />
 * ```
 */
export function HoverCardCitations({
  sources,
  className,
  messageId,
}: CitationsProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null)
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)

  // Handle "View full document" click
  const handleViewFullDocument = async (source: CitationSource) => {
    const documentId = getDocumentId(source)
    if (!documentId) return

    setIsLoadingDocument(true)
    setModalOpen(true)

    const displayTitle = source.title || 'Document'

    try {
      const { fileApi } = await import('@/services/api')
      const metadata = await fileApi.getDocumentMetadata(documentId)
      const content = metadata.metadata?.content || 'Document content is being processed. Please try again later.'

      setModalContent({
        title: metadata.filename || displayTitle,
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
      sourceTitle: source.title,
      documentId: documentId,
      blob_metadata_id: source.blob_metadata_id,
      blob_id: source.blob_id,
      variant: 'hover-card',
      timestamp: new Date().toISOString(),
    })
  }

  // Extract URLs for the badge trigger
  const sourceUrls = sources.map(source => source.url).filter((url): url is string => Boolean(url))

  return (
    <>
      <span
        className={cn('not-prose inline-flex items-center gap-1', className)}
        data-message-id={messageId}
      >
        <InlineCitation>
          <InlineCitationCard>
            <InlineCitationCardTrigger sources={sourceUrls} className="cursor-pointer" />

            <InlineCitationCardBody>
            {sources.length === 1 ? (
              // Single source - no carousel needed
              <div className="p-4 space-y-3">
                <InlineCitationSource
                  title={sources[0].title}
                  url={sources[0].url}
                />

                {/* Show snippet if present, otherwise show URL */}
                {sources[0].snippet ? (
                  <blockquote className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3 py-1">
                    {sources[0].snippet}
                  </blockquote>
                ) : (
                  <p className="text-xs text-muted-foreground break-all">
                    {sources[0].url}
                  </p>
                )}

                {sources[0].content && (
                  <div className="prose prose-xs dark:prose-invert max-w-none border-t border-border pt-3">
                    <Response>{sources[0].content}</Response>
                  </div>
                )}

                {/* Action links - show only one link per source */}
                <div className="flex flex-col gap-2 pt-2">
                  {sources[0].url ? (
                    <a
                      href={sources[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      onClick={() => {
                        console.log('Citation clicked:', {
                          messageId,
                          sourceUrl: sources[0].url,
                          sourceTitle: sources[0].title,
                          variant: 'hover-card',
                          timestamp: new Date().toISOString(),
                        })
                      }}
                    >
                      View source
                      <ExternalLinkIcon className="h-3 w-3" />
                    </a>
                  ) : getDocumentId(sources[0]) ? (
                    <button
                      type="button"
                      onClick={() => handleViewFullDocument(sources[0])}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 text-left"
                    >
                      View full document →
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              // Multiple sources - use carousel
              <InlineCitationCarousel>
                <InlineCitationCarouselHeader>
                  <InlineCitationCarouselPrev />
                  <InlineCitationCarouselIndex />
                  <InlineCitationCarouselNext />
                </InlineCitationCarouselHeader>

                <InlineCitationCarouselContent>
                  {sources.map((source, index) => (
                    <InlineCitationCarouselItem key={`${messageId}-${index}`}>
                      <InlineCitationSource
                        title={source.title}
                        url={source.url}
                      />

                      {/* Show snippet if present, otherwise show URL */}
                      {source.snippet ? (
                        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3 py-1 mt-2">
                          {source.snippet}
                        </blockquote>
                      ) : (
                        <p className="text-xs text-muted-foreground break-all mt-2">
                          {source.url}
                        </p>
                      )}

                      {source.content && (
                        <div className="prose prose-xs dark:prose-invert max-w-none border-t border-border pt-3 mt-3">
                          <Response>{source.content}</Response>
                        </div>
                      )}

                      {/* Action links - show only one link per source */}
                      <div className="flex flex-col gap-2 mt-2">
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            onClick={() => {
                              // Audit logging for citation clicks
                              console.log('Citation clicked:', {
                                messageId,
                                sourceUrl: source.url,
                                sourceTitle: source.title,
                                variant: 'hover-card',
                                timestamp: new Date().toISOString(),
                              })
                            }}
                          >
                            View source
                            <ExternalLinkIcon className="h-3 w-3" />
                          </a>
                        ) : getDocumentId(source) ? (
                          <button
                            type="button"
                            onClick={() => handleViewFullDocument(source)}
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 text-left"
                          >
                            View full document →
                          </button>
                        ) : null}
                      </div>
                    </InlineCitationCarouselItem>
                  ))}
                </InlineCitationCarouselContent>
              </InlineCitationCarousel>
            )}
            </InlineCitationCardBody>
          </InlineCitationCard>
        </InlineCitation>
      </span>

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
