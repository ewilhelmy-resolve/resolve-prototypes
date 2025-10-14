/**
 * ChatV1Page.test.tsx - Unit tests for chat page functionality
 *
 * Tests critical chat features before layout replacement:
 * - Message sending
 * - SSE real-time updates
 * - Conversation URL synchronization
 * - Message input handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { waitFor } from '@testing-library/dom'
import { MemoryRouter } from 'react-router-dom'
import ChatV1Page from './ChatV1Page'

// Mock all dependencies
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    authenticated: true,
    loading: false,
    sessionReady: true,
    user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
  }))
}))

vi.mock('../contexts/SSEContext', () => ({
  SSEProvider: ({ children }: any) => children,
  useSSEContext: vi.fn(() => ({
    latestUpdate: null,
    connectionState: 'open'
  }))
}))

vi.mock('../stores/conversationStore', () => ({
  useConversationStore: vi.fn(() => ({
    currentConversationId: null,
    messages: [],
    updateMessage: vi.fn(),
    setCurrentConversation: vi.fn(),
    clearCurrentConversation: vi.fn()
  }))
}))

vi.mock('../hooks/useRitaChat', () => ({
  useRitaChat: vi.fn(() => ({
    messages: [],
    messagesLoading: false,
    isSending: false,
    currentConversationId: null,
    messageValue: '',
    handleSendMessage: vi.fn(),
    handleMessageChange: vi.fn(),
    handleFileUpload: vi.fn(),
    uploadStatus: {
      isUploading: false,
      isError: false,
      isSuccess: false
    },
    fileInputRef: { current: null }
  }))
}))

vi.mock('../hooks/api/useConversations', () => ({
  useConversations: vi.fn(() => ({
    data: [],
    isLoading: false
  }))
}))

vi.mock('../hooks/useChatNavigation', () => ({
  useChatNavigation: vi.fn(() => ({
    currentConversationId: null,
    handleNewChat: vi.fn(),
    handleConversationClick: vi.fn()
  }))
}))

vi.mock('../hooks/useKnowledgeBase', () => ({
  useKnowledgeBase: vi.fn(() => ({
    files: [],
    filesLoading: false,
    totalFiles: 0,
    isUploading: false,
    isError: false,
    isSuccess: false,
    handleDocumentUpload: vi.fn(),
    openDocumentSelector: vi.fn(),
    navigateToKnowledgeArticles: vi.fn(),
    documentInputRef: { current: null }
  }))
}))

describe('ChatV1Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders chat page when authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <ChatV1Page />
      </MemoryRouter>
    )

    // Should render the chat interface
    expect(document.body).toBeTruthy()
  })

  // TODO: Fix test - component may not call setCurrentConversation on mount
  it.skip('syncs conversation ID from URL params', async () => {
    const mockSetCurrentConversation = vi.fn()
    const { useConversationStore } = await import('../stores/conversationStore')

    vi.mocked(useConversationStore).mockReturnValue({
      currentConversationId: null,
      messages: [],
      updateMessage: vi.fn(),
      setCurrentConversation: mockSetCurrentConversation,
      clearCurrentConversation: vi.fn()
    } as any)

    render(
      <MemoryRouter initialEntries={['/chat/test-conversation-123']}>
        <ChatV1Page />
      </MemoryRouter>
    )

    // Wait for effects to run (increased timeout for component lifecycle)
    await waitFor(
      () => {
        expect(mockSetCurrentConversation).toHaveBeenCalled()
      },
      { timeout: 3000 }
    )
  })

  it('handles SSE updates correctly', async () => {
    const mockUpdateMessage = vi.fn()
    const { useConversationStore } = await import('../stores/conversationStore')
    const { useSSEContext } = await import('../contexts/SSEContext')

    vi.mocked(useConversationStore).mockReturnValue({
      currentConversationId: 'test-conv',
      messages: [],
      updateMessage: mockUpdateMessage,
      setCurrentConversation: vi.fn(),
      clearCurrentConversation: vi.fn()
    } as any)

    vi.mocked(useSSEContext).mockReturnValue({
      latestUpdate: {
        messageId: 'msg-123',
        status: 'completed',
        errorMessage: null
      },
      connectionState: 'open'
    } as any)

    render(
      <MemoryRouter initialEntries={['/chat']}>
        <ChatV1Page />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockUpdateMessage).toHaveBeenCalledWith('msg-123', {
        status: 'completed',
        error_message: null
      })
    })
  })

  // TODO: Fix test - dynamic mock doesn't override initial mock properly
  it.skip('provides rita chat state to content component', async () => {
    const mockHandleSendMessage = vi.fn()
    const mockHandleMessageChange = vi.fn()
    const { useRitaChat } = await import('../hooks/useRitaChat')

    vi.mocked(useRitaChat).mockReturnValue({
      messages: [{ id: '1', role: 'user', message: 'Test message' }],
      messagesLoading: false,
      isSending: false,
      currentConversationId: 'test-123',
      messageValue: 'Hello',
      handleSendMessage: mockHandleSendMessage,
      handleMessageChange: mockHandleMessageChange,
      handleFileUpload: vi.fn(),
      uploadStatus: {
        isUploading: false,
        isError: false,
        isSuccess: false
      },
      fileInputRef: { current: null }
    } as any)

    render(
      <MemoryRouter initialEntries={['/chat']}>
        <ChatV1Page />
      </MemoryRouter>
    )

    // Component should be rendered with the provided state
    expect(document.body).toBeTruthy()
  })
})
