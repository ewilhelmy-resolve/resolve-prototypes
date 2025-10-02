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
import type { CitationsProps } from '../Citations'

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

  return (
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
          className="mt-6 space-y-3 overflow-y-auto pr-2"
          style={{ maxHeight: 'calc(100vh - 180px)' }}
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
                    variant: 'right-panel',
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
      </SheetContent>
    </Sheet>
    </div>
  )
}
