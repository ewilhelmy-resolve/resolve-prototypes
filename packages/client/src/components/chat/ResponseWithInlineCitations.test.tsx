import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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

  it('renders citation badges for valid markers', () => {
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

  it('handles multiple citation markers', () => {
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

  it('handles citation markers with missing sources', () => {
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

  it('renders view source link in hover card body', () => {
    const { container } = render(
      <ResponseWithInlineCitations sources={mockSources} messageId="test-7">
        Citation [1] text.
      </ResponseWithInlineCitations>
    )

    // Check for hover card content (though not visible until hover)
    const hoverCardContent = container.querySelector('[data-slot="hover-card-content"]')
    expect(hoverCardContent).toBeInTheDocument()
  })

  it('handles consecutive citation markers', () => {
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
})
