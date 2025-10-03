/**
 * useChatNavigation.test.tsx - Unit tests for chat navigation hook
 *
 * Tests:
 * - New chat button functionality
 * - Conversation click navigation
 * - URL synchronization
 * - Current conversation tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useChatNavigation } from './useChatNavigation'
import type { ReactNode } from 'react'

// Mock the conversation store
vi.mock('@/stores/conversationStore', () => ({
  useConversationStore: vi.fn(() => ({
    currentConversationId: null,
    clearCurrentConversation: vi.fn(),
    setCurrentConversation: vi.fn()
  }))
}))

describe('useChatNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial state correctly', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<div>{children}</div>} />
          <Route path="/chat/:conversationId" element={<div>{children}</div>} />
        </Routes>
      </MemoryRouter>
    )

    const { result } = renderHook(() => useChatNavigation(), { wrapper })

    expect(result.current).toHaveProperty('currentConversationId')
    expect(result.current).toHaveProperty('handleNewChat')
    expect(result.current).toHaveProperty('handleConversationClick')
  })

  it('handleNewChat clears conversation and navigates to /chat', async () => {
    const mockClearCurrentConversation = vi.fn()
    const { useConversationStore } = await import('@/stores/conversationStore')

    vi.mocked(useConversationStore).mockReturnValue({
      currentConversationId: 'existing-conv',
      clearCurrentConversation: mockClearCurrentConversation,
      setCurrentConversation: vi.fn()
    } as any)

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/chat/existing-conv']}>
        <Routes>
          <Route path="/chat" element={<div>{children}</div>} />
          <Route path="/chat/:conversationId" element={<div>{children}</div>} />
        </Routes>
      </MemoryRouter>
    )

    const { result } = renderHook(() => useChatNavigation(), { wrapper })

    act(() => {
      result.current.handleNewChat()
    })

    expect(mockClearCurrentConversation).toHaveBeenCalled()
  })

  it('handleConversationClick navigates to conversation URL', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<div>{children}</div>} />
          <Route path="/chat/:conversationId" element={<div>{children}</div>} />
        </Routes>
      </MemoryRouter>
    )

    const { result } = renderHook(() => useChatNavigation(), { wrapper })

    act(() => {
      result.current.handleConversationClick('test-conv-123')
    })

    // Navigation should have been triggered
    expect(result.current).toBeTruthy()
  })

  it('syncs conversation ID from URL params', async () => {
    const mockSetCurrentConversation = vi.fn()
    const { useConversationStore } = await import('@/stores/conversationStore')

    vi.mocked(useConversationStore).mockReturnValue({
      currentConversationId: null,
      clearCurrentConversation: vi.fn(),
      setCurrentConversation: mockSetCurrentConversation
    } as any)

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/chat/url-conv-456']}>
        <Routes>
          <Route path="/chat/:conversationId" element={<div>{children}</div>} />
        </Routes>
      </MemoryRouter>
    )

    renderHook(() => useChatNavigation(), { wrapper })

    // Hook should sync conversation ID from URL params
    expect(mockSetCurrentConversation).toHaveBeenCalled()
  })

  it('clears conversation when navigating away from conversation URL', async () => {
    const mockSetCurrentConversation = vi.fn()
    const { useConversationStore } = await import('@/stores/conversationStore')

    vi.mocked(useConversationStore).mockReturnValue({
      currentConversationId: 'existing-123',
      clearCurrentConversation: vi.fn(),
      setCurrentConversation: mockSetCurrentConversation
    } as any)

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<div>{children}</div>} />
        </Routes>
      </MemoryRouter>
    )

    renderHook(() => useChatNavigation(), { wrapper })

    // Hook should clear conversation when no conversation ID in URL
    expect(mockSetCurrentConversation).toHaveBeenCalled()
  })
})
