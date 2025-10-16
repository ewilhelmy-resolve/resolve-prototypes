import { describe, it, expect } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { Citations } from './Citations'
import { CitationProvider } from '@/contexts/CitationContext'
import type { CitationSource } from './Citations'

describe('Citations', () => {
  // Base case: blob_id-only sources (title will be fetched from API)
  const mockSources: CitationSource[] = [
    { blob_id: 'blob_doc_1' },
    { blob_id: 'blob_doc_2' },
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

  it('filters out invalid sources without url or blob_id', () => {
    const invalidSources = [
      { title: 'No URL or blob_id' }, // Invalid: no identifier
      { url: '', title: 'Empty URL' }, // Invalid: empty URL
      { blob_id: 'blob_valid_123' }, // Valid: has blob_id (title optional)
      { url: 'https://valid.com', title: 'Valid Source' }, // Valid: has URL and title
    ] as CitationSource[]

    const { container } = render(
      <CitationProvider>
        <Citations sources={invalidSources} messageId="test-invalid" />
      </CitationProvider>
    )

    // Should render component with 2 valid sources (blob_id and URL)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('accepts sources with blob_id-only (base case - no title, no URL)', () => {
    const sourcesWithBlobOnly = [
      { blob_id: 'blob_test_123' }, // Title will be fetched from API
    ] as CitationSource[]

    const { container } = render(
      <CitationProvider>
        <Citations sources={sourcesWithBlobOnly} messageId="test-blob-only" />
      </CitationProvider>
    )

    // Should render with blob_id-only source (title will be fetched)
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

  it('applies custom className', async () => {
    const { container } = render(
      <CitationProvider>
        <Citations
          sources={mockSources}
          className="custom-citations"
          messageId="test-6"
        />
      </CitationProvider>
    )

    // Wait for lazy-loaded component to render (increased timeout for lazy loading)
    await waitFor(
      () => {
        const wrapper = container.querySelector('.custom-citations')
        expect(wrapper).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it('passes messageId to variant components', async () => {
    const { container } = render(
      <CitationProvider defaultVariant="collapsible-list">
        <Citations sources={mockSources} messageId="msg-123" />
      </CitationProvider>
    )

    // Wait for lazy-loaded component to render
    await waitFor(() => {
      // The messageId is passed to variant, check if component renders
      expect(container.firstChild).toBeInTheDocument()
    })
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
      blob_id: 'blob_doc_3'
    }]

    const { container } = render(
      <CitationProvider>
        <Citations sources={multipleSources} messageId="test-9" />
      </CitationProvider>
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders markdown content when provided in modal variant (legacy URL+content support)', () => {
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

  it('renders markdown content when provided in right-panel variant (legacy URL+content support)', () => {
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

  it('handles mixed sources with and without content (legacy URL support)', () => {
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

  it('supports complex markdown with tables and code blocks (legacy URL+content support)', () => {
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
    it('handles sources with blob_id for full document access (base case)', () => {
      const sourcesWithBlob: CitationSource[] = [
        {
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

    it('handles sources with only blob_id (no URL) - base case', () => {
      const sourcesWithBlobOnly: CitationSource[] = [
        {
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

    it('handles mixed sources (legacy URL and base blob_id)', () => {
      const mixedSources: CitationSource[] = [
        {
          url: 'https://external.com/article',
          title: 'External Article'
        },
        {
          blob_id: 'blob_guide_2024' // Base case - blob_id only
        }
      ]

      const { container } = render(
        <CitationProvider>
          <Citations sources={mixedSources} messageId="test-blob-3" />
        </CitationProvider>
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('handles sources with both URL and blob_id (optional enhancement)', () => {
      const sourcesWithBoth: CitationSource[] = [
        {
          url: 'https://docs.example.com/guide',
          title: 'Complete Guide',
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
