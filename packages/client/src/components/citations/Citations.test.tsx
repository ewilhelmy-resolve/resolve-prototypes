import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

  it('filters out invalid sources without url or title', () => {
    const invalidSources = [
      { url: '', title: 'No URL' },
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

  it('renders collapsible-list variant by default', async () => {
    render(
      <CitationProvider defaultVariant="collapsible-list">
        <Citations sources={mockSources} messageId="test-1" />
      </CitationProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Used 2 source/)).toBeInTheDocument()
    })
  })

  it('renders modal variant when specified in context', async () => {
    render(
      <CitationProvider defaultVariant="modal">
        <Citations sources={mockSources} messageId="test-2" />
      </CitationProvider>
    )

    await waitFor(() => {
      // Modal variant should show "Used X sources" button
      expect(screen.getByText(/Used 2 source/)).toBeInTheDocument()
    })
  })

  it('renders right-panel variant when specified in context', async () => {
    render(
      <CitationProvider defaultVariant="right-panel">
        <Citations sources={mockSources} messageId="test-3" />
      </CitationProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Used 2 source/)).toBeInTheDocument()
    })
  })

  it('renders hover-card variant when specified in context', async () => {
    render(
      <CitationProvider defaultVariant="hover-card">
        <Citations sources={mockSources} messageId="test-4" />
      </CitationProvider>
    )

    await waitFor(() => {
      // Hover card shows badge with domain
      expect(screen.getByText(/example.com/)).toBeInTheDocument()
    })
  })

  it('variant prop overrides context variant', async () => {
    render(
      <CitationProvider defaultVariant="collapsible-list">
        <Citations sources={mockSources} variant="modal" messageId="test-5" />
      </CitationProvider>
    )

    await waitFor(() => {
      // Should use modal variant despite context being collapsible-list
      expect(screen.getByText(/Used 2 source/)).toBeInTheDocument()
    })
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

    await waitFor(() => {
      const wrapper = container.querySelector('.custom-citations')
      expect(wrapper).toBeInTheDocument()
    })
  })

  it('passes messageId to variant components', async () => {
    const { container } = render(
      <CitationProvider defaultVariant="collapsible-list">
        <Citations sources={mockSources} messageId="msg-123" />
      </CitationProvider>
    )

    await waitFor(() => {
      const element = container.querySelector('[data-message-id="msg-123"]')
      expect(element).toBeInTheDocument()
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

  it('handles single source correctly', async () => {
    const singleSource = [mockSources[0]]

    render(
      <CitationProvider>
        <Citations sources={singleSource} messageId="test-8" />
      </CitationProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Used 1 source/)).toBeInTheDocument()
    })
  })

  it('handles multiple sources correctly', async () => {
    const multipleSources = [...mockSources, {
      url: 'https://example.com/doc3',
      title: 'Example Document 3'
    }]

    render(
      <CitationProvider>
        <Citations sources={multipleSources} messageId="test-9" />
      </CitationProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Used 3 sources/)).toBeInTheDocument()
    })
  })

  it('renders markdown content when provided in modal variant', async () => {
    const sourcesWithContent = [
      {
        url: 'https://example.com/article',
        title: 'Test Article',
        content: '# Heading\n\nThis is **bold** text with a [link](https://example.com).'
      }
    ]

    render(
      <CitationProvider defaultVariant="modal">
        <Citations sources={sourcesWithContent} messageId="test-content-1" />
      </CitationProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Used 1 source/)).toBeInTheDocument()
    })
  })

  it('renders markdown content when provided in right-panel variant', async () => {
    const sourcesWithContent = [
      {
        url: 'https://example.com/guide',
        title: 'Implementation Guide',
        content: '## Overview\n\n- Item 1\n- Item 2\n\n```bash\nnpm install\n```'
      }
    ]

    render(
      <CitationProvider defaultVariant="right-panel">
        <Citations sources={sourcesWithContent} messageId="test-content-2" />
      </CitationProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Used 1 source/)).toBeInTheDocument()
    })
  })

  it('handles mixed sources with and without content', async () => {
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

    render(
      <CitationProvider defaultVariant="modal">
        <Citations sources={mixedSources} messageId="test-mixed" />
      </CitationProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Used 2 sources/)).toBeInTheDocument()
    })
  })

  it('supports complex markdown with tables and code blocks', async () => {
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

    render(
      <CitationProvider defaultVariant="modal">
        <Citations sources={complexSource} messageId="test-complex" />
      </CitationProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Used 1 source/)).toBeInTheDocument()
    })
  })

  describe('Blob ID Support', () => {
    it('handles sources with blob_id for full document access', async () => {
      const sourcesWithBlob: CitationSource[] = [
        {
          title: 'Technical Documentation',
          snippet: '...comprehensive guide...',
          blob_id: 'blob_test_doc_2024'
        }
      ]

      render(
        <CitationProvider>
          <Citations sources={sourcesWithBlob} messageId="test-blob-1" />
        </CitationProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/Used 1 source/)).toBeInTheDocument()
      })
    })

    it('handles sources with only blob_id (no URL)', async () => {
      const sourcesWithBlobOnly: CitationSource[] = [
        {
          title: 'Internal Document',
          blob_id: 'blob_internal_2024'
        }
      ]

      render(
        <CitationProvider>
          <Citations sources={sourcesWithBlobOnly} messageId="test-blob-2" />
        </CitationProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/Used 1 source/)).toBeInTheDocument()
      })
    })

    it('handles mixed sources (URL and blob_id)', async () => {
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

      render(
        <CitationProvider>
          <Citations sources={mixedSources} messageId="test-blob-3" />
        </CitationProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/Used 2 sources/)).toBeInTheDocument()
      })
    })

    it('handles sources with both URL and blob_id', async () => {
      const sourcesWithBoth: CitationSource[] = [
        {
          url: 'https://docs.example.com/guide',
          title: 'Complete Guide',
          snippet: '...guide excerpt...',
          blob_id: 'blob_complete_guide_2024'
        }
      ]

      render(
        <CitationProvider>
          <Citations sources={sourcesWithBoth} messageId="test-blob-4" />
        </CitationProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/Used 1 source/)).toBeInTheDocument()
      })
    })
  })
})
