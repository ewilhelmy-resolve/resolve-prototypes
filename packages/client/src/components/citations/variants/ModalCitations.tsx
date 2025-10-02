/**
 * ModalCitations - Modal overlay variant for citation display
 *
 * This variant opens sources in a centered modal dialog overlay.
 *
 * Features:
 * - Click trigger to open modal
 * - Full modal overlay with backdrop
 * - List of clickable source links in modal
 * - Accessible with keyboard (ESC to close)
 * - Backdrop click to close
 */

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BookIcon, ExternalLinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CitationsProps } from '../Citations'

/**
 * ModalCitations - Modal overlay implementation
 *
 * Opens sources in a centered modal dialog for a focused viewing experience.
 *
 * @example
 * ```tsx
 * <ModalCitations
 *   sources={[
 *     { url: 'https://docs.example.com', title: 'Documentation' },
 *     { url: 'https://github.com/example', title: 'GitHub' }
 *   ]}
 *   messageId="msg-123"
 * />
 * ```
 */
export function ModalCitations({
  sources,
  className,
  messageId,
}: CitationsProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn('not-prose mb-4', className)}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
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
        </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sources</DialogTitle>
          <DialogDescription>
            {sources.length} reference{sources.length !== 1 ? 's' : ''} used in this response
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto space-y-3 pr-2"
          role="list"
          aria-label="Citation sources"
        >
          {sources.map((source, index) => (
            <div
              key={`${messageId}-${index}`}
              className="group rounded-lg border border-border p-4 transition-colors hover:bg-accent"
              role="listitem"
            >
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-sm"
                onClick={() => {
                  // Audit logging for citation clicks
                  console.log('Citation clicked:', {
                    messageId,
                    sourceUrl: source.url,
                    sourceTitle: source.title,
                    variant: 'modal',
                    timestamp: new Date().toISOString(),
                  })
                }}
              >
                <BookIcon
                  className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {source.title}
                  </div>
                  <div className="text-muted-foreground text-xs mt-1 break-all">
                    {source.url}
                  </div>
                </div>
                <ExternalLinkIcon
                  className="h-3 w-3 mt-1 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                />
              </a>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
    </div>
  )
}
