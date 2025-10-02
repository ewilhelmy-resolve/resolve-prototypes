import { describe, it, expect } from 'vitest'
import { getBlobContent, blobExists, listBlobIds } from './blob-storage'

describe('Blob Storage Service', () => {
  describe('getBlobContent', () => {
    it('should return blob content for valid blob_id', () => {
      const blob = getBlobContent('blob_automation_guide_v2024')

      expect(blob).toBeDefined()
      expect(blob?.blob_id).toBe('blob_automation_guide_v2024')
      expect(blob?.content_type).toBe('markdown')
      expect(blob?.content).toContain('Rita Automation System')
      expect(blob?.content).toContain('```mermaid')
    })

    it('should return null for invalid blob_id', () => {
      const blob = getBlobContent('invalid_blob_id')
      expect(blob).toBeNull()
    })

    it('should include metadata for blob content', () => {
      const blob = getBlobContent('blob_automation_guide_v2024')

      expect(blob?.metadata).toBeDefined()
      expect(blob?.metadata?.title).toBe('Rita Automation Implementation Guide')
      expect(blob?.metadata?.author).toBe('Resolve Engineering Team')
    })
  })

  describe('blobExists', () => {
    it('should return true for existing blob', () => {
      expect(blobExists('blob_automation_guide_v2024')).toBe(true)
      expect(blobExists('blob_architecture_patterns_2024')).toBe(true)
    })

    it('should return false for non-existing blob', () => {
      expect(blobExists('invalid_blob_id')).toBe(false)
      expect(blobExists('')).toBe(false)
    })
  })

  describe('listBlobIds', () => {
    it('should return array of all blob IDs', () => {
      const ids = listBlobIds()

      expect(Array.isArray(ids)).toBe(true)
      expect(ids.length).toBeGreaterThan(0)
      expect(ids).toContain('blob_automation_guide_v2024')
      expect(ids).toContain('blob_architecture_patterns_2024')
    })

    it('should include all expected blob documents', () => {
      const ids = listBlobIds()
      const expectedBlobs = [
        'blob_automation_guide_v2024',
        'blob_architecture_patterns_2024',
        'blob_security_hardening_2024',
        'blob_monitoring_guide_2024',
        'blob_wcag_guide_2024',
        'blob_soc2_guide_2024'
      ]

      expectedBlobs.forEach(blobId => {
        expect(ids).toContain(blobId)
      })
    })
  })

  describe('Blob Content Structure', () => {
    it('should have comprehensive content with Mermaid diagrams', () => {
      const blob = getBlobContent('blob_automation_guide_v2024')

      expect(blob?.content).toContain('## Architecture Overview')
      expect(blob?.content).toContain('```mermaid')
      expect(blob?.content).toContain('graph TB')
      expect(blob?.content).toContain('sequenceDiagram')
    })

    it('should include code examples in multiple languages', () => {
      const blob = getBlobContent('blob_automation_guide_v2024')

      expect(blob?.content).toContain('```typescript')
      expect(blob?.content).toContain('```sql')
      expect(blob?.content).toContain('```yaml')
      expect(blob?.content).toContain('```bash')
    })

    it('should have table of contents and sections', () => {
      const blob = getBlobContent('blob_automation_guide_v2024')

      expect(blob?.content).toContain('## Table of Contents')
      expect(blob?.content).toContain('## System Components')
      expect(blob?.content).toContain('## Security & Compliance')
      expect(blob?.content).toContain('## Performance Optimization')
    })
  })
})
