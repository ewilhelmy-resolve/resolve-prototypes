/**
 * useFileUpload.test.tsx - Unit tests for file upload functionality
 *
 * Tests:
 * - File upload button triggers file selector
 * - File upload status tracking
 * - Multiple file types supported
 * - Upload error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFileUpload } from './useFileUpload'
import { useRef } from 'react'

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(() => Promise.resolve({ data: { file_id: 'test-file-123' } }))
  }
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial state correctly', () => {
    const fileInputRef = { current: document.createElement('input') }
    const { result } = renderHook(() => useFileUpload(fileInputRef as any))

    expect(result.current.isUploading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current).toHaveProperty('handleFileUpload')
    expect(result.current).toHaveProperty('openFileSelector')
  })

  it('openFileSelector triggers file input click', () => {
    const mockClick = vi.fn()
    const fileInputRef = {
      current: {
        click: mockClick
      } as any
    }

    const { result } = renderHook(() => useFileUpload(fileInputRef as any))

    act(() => {
      result.current.openFileSelector()
    })

    expect(mockClick).toHaveBeenCalled()
  })

  it('handleFileUpload processes files correctly', async () => {
    const fileInputRef = { current: document.createElement('input') }
    const { result } = renderHook(() => useFileUpload(fileInputRef as any))

    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    const mockEvent = {
      target: {
        files: [mockFile]
      }
    } as any

    act(() => {
      result.current.handleFileUpload(mockEvent)
    })

    // Should set uploading state
    await waitFor(() => {
      expect(result.current.isUploading).toBe(true)
    })
  })

  it('handles upload errors gracefully', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Upload failed'))

    const fileInputRef = { current: document.createElement('input') }
    const { result } = renderHook(() => useFileUpload(fileInputRef as any))

    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
    const mockEvent = {
      target: {
        files: [mockFile]
      }
    } as any

    act(() => {
      result.current.handleFileUpload(mockEvent)
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      expect(result.current.isUploading).toBe(false)
    })
  })

  it('handles successful upload', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.post).mockResolvedValueOnce({ data: { file_id: 'success-123' } })

    const fileInputRef = { current: document.createElement('input') }
    const { result } = renderHook(() => useFileUpload(fileInputRef as any))

    const mockFile = new File(['success'], 'success.pdf', { type: 'application/pdf' })
    const mockEvent = {
      target: {
        files: [mockFile]
      }
    } as any

    act(() => {
      result.current.handleFileUpload(mockEvent)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.isUploading).toBe(false)
    })
  })

  it('does nothing when no files selected', () => {
    const fileInputRef = { current: document.createElement('input') }
    const { result } = renderHook(() => useFileUpload(fileInputRef as any))

    const mockEvent = {
      target: {
        files: []
      }
    } as any

    act(() => {
      result.current.handleFileUpload(mockEvent)
    })

    // Should remain in initial state
    expect(result.current.isUploading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.isSuccess).toBe(false)
  })

  it('supports multiple file types', async () => {
    const fileInputRef = { current: document.createElement('input') }
    const { result } = renderHook(() => useFileUpload(fileInputRef as any))

    const fileTypes = [
      new File(['pdf'], 'test.pdf', { type: 'application/pdf' }),
      new File(['txt'], 'test.txt', { type: 'text/plain' }),
      new File(['img'], 'test.png', { type: 'image/png' }),
      new File(['doc'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    ]

    for (const file of fileTypes) {
      const mockEvent = {
        target: {
          files: [file]
        }
      } as any

      act(() => {
        result.current.handleFileUpload(mockEvent)
      })

      await waitFor(() => {
        expect(result.current.isUploading || result.current.isSuccess).toBe(true)
      })
    }
  })
})
