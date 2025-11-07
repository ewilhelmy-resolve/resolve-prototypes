/**
 * SourceLink - Custom link component for internal source links
 *
 * Intercepts links with format: [Link text](/internal/blob_metadata/<id>)
 * Renders as Badge with modal for internal sources, regular link for others.
 *
 * Features:
 * - Badge style (matches inline citations)
 * - Click opens modal with full document content
 * - TanStack Query caching for metadata
 * - WCAG 2.1 AA accessible
 * - Preserves markdown formatting in surrounding text
 */

'use client'

import { type AnchorHTMLAttributes, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Streamdown } from 'streamdown'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { documentMetadataKeys } from '@/hooks/api/useDocumentMetadata'
import { cn } from '@/lib/utils'

interface SourceLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string
  children?: React.ReactNode
}

/**
 * Extract blob_metadata_id from internal URL
 * Format: /internal/blob_metadata/<id>
 */
function extractBlobMetadataId(url: string): string | null {
  const internalPattern = /^\/internal\/blob_metadata\/([a-zA-F0-9-]+)$/i
  const match = url.match(internalPattern)
  return match ? match[1] : null
}

/**
 * SourceLink - Renders internal source links as badges, regular links as links
 *
 * @example
 * ```markdown
 * According to [recent research](/internal/blob_metadata/abc-123), AI has improved.
 * See also [external link](https://example.com).
 * ```
 */
export function SourceLink({ href, children, className, ...props }: SourceLinkProps) {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState<{
    title: string
    content: string
  } | null>(null)
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)

  // Check if this is an internal source link
  const blobMetadataId = href ? extractBlobMetadataId(href) : null

  // If not an internal source link, render as regular link
  if (!blobMetadataId) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    )
  }

  // Handle click for internal source links
  const handleClick = async () => {
    // Open modal immediately for better UX
    setModalOpen(true)
    setIsLoadingDocument(true)

    try {
      // Fetch document metadata with TanStack Query caching
      const metadata = await queryClient.ensureQueryData({
        queryKey: documentMetadataKeys.detail(blobMetadataId),
        queryFn: async () => {
          const { fileApi } = await import('@/services/api')
          return await fileApi.getDocumentMetadata(blobMetadataId)
        },
      })

      const content =
        metadata.metadata?.content ||
        'Document content is being processed. Please try again later.'

      setModalContent({
        title: metadata.filename,
        content,
      })

      // Audit logging
      console.log('Internal source link clicked:', {
        blobMetadataId,
        filename: metadata.filename,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error loading document:', error)
      setModalContent({
        title: 'Document',
        content: 'Document not available.',
      })
    } finally {
      setIsLoadingDocument(false)
    }
  }

  // Handle keyboard interaction
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  // Render as inline badge (like citations)
  return (
    <>
      <Badge
        variant="secondary"
        className={cn('ml-1 rounded-full cursor-pointer', className)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`View source: ${children}`}
      >
        {children}
      </Badge>

      {/* Modal for full document view */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalContent?.title || 'Document'}</DialogTitle>
            <DialogDescription>Full document content</DialogDescription>
          </DialogHeader>
          <div className="prose dark:prose-invert max-w-none">
            {isLoadingDocument ? (
              <div
                className="flex items-center justify-center py-8"
                role="status"
                aria-live="polite"
              >
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                <span className="sr-only">Loading document...</span>
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
