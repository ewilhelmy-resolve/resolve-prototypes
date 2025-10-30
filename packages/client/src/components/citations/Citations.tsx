/**
 * Citations - Main wrapper component for A/B testable citation display
 *
 * This component acts as a strategy selector that renders the appropriate
 * citation variant based on the CitationContext configuration.
 *
 * Supports four variants:
 * - collapsible-list: Default collapsible list (baseline)
 * - modal: Modal overlay experience
 * - right-panel: Side panel experience
 * - hover-card: Hover badge with carousel
 */

import { lazy, Suspense } from 'react'
import { useCitationVariant } from '@/contexts/CitationContext'

/**
 * Citation source data structure
 * Supports both new (blob_metadata_id) and legacy (blob_id) formats
 */
export interface CitationSource {
  /** Source URL (optional if blob_metadata_id/blob_id provided) */
  url?: string
  /** Source title/label (optional - can be fetched from blob_metadata_id/blob_id) */
  title?: string
  /** Optional markdown content for the source */
  content?: string
  /** Optional snippet/quote excerpt to display */
  snippet?: string
  /** NEW: Optional blob_metadata.id for loading full document (preferred) */
  blob_metadata_id?: string
  /** LEGACY: Optional blob_id for loading full document (backward compatibility) */
  blob_id?: string
}

/**
 * Props for Citations component
 */
export interface CitationsProps {
  /** Array of citation sources */
  sources: CitationSource[]
  /** Optional custom class name */
  className?: string
  /** Optional message ID for analytics/audit logging */
  messageId?: string
  /** Optional variant override (overrides context) */
  variant?: 'collapsible-list' | 'modal' | 'right-panel' | 'hover-card'
}

// Lazy load variant components for code splitting
const CollapsibleListCitations = lazy(() =>
  import('./variants/CollapsibleListCitations').then(mod => ({
    default: mod.CollapsibleListCitations
  }))
)

const ModalCitations = lazy(() =>
  import('./variants/ModalCitations').then(mod => ({
    default: mod.ModalCitations
  }))
)

const RightPanelCitations = lazy(() =>
  import('./variants/RightPanelCitations').then(mod => ({
    default: mod.RightPanelCitations
  }))
)

const HoverCardCitations = lazy(() =>
  import('./variants/HoverCardCitations').then(mod => ({
    default: mod.HoverCardCitations
  }))
)

/**
 * Loading fallback for lazy-loaded variants
 */
function CitationsLoading() {
  return (
    // biome-ignore lint/a11y/useSemanticElements: -- to be fixed later
<div
      className="flex items-center gap-2 text-xs text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <span>Loading sources...</span>
    </div>
  )
}

/**
 * Citations - A/B testable citation display component
 *
 * Automatically renders the appropriate variant based on CitationContext.
 *
 * @example
 * ```tsx
 * <Citations
 *   sources={[
 *     { url: 'https://docs.example.com', title: 'Documentation' },
 *     { url: 'https://github.com/example', title: 'GitHub' }
 *   ]}
 *   messageId="msg-123"
 * />
 * ```
 */
export function Citations({ sources, className, messageId, variant: variantProp }: CitationsProps) {
  const contextVariant = useCitationVariant()
  const variant = variantProp || contextVariant

  // Handle empty state
  if (!sources || sources.length === 0) {
    return null
  }

  // Validate sources - must have url, blob_metadata_id, or blob_id (title is optional, can be fetched)
  const validSources = sources.filter(
    source => source && (source.url || source.blob_metadata_id || source.blob_id)
  )

  if (validSources.length === 0) {
    return null
  }

  // Render appropriate variant with loading fallback
  return (
    <Suspense fallback={<CitationsLoading />}>
      {variant === 'collapsible-list' && (
        <CollapsibleListCitations
          sources={validSources}
          className={className}
          messageId={messageId}
        />
      )}
      {variant === 'modal' && (
        <ModalCitations
          sources={validSources}
          className={className}
          messageId={messageId}
        />
      )}
      {variant === 'right-panel' && (
        <RightPanelCitations
          sources={validSources}
          className={className}
          messageId={messageId}
        />
      )}
      {variant === 'hover-card' && (
        <HoverCardCitations
          sources={validSources}
          className={className}
          messageId={messageId}
        />
      )}
    </Suspense>
  )
}
