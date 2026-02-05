/**
 * RightPanelCitations - Right side panel variant for citation display
 *
 * This variant opens sources in a side panel that slides in from the right.
 *
 * Features:
 * - Click trigger to open side panel
 * - Side-by-side viewing experience
 * - List of clickable source links in panel
 * - Accessible with keyboard (ESC to close)
 * - Backdrop click to close
 */

'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { BookIcon, ExternalLinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Response } from '@/components/ai-elements/response'
import type { CitationsProps, CitationSource } from '../Citations'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Streamdown } from 'streamdown'

/**
 * Get document ID from source (supports both old and new formats)
 * Prefers blob_metadata_id (new), falls back to blob_id (legacy)
 */
function getDocumentId(source: CitationSource): string | undefined {
  return source.blob_metadata_id || source.blob_id
}

/**
 * RightPanelCitations - Right side panel implementation
 *
 * Opens sources in a side panel for side-by-side viewing.
 *
 * @example
 * ```tsx
 * <RightPanelCitations
 *   sources={[
 *     { url: 'https://docs.example.com', title: 'Documentation' },
 *     { url: 'https://github.com/example', title: 'GitHub' }
 *   ]}
 *   messageId="msg-123"
 * />
 * ```
 */
export function RightPanelCitations({
  sources,
  className,
  messageId,
}: CitationsProps) {
  const [open, setOpen] = useState(false)
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
      variant: 'right-panel',
      timestamp: new Date().toISOString(),
    })
  }

  return (
    <>
    <div className={cn('not-prose mb-4', className)}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-xs font-medium flex items-center gap-2"
            data-message-id={messageId}
            aria-label={`View ${sources.length} source${sources.length !== 1 ? 's' : ''}`}
          >
            <BookIcon className="h-4 w-4" aria-hidden="true" />
            <span>
              Used {sources.length} source{sources.length !== 1 ? 's' : ''}
            </span>
          </Button>
        </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Sources</SheetTitle>
          <SheetDescription>
            {sources.length} reference{sources.length !== 1 ? 's' : ''} used in this response
          </SheetDescription>
        </SheetHeader>

        <div
          className="mt-6 space-y-4 overflow-y-auto pr-2"
          style={{ maxHeight: 'calc(100vh - 180px)' }}
          role="list"
          aria-label="Citation sources"
        >
          {sources.map((source, index) => (
            <div
              key={`${messageId}-${index}`}
              className="space-y-3"
              role="listitem"
            >
              {source.content ? (
                // If content exists, show it as the main content
                <>
                  <div className="prose prose-sm dark:prose-invert max-w-none px-4">
                    <Response>{source.content}</Response>
                  </div>
                  <div className="pt-3 border-t border-border px-4">
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        onClick={() => {
                          console.log('Citation clicked:', {
                            messageId,
                            sourceUrl: source.url,
                            sourceTitle: source.title,
                            variant: 'right-panel',
                            timestamp: new Date().toISOString(),
                          })
                        }}
                      >
                        View source: {source.title}
                        <ExternalLinkIcon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                      </a>
                    ) : getDocumentId(source) ? (
                      <button
                        type="button"
                        onClick={() => handleViewFullDocument(source)}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View full document: {source.title} →
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                // No content - show source card with link or button
                <div className="group rounded-lg border border-border p-4 transition-colors hover:bg-accent">
                  <div className="flex items-start gap-3">
                    <BookIcon
                      className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="font-medium text-foreground">
                        {source.title}
                      </div>

                      {/* Show snippet if present */}
                      {source.snippet && (
                        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3 py-1">
                          {source.snippet}
                        </blockquote>
                      )}

                      {/* Show URL or blob indicator */}
                      {source.url && (
                        <div className="text-muted-foreground text-xs break-all">
                          {source.url}
                        </div>
                      )}

                      {/* Action link: URL or blob_id */}
                      <div className="pt-2">
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            onClick={() => {
                              console.log('Citation clicked:', {
                                messageId,
                                sourceUrl: source.url,
                                sourceTitle: source.title,
                                variant: 'right-panel',
                                timestamp: new Date().toISOString(),
                              })
                            }}
                          >
                            View source
                            <ExternalLinkIcon className="h-3 w-3" aria-hidden="true" />
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
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
    </div>

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
