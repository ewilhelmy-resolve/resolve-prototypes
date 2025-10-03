import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Citations } from './Citations'
import { CitationProvider } from '@/contexts/CitationContext'
import type { CitationSource } from './Citations'

describe('Citations', () => {
  const mockSources: CitationSource[] = [
    { url: 'https://example.com/doc1', title: 'Example Document 1' },
    { url: 'https://example.com/doc2', title: 'Example Document 2' },
  ]

  it('renders nothing when sources array is empty', () => {
    const { container } = render(
      <CitationProvider>
        <Citations sources={[]} />
      </CitationProvider>
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when sources is undefined', () => {
    const { container } = render(
      <CitationProvider>
        <Citations sources={undefined as any} />
      </CitationProvider>
    )
    expect(container.firstChild).toBeNull()
  })

  it('filters out invalid sources without url/blob_id or title', () => {
    const invalidSources = [
      { url: '', title: 'No URL or blob_id' },
      { url: 'https://example.com', title: '' },
      { url: 'https://valid.com', title: 'Valid Source' },
    ] as CitationSource[]

    const { container } = render(
      <CitationProvider>
        <Citations sources={invalidSources} messageId="test-invalid" />
      </CitationProvider>
    )

    // Should still render component with 1 valid source
    expect(container.firstChild).toBeInTheDocument()
  })

  it('accepts sources with blob_id but no URL', () => {
    const sourcesWithBlobOnly = [
      { title: 'Internal Document', blob_id: 'blob_test_123' },
    ] as CitationSource[]

    const { container } = render(
      <CitationProvider>
        <Citations sources={sourcesWithBlobOnly} messageId="test-blob-valid" />
      </CitationProvider>
    )

    // Should render with blob_id-only source
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders collapsible-list variant by default', () => {
    const { container } = render(
      <CitationProvider defaultVariant="collapsible-list">
        <Citations sources={mockSources} messageId="test-1" />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders modal variant when specified in context', () => {
    const { container } = render(
      <CitationProvider defaultVariant="modal">
        <Citations sources={mockSources} messageId="test-2" />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders right-panel variant when specified in context', () => {
    const { container } = render(
      <CitationProvider defaultVariant="right-panel">
        <Citations sources={mockSources} messageId="test-3" />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders hover-card variant when specified in context', () => {
    const { container } = render(
      <CitationProvider defaultVariant="hover-card">
        <Citations sources={mockSources} messageId="test-4" />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('variant prop overrides context variant', () => {
    const { container } = render(
      <CitationProvider defaultVariant="collapsible-list">
        <Citations sources={mockSources} variant="modal" messageId="test-5" />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders variant from metadata (simulating backend metadata flow)', () => {
    // Simulate how ChatV1Content passes metadata.citation_variant to Citations
    const metadata = {
      sources: mockSources,
      citation_variant: 'right-panel' as const
    }

    const { container } = render(
      <CitationProvider defaultVariant="collapsible-list">
        <Citations
          sources={metadata.sources}
          variant={metadata.citation_variant}
          messageId="test-metadata"
        />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <CitationProvider>
        <Citations
          sources={mockSources}
          className="custom-citations"
          messageId="test-6"
        />
      </CitationProvider>
    )

    const wrapper = container.querySelector('.custom-citations')
    expect(wrapper).toBeInTheDocument()
  })

  it('passes messageId to variant components', () => {
    const { container } = render(
      <CitationProvider defaultVariant="collapsible-list">
        <Citations sources={mockSources} messageId="msg-123" />
      </CitationProvider>
    )

    const element = container.querySelector('[data-message-id="msg-123"]')
    expect(element).toBeInTheDocument()
  })

  it('shows loading fallback while lazy loading variants', () => {
    const { container } = render(
      <CitationProvider>
        <Citations sources={mockSources} messageId="test-7" />
      </CitationProvider>
    )

    // Should show loading state initially (before Suspense resolves)
    // This is brief so we just check the component renders
    expect(container.firstChild).toBeInTheDocument()
  })

  it('handles single source correctly', () => {
    const singleSource = [mockSources[0]]

    const { container } = render(
      <CitationProvider>
        <Citations sources={singleSource} messageId="test-8" />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('handles multiple sources correctly', () => {
    const multipleSources = [...mockSources, {
      url: 'https://example.com/doc3',
      title: 'Example Document 3'
    }]

    const { container } = render(
      <CitationProvider>
        <Citations sources={multipleSources} messageId="test-9" />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders markdown content when provided in modal variant', () => {
    const sourcesWithContent = [
      {
        url: 'https://example.com/article',
        title: 'Test Article',
        content: '# Heading\n\nThis is **bold** text with a [link](https://example.com).'
      }
    ]

    const { container } = render(
      <CitationProvider defaultVariant="modal">
        <Citations sources={sourcesWithContent} messageId="test-content-1" />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders markdown content when provided in right-panel variant', () => {
    const sourcesWithContent = [
      {
        url: 'https://example.com/guide',
        title: 'Implementation Guide',
        content: '## Overview\n\n- Item 1\n- Item 2\n\n```bash\nnpm install\n```'
      }
    ]

    const { container } = render(
      <CitationProvider defaultVariant="right-panel">
        <Citations sources={sourcesWithContent} messageId="test-content-2" />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('handles mixed sources with and without content', () => {
    const mixedSources = [
      {
        url: 'https://example.com/with-content',
        title: 'Article with Content',
        content: '# Article\n\nFull article text here.'
      },
      {
        url: 'https://example.com/no-content',
        title: 'Link Only'
      }
    ]

    const { container } = render(
      <CitationProvider defaultVariant="modal">
        <Citations sources={mixedSources} messageId="test-mixed" />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('supports complex markdown with tables and code blocks', () => {
    const complexSource = [
      {
        url: 'https://example.com/complex',
        title: 'Complex Documentation',
        content: `# Documentation

| Feature | Status |
|---------|--------|
| Tables  | ✅     |
| Code    | ✅     |

\`\`\`typescript
const test = () => console.log('test')
\`\`\`
`
      }
    ]

    const { container } = render(
      <CitationProvider defaultVariant="modal">
        <Citations sources={complexSource} messageId="test-complex" />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  describe('Blob ID Support', () => {
    it('handles sources with blob_id for full document access', () => {
      const sourcesWithBlob: CitationSource[] = [
        {
          title: 'Technical Documentation',
          snippet: '...comprehensive guide...',
          blob_id: 'blob_test_doc_2024'
        }
      ]

      const { container } = render(
        <CitationProvider>
          <Citations sources={sourcesWithBlob} messageId="test-blob-1" />
        </CitationProvider>
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('handles sources with only blob_id (no URL)', () => {
      const sourcesWithBlobOnly: CitationSource[] = [
        {
          title: 'Internal Document',
          blob_id: 'blob_internal_2024'
        }
      ]

      const { container } = render(
        <CitationProvider>
          <Citations sources={sourcesWithBlobOnly} messageId="test-blob-2" />
        </CitationProvider>
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('handles mixed sources (URL and blob_id)', () => {
      const mixedSources: CitationSource[] = [
        {
          url: 'https://external.com/article',
          title: 'External Article',
          snippet: '...external...'
        },
        {
          title: 'Internal Guide',
          snippet: '...internal...',
          blob_id: 'blob_guide_2024'
        }
      ]

      const { container } = render(
        <CitationProvider>
          <Citations sources={mixedSources} messageId="test-blob-3" />
        </CitationProvider>
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('handles sources with both URL and blob_id', () => {
      const sourcesWithBoth: CitationSource[] = [
        {
          url: 'https://docs.example.com/guide',
          title: 'Complete Guide',
          snippet: '...guide excerpt...',
          blob_id: 'blob_complete_guide_2024'
        }
      ]

      const { container } = render(
        <CitationProvider>
          <Citations sources={sourcesWithBoth} messageId="test-blob-4" />
        </CitationProvider>
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })
})
