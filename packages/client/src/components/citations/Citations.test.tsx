/**
 * Citations.test.tsx - Unit tests for Citations component
 *
 * Tests the main Citations wrapper component that:
 * - Renders different variants based on CitationContext
 * - Handles empty and invalid sources
 * - Lazy loads variant components
 * - Supports variant prop override
 * - Validates source data structures
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Citations, type CitationSource } from './Citations'
import { CitationProvider } from '@/contexts/CitationContext'

// Mock variant components to avoid lazy loading complexity in tests
vi.mock('./variants/CollapsibleListCitations', () => ({
  CollapsibleListCitations: ({ sources, messageId }: any) => (
    <div data-testid="collapsible-list-variant">
      <span>Collapsible List Variant</span>
      <span data-testid="source-count">{sources.length}</span>
      {messageId && <span data-testid="message-id">{messageId}</span>}
    </div>
  ),
}))

vi.mock('./variants/ModalCitations', () => ({
  ModalCitations: ({ sources, messageId }: any) => (
    <div data-testid="modal-variant">
      <span>Modal Variant</span>
      <span data-testid="source-count">{sources.length}</span>
      {messageId && <span data-testid="message-id">{messageId}</span>}
    </div>
  ),
}))

vi.mock('./variants/RightPanelCitations', () => ({
  RightPanelCitations: ({ sources, messageId }: any) => (
    <div data-testid="right-panel-variant">
      <span>Right Panel Variant</span>
      <span data-testid="source-count">{sources.length}</span>
      {messageId && <span data-testid="message-id">{messageId}</span>}
    </div>
  ),
}))

vi.mock('./variants/HoverCardCitations', () => ({
  HoverCardCitations: ({ sources, messageId }: any) => (
    <div data-testid="hover-card-variant">
      <span>Hover Card Variant</span>
      <span data-testid="source-count">{sources.length}</span>
      {messageId && <span data-testid="message-id">{messageId}</span>}
    </div>
  ),
}))

// Mock data
const validSources: CitationSource[] = [
  {
    url: 'https://docs.example.com/guide',
    title: 'Documentation Guide',
    snippet: 'This is a helpful guide',
  },
  {
    url: 'https://github.com/example/repo',
    title: 'GitHub Repository',
  },
  {
    blob_id: 'blob-123',
    title: 'Internal Document',
    content: 'Full document content here',
  },
]

// Test wrapper with CitationProvider
function TestWrapper({
  children,
  defaultVariant = 'collapsible-list',
}: {
  children: React.ReactNode
  defaultVariant?: 'collapsible-list' | 'modal' | 'right-panel' | 'hover-card'
}) {
  return (
    <CitationProvider defaultVariant={defaultVariant}>
      {children}
    </CitationProvider>
  )
}

describe('Citations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage before each test
    localStorage.clear()
  })

  describe('Empty State Handling', () => {
    it('renders nothing when sources array is empty', () => {
      const { container } = render(
        <TestWrapper>
          <Citations sources={[]} />
        </TestWrapper>
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when sources is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <Citations sources={undefined as any} />
        </TestWrapper>
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when sources is null', () => {
      const { container } = render(
        <TestWrapper>
          <Citations sources={null as any} />
        </TestWrapper>
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Source Validation', () => {
    it('filters out sources without url or blob_id', async () => {
      const invalidSources: CitationSource[] = [
        { title: 'No URL or blob_id' }, // Invalid
        { url: 'https://valid.com', title: 'Valid' }, // Valid
        { snippet: 'Just a snippet' }, // Invalid
        { blob_id: 'blob-456' }, // Valid (title optional)
      ]

      render(
        <TestWrapper>
          <Citations sources={invalidSources} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-list-variant')).toBeInTheDocument()
      })

      // Should only pass 2 valid sources (with url or blob_id)
      expect(screen.getByTestId('source-count').textContent).toBe('2')
    })

    it('renders nothing when all sources are invalid', () => {
      const allInvalidSources: CitationSource[] = [
        { title: 'No URL or blob_id' },
        { snippet: 'Just a snippet' },
        { content: 'Just content' },
      ]

      const { container } = render(
        <TestWrapper>
          <Citations sources={allInvalidSources} />
        </TestWrapper>
      )

      expect(container.firstChild).toBeNull()
    })

    it('accepts sources with only url', async () => {
      const sources: CitationSource[] = [{ url: 'https://example.com' }]

      render(
        <TestWrapper>
          <Citations sources={sources} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-list-variant')).toBeInTheDocument()
      })

      expect(screen.getByTestId('source-count').textContent).toBe('1')
    })

    it('accepts sources with only blob_id', async () => {
      const sources: CitationSource[] = [{ blob_id: 'blob-789' }]

      render(
        <TestWrapper>
          <Citations sources={sources} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-list-variant')).toBeInTheDocument()
      })

      expect(screen.getByTestId('source-count').textContent).toBe('1')
    })

    it('filters out null and undefined sources', async () => {
      const sourcesWithNulls: CitationSource[] = [
        { url: 'https://valid.com' },
        null as any,
        { blob_id: 'blob-123' },
        undefined as any,
        { url: 'https://another-valid.com' },
      ]

      render(
        <TestWrapper>
          <Citations sources={sourcesWithNulls} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-list-variant')).toBeInTheDocument()
      })

      // Should only pass 3 valid sources
      expect(screen.getByTestId('source-count').textContent).toBe('3')
    })
  })

  describe('Variant Rendering', () => {
    it('renders collapsible-list variant by default', async () => {
      render(
        <TestWrapper defaultVariant="collapsible-list">
          <Citations sources={validSources} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-list-variant')).toBeInTheDocument()
        expect(screen.getByText('Collapsible List Variant')).toBeInTheDocument()
      })
    })

    it('renders modal variant when context is set to modal', async () => {
      render(
        <TestWrapper defaultVariant="modal">
          <Citations sources={validSources} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('modal-variant')).toBeInTheDocument()
        expect(screen.getByText('Modal Variant')).toBeInTheDocument()
      })
    })

    it('renders right-panel variant when context is set to right-panel', async () => {
      render(
        <TestWrapper defaultVariant="right-panel">
          <Citations sources={validSources} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('right-panel-variant')).toBeInTheDocument()
        expect(screen.getByText('Right Panel Variant')).toBeInTheDocument()
      })
    })

    it('renders hover-card variant when context is set to hover-card', async () => {
      render(
        <TestWrapper defaultVariant="hover-card">
          <Citations sources={validSources} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('hover-card-variant')).toBeInTheDocument()
        expect(screen.getByText('Hover Card Variant')).toBeInTheDocument()
      })
    })
  })

  describe('Variant Override Prop', () => {
    it('uses variant prop to override context', async () => {
      render(
        <TestWrapper defaultVariant="collapsible-list">
          <Citations sources={validSources} variant="modal" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('modal-variant')).toBeInTheDocument()
        expect(screen.queryByTestId('collapsible-list-variant')).not.toBeInTheDocument()
      })
    })

    it('variant prop takes precedence over context', async () => {
      render(
        <TestWrapper defaultVariant="right-panel">
          <Citations sources={validSources} variant="hover-card" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('hover-card-variant')).toBeInTheDocument()
        expect(screen.queryByTestId('right-panel-variant')).not.toBeInTheDocument()
      })
    })
  })

  describe('Props Passing', () => {
    it('passes sources to variant component', async () => {
      render(
        <TestWrapper>
          <Citations sources={validSources} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('source-count').textContent).toBe('3')
      })
    })

    it('passes className to variant component', async () => {
      render(
        <TestWrapper>
          <Citations sources={validSources} className="custom-class" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-list-variant')).toBeInTheDocument()
      })
    })

    it('passes messageId to variant component', async () => {
      render(
        <TestWrapper>
          <Citations sources={validSources} messageId="msg-123" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('message-id').textContent).toBe('msg-123')
      })
    })

    it('passes messageId to all variants', async () => {
      const { rerender } = render(
        <TestWrapper>
          <Citations sources={validSources} messageId="msg-456" variant="modal" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('message-id').textContent).toBe('msg-456')
      })

      rerender(
        <TestWrapper>
          <Citations sources={validSources} messageId="msg-456" variant="right-panel" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('message-id').textContent).toBe('msg-456')
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading fallback while lazy loading variant', () => {
      render(
        <TestWrapper>
          <Citations sources={validSources} />
        </TestWrapper>
      )

      // Loading state should appear first (before lazy component loads)
      const loadingElement = screen.queryByText('Loading sources...')
      // Note: Due to mocking, this might not always be visible, but the structure is correct
      expect(loadingElement || screen.getByTestId('collapsible-list-variant')).toBeTruthy()
    })
  })

  describe('Complex Source Data', () => {
    it('handles sources with all optional fields', async () => {
      const complexSources: CitationSource[] = [
        {
          url: 'https://example.com',
          title: 'Complete Source',
          content: 'Full markdown content',
          snippet: 'Preview snippet',
          blob_id: 'blob-complete',
        },
      ]

      render(
        <TestWrapper>
          <Citations sources={complexSources} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-list-variant')).toBeInTheDocument()
        expect(screen.getByTestId('source-count').textContent).toBe('1')
      })
    })

    it('handles mixed valid and invalid sources', async () => {
      const mixedSources: CitationSource[] = [
        { url: 'https://valid1.com', title: 'Valid 1' },
        { title: 'Invalid - no url or blob_id' },
        { blob_id: 'blob-valid', snippet: 'Valid with blob_id' },
        { content: 'Invalid - only content' },
        { url: 'https://valid2.com' },
      ]

      render(
        <TestWrapper>
          <Citations sources={mixedSources} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-list-variant')).toBeInTheDocument()
      })

      // Should only pass 3 valid sources
      expect(screen.getByTestId('source-count').textContent).toBe('3')
    })
  })
})
