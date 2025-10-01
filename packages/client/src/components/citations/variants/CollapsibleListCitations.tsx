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
 */

'use client'

import {
  Sources,
  SourcesContent,
  SourcesTrigger,
  Source,
} from '@/components/ai-elements/sources'
import type { CitationsProps } from '../Citations'

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
 *     { url: 'https://docs.example.com', title: 'Documentation' },
 *     { url: 'https://github.com/example', title: 'GitHub' }
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
  return (
    <Sources className={className} data-message-id={messageId}>
      <SourcesTrigger count={sources.length} />
      <SourcesContent>
        {sources.map((source, index) => (
          <Source
            key={`${messageId}-${index}`}
            href={source.url}
            title={source.title}
          />
        ))}
      </SourcesContent>
    </Sources>
  )
}
