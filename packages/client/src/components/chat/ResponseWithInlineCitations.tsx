/**
 * ResponseWithInlineCitations - Response component with inline citation support
 *
 * This component enhances the standard Response component by parsing citation
 * markers in the text and replacing them with interactive inline citations.
 *
 * Supported citation formats:
 * - [1], [2], [3] - Numbered citations
 * - [source], [doc] - Named citations
 *
 * Example message:
 * "According to recent studies [1], AI has shown remarkable progress [2]."
 */

'use client'

import { Response } from '@/components/ai-elements/response'
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
} from '@/components/ai-elements/inline-citation'
import type { CitationSource } from '@/components/citations/Citations'
import { cn } from '@/lib/utils'

export interface ResponseWithInlineCitationsProps {
  /** Message text with citation markers */
  children: string
  /** Array of citation sources */
  sources?: CitationSource[]
  /** Optional CSS class */
  className?: string
  /** Message ID for tracking */
  messageId?: string
}

/**
 * Parse text to find citation markers like [1], [2], etc.
 */
function parseCitationMarkers(text: string): {
  segments: Array<{ type: 'text' | 'citation'; content: string; index?: number }>
} {
  // Match citation markers: [1], [2], [3], etc.
  const citationRegex = /\[(\d+)\]/g
  const segments: Array<{ type: 'text' | 'citation'; content: string; index?: number }> = []

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      })
    }

    // Add citation marker
    segments.push({
      type: 'citation',
      content: match[0], // The full match like [1]
      index: parseInt(match[1], 10), // The number inside like 1
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    })
  }

  return { segments }
}

/**
 * ResponseWithInlineCitations - Render message text with interactive inline citations
 *
 * @example
 * ```tsx
 * <ResponseWithInlineCitations
 *   sources={[
 *     { url: 'https://example.com', title: 'Example Source' }
 *   ]}
 * >
 *   According to recent studies [1], AI has improved significantly.
 * </ResponseWithInlineCitations>
 * ```
 */
export function ResponseWithInlineCitations({
  children,
  sources = [],
  className,
  messageId,
}: ResponseWithInlineCitationsProps) {
  // If no sources or no citation markers, render as regular Response
  if (!sources || sources.length === 0 || !children.includes('[')) {
    return <Response className={className}>{children}</Response>
  }

  const { segments } = parseCitationMarkers(children)

  // If no citation markers found, render as regular Response
  if (segments.every(seg => seg.type === 'text')) {
    return <Response className={className}>{children}</Response>
  }

  // Render text and citations inline together
  return (
    <div className={cn('prose dark:prose-invert', className)}>
      {segments.map((segment, idx) => {
        if (segment.type === 'text') {
          // Render text as plain text to keep it inline
          return <span key={idx}>{segment.content}</span>
        }

        // Citation segment - render inline badge
        const citationIndex = segment.index! - 1 // Convert 1-based to 0-based
        const source = sources[citationIndex]

        // If source doesn't exist, just show the marker as text
        if (!source) {
          return (
            <span key={idx} className="text-muted-foreground text-xs">
              {segment.content}
            </span>
          )
        }

        return (
          <InlineCitation key={idx}>
            <InlineCitationCard>
              <InlineCitationCardTrigger sources={[source.url]} />
              <InlineCitationCardBody>
                <div className="p-4 space-y-2">
                  {/* Title as header */}
                  <h4 className="font-semibold text-sm text-foreground">
                    {source.title}
                  </h4>

                  {/* URL as description */}
                  <p className="text-xs text-muted-foreground break-all">
                    {source.url}
                  </p>

                  {/* Optional description if provided */}
                  {source.description && (
                    <p className="text-sm text-muted-foreground">
                      {source.description}
                    </p>
                  )}

                  {/* View source link */}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    onClick={() => {
                      // Audit logging
                      console.log('Inline citation clicked:', {
                        messageId,
                        sourceUrl: source.url,
                        sourceTitle: source.title,
                        citationIndex: segment.index,
                        timestamp: new Date().toISOString(),
                      })
                    }}
                  >
                    View source →
                  </a>
                </div>
              </InlineCitationCardBody>
            </InlineCitationCard>
          </InlineCitation>
        )
      })}
    </div>
  )
}
