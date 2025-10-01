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
import { cn } from '@/lib/utils'
import type { CitationsProps } from '../Citations'

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
  // Extract URLs for the badge trigger
  const sourceUrls = sources.map(source => source.url)

  return (
    <div
      className={cn('not-prose mb-4 inline-flex items-center gap-1', className)}
      data-message-id={messageId}
    >
      <InlineCitation>
        <InlineCitationCard>
          <InlineCitationCardTrigger sources={sourceUrls} />

          <InlineCitationCardBody>
            {sources.length === 1 ? (
              // Single source - no carousel needed
              <div className="p-4">
                <InlineCitationSource
                  title={sources[0].title}
                  url={sources[0].url}
                />
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
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-2 inline-block"
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
                        View source →
                      </a>
                    </InlineCitationCarouselItem>
                  ))}
                </InlineCitationCarouselContent>
              </InlineCitationCarousel>
            )}
          </InlineCitationCardBody>
        </InlineCitationCard>
      </InlineCitation>
    </div>
  )
}
