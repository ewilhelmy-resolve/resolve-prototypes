/**
 * CitationContext - A/B testing context for citation/source display variants
 *
 * Allows easy switching between different citation UX implementations:
 * - collapsible-list: Default collapsible list (current implementation)
 * - modal: Full modal overlay
 * - right-panel: Side panel display
 * - hover-card: Hover badge with carousel
 *
 * Configuration can come from:
 * - Environment variables
 * - Local storage (development)
 * - Platform API/feature flags (future)
 */

'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

/**
 * Available citation display variants for A/B testing
 */
export type CitationVariant =
  | 'collapsible-list'  // Default: Collapsible list (current implementation)
  | 'modal'             // Modal overlay
  | 'right-panel'       // Right side panel
  | 'hover-card'        // Hover badge with carousel

/**
 * Citation context value
 */
export interface CitationContextValue {
  /** Current active citation variant */
  variant: CitationVariant
  /** Update the citation variant */
  setVariant: (variant: CitationVariant) => void
}

/**
 * Citation context for A/B testing
 */
const CitationContext = createContext<CitationContextValue | undefined>(undefined)

/**
 * Props for CitationProvider
 */
export interface CitationProviderProps {
  children: ReactNode
  /** Default variant (can be overridden by env or localStorage) */
  defaultVariant?: CitationVariant
}

/**
 * Storage key for localStorage persistence
 */
const STORAGE_KEY = 'rita:citation-variant'

/**
 * Get initial variant from environment, localStorage, or default
 */
function getInitialVariant(defaultVariant: CitationVariant = 'collapsible-list'): CitationVariant {
  // 1. Check environment variable (build-time configuration)
  if (typeof process !== 'undefined' && process.env.VITE_CITATION_VARIANT) {
    const envVariant = process.env.VITE_CITATION_VARIANT as CitationVariant
    if (isValidVariant(envVariant)) {
      return envVariant
    }
  }

  // 2. Check localStorage (development/testing override)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && isValidVariant(stored as CitationVariant)) {
        return stored as CitationVariant
      }
    } catch (error) {
      console.warn('Failed to read citation variant from localStorage:', error)
    }
  }

  // 3. Use default
  return defaultVariant
}

/**
 * Validate variant value
 */
function isValidVariant(variant: string): boolean {
  return ['collapsible-list', 'modal', 'right-panel', 'hover-card'].includes(variant)
}

/**
 * Citation Provider - Manages A/B testing variant configuration
 *
 * @example
 * ```tsx
 * <CitationProvider defaultVariant="collapsible-list">
 *   <App />
 * </CitationProvider>
 * ```
 */
export function CitationProvider({ children, defaultVariant = 'collapsible-list' }: CitationProviderProps) {
  const [variant, setVariantState] = useState<CitationVariant>(() =>
    getInitialVariant(defaultVariant)
  )

  /**
   * Update variant and persist to localStorage
   */
  const setVariant = (newVariant: CitationVariant) => {
    if (!isValidVariant(newVariant)) {
      console.warn(`Invalid citation variant: ${newVariant}`)
      return
    }

    setVariantState(newVariant)

    // Persist to localStorage for development
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, newVariant)
      } catch (error) {
        console.warn('Failed to save citation variant to localStorage:', error)
      }
    }
  }

  const value: CitationContextValue = {
    variant,
    setVariant,
  }

  return (
    <CitationContext.Provider value={value}>
      {children}
    </CitationContext.Provider>
  )
}

/**
 * Hook to access citation context
 *
 * @throws {Error} If used outside CitationProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { variant, setVariant } = useCitationContext()
 *
 *   return (
 *     <button onClick={() => setVariant('modal')}>
 *       Switch to Modal
 *     </button>
 *   )
 * }
 * ```
 */
export function useCitationContext(): CitationContextValue {
  const context = useContext(CitationContext)

  if (context === undefined) {
    throw new Error('useCitationContext must be used within a CitationProvider')
  }

  return context
}

/**
 * Hook to access current citation variant (convenience hook)
 *
 * @example
 * ```tsx
 * function Citations({ sources }) {
 *   const variant = useCitationVariant()
 *
 *   switch (variant) {
 *     case 'modal':
 *       return <ModalCitations sources={sources} />
 *     case 'collapsible-list':
 *       return <CollapsibleListCitations sources={sources} />
 *   }
 * }
 * ```
 */
export function useCitationVariant(): CitationVariant {
  const { variant } = useCitationContext()
  return variant
}
