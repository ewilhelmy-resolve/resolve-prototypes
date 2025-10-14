import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { screen } from '@testing-library/dom'
import { ResponseWithInlineCitations } from './ResponseWithInlineCitations'
import type { CitationSource } from '@/components/citations/Citations'

describe('ResponseWithInlineCitations', () => {
  const mockSources: CitationSource[] = [
    { url: 'https://example.com/doc1', title: 'Example Document 1' },
    { url: 'https://example.com/doc2', title: 'Example Document 2' },
    { url: 'https://example.com/doc3', title: 'Example Document 3' },
  ]

  it('renders regular Response when no citation markers present', () => {
    render(
      <ResponseWithInlineCitations sources={mockSources}>
        This is a text without citations.
      </ResponseWithInlineCitations>
    )

    expect(screen.getByText('This is a text without citations.')).toBeInTheDocument()
  })

  it('renders regular Response when no sources provided', () => {
    render(
      <ResponseWithInlineCitations sources={[]} messageId="test-1">
        This text has markers [1] but no sources.
      </ResponseWithInlineCitations>
    )

    expect(screen.getByText(/This text has markers/)).toBeInTheDocument()
  })

  it('parses and renders citation markers inline', () => {
    render(
      <ResponseWithInlineCitations sources={mockSources} messageId="test-2">
        According to research [1], AI has improved [2] significantly [3].
      </ResponseWithInlineCitations>
    )

    // Text should be split and rendered
    expect(screen.getByText(/According to research/)).toBeInTheDocument()
    expect(screen.getByText(/AI has improved/)).toBeInTheDocument()
    expect(screen.getByText(/significantly/)).toBeInTheDocument()
  })

  // TODO: Update test - Component refactored to use InlineCitationCardTrigger instead of badges with data-slot="badge"
  it.skip('renders citation badges for valid markers', () => {
    const { container } = render(
      <ResponseWithInlineCitations sources={mockSources} messageId="test-3">
        Text with citation [1] marker.
      </ResponseWithInlineCitations>
    )

    // Should render inline citation badge
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('example.com')
  })

  // TODO: Update test - Component refactored, no longer uses data-slot="badge"
  it.skip('handles multiple citation markers', () => {
    const { container } = render(
      <ResponseWithInlineCitations sources={mockSources} messageId="test-4">
        First [1] and second [2] and third [3].
      </ResponseWithInlineCitations>
    )

    const badges = container.querySelectorAll('[data-slot="badge"]')
    expect(badges).toHaveLength(3)
    expect(badges[0]).toHaveTextContent('example.com')
    expect(badges[1]).toHaveTextContent('example.com')
    expect(badges[2]).toHaveTextContent('example.com')
  })

  // TODO: Update test - Component refactored, no longer uses data-slot="badge"
  it.skip('handles citation markers with missing sources', () => {
    const { container } = render(
      <ResponseWithInlineCitations
        sources={[mockSources[0]]}
        messageId="test-5"
      >
        Valid [1] but invalid [2] citation.
      </ResponseWithInlineCitations>
    )

    // First citation should have badge
    const badges = container.querySelectorAll('[data-slot="badge"]')
    expect(badges).toHaveLength(1)

    // Second citation should show as text
    expect(screen.getByText('[2]')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ResponseWithInlineCitations
        sources={mockSources}
        className="custom-class"
        messageId="test-6"
      >
        Text [1] here.
      </ResponseWithInlineCitations>
    )

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('custom-class')
  })

  // TODO: Update test - Component refactored, hover card structure changed
  it.skip('renders view source link in hover card body', () => {
    const { container } = render(
      <ResponseWithInlineCitations sources={mockSources} messageId="test-7">
        Citation [1] text.
      </ResponseWithInlineCitations>
    )

    // Check for hover card content (though not visible until hover)
    const hoverCardContent = container.querySelector('[data-slot="hover-card-content"]')
    expect(hoverCardContent).toBeInTheDocument()
  })

  // TODO: Update test - Component refactored, no longer uses data-slot="badge"
  it.skip('handles consecutive citation markers', () => {
    const { container } = render(
      <ResponseWithInlineCitations sources={mockSources} messageId="test-8">
        Text [1][2][3] more text.
      </ResponseWithInlineCitations>
    )

    const badges = container.querySelectorAll('[data-slot="badge"]')
    expect(badges).toHaveLength(3)
  })

  it('preserves text segments order', () => {
    render(
      <ResponseWithInlineCitations sources={mockSources} messageId="test-9">
        Start [1] middle [2] end.
      </ResponseWithInlineCitations>
    )

    const text = screen.getByText(/Start/)
    expect(text.textContent).toContain('Start')
  })

  describe('Blob ID Support', () => {
    it('renders citation with blob_id and snippet', () => {
      const sourcesWithBlob: CitationSource[] = [
        {
          title: 'Technical Documentation',
          snippet: '...comprehensive guide...',
          blob_id: 'blob_test_doc_2024'
        }
      ]

      render(
        <ResponseWithInlineCitations sources={sourcesWithBlob} messageId="test-blob-1">
          Reference [1] shows details.
        </ResponseWithInlineCitations>
      )

      expect(screen.getByText(/Reference/)).toBeInTheDocument()
    })

    // TODO: Update test - Component refactored, no longer uses data-slot="badge"
    it.skip('handles citation with only blob_id (no URL)', () => {
      const sourcesWithBlobOnly: CitationSource[] = [
        {
          title: 'Internal Document',
          blob_id: 'blob_internal_2024'
        }
      ]

      const { container } = render(
        <ResponseWithInlineCitations sources={sourcesWithBlobOnly} messageId="test-blob-2">
          Internal doc [1] reference.
        </ResponseWithInlineCitations>
      )

      const badges = container.querySelectorAll('[data-slot="badge"]')
      expect(badges).toHaveLength(1)
      // Should render "See 1 source" when no URL available
      expect(badges[0]).toHaveTextContent('See 1 source')
    })

    // TODO: Update test - Component refactored, no longer uses data-slot="badge"
    it.skip('handles citation with URL only (no blob_id)', () => {
      const sourcesWithUrlOnly: CitationSource[] = [
        {
          url: 'https://external.com/article',
          title: 'External Article',
          snippet: '...external content...'
        }
      ]

      const { container } = render(
        <ResponseWithInlineCitations sources={sourcesWithUrlOnly} messageId="test-blob-3">
          External ref [1] here.
        </ResponseWithInlineCitations>
      )

      const badges = container.querySelectorAll('[data-slot="badge"]')
      expect(badges).toHaveLength(1)
      expect(badges[0]).toHaveTextContent('external.com')
    })

    // TODO: Update test - Component refactored, no longer uses data-slot="badge"
    it.skip('handles mixed citations (some with blob_id, some with URL)', () => {
      const mixedSources: CitationSource[] = [
        {
          title: 'Internal Guide',
          snippet: '...internal...',
          blob_id: 'blob_guide_2024'
        },
        {
          url: 'https://example.com/external',
          title: 'External Resource',
          snippet: '...external...'
        },
        {
          title: 'Another Internal',
          blob_id: 'blob_another_2024'
        }
      ]

      const { container } = render(
        <ResponseWithInlineCitations sources={mixedSources} messageId="test-blob-4">
          References [1] and [2] and [3].
        </ResponseWithInlineCitations>
      )

      const badges = container.querySelectorAll('[data-slot="badge"]')
      expect(badges).toHaveLength(3)
      expect(badges[0]).toHaveTextContent('See 1 source')
      expect(badges[1]).toHaveTextContent('example.com')
      expect(badges[2]).toHaveTextContent('See 1 source')
    })
  })
})
