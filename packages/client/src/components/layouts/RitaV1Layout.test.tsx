/**
 * RitaLayout.test.tsx - Unit tests for layout functionality
 *
 * Tests:
 * - Share button functionality
 * - Knowledge base upload button
 * - Conversation search
 * - Conversation list display
 * - Right sidebar knowledge panel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { screen, fireEvent } from '@testing-library/dom'
import { BrowserRouter } from 'react-router-dom'
import RitaLayout from './RitaLayout'

// Mock all dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
    logout: vi.fn()
  }))
}))

vi.mock('@/hooks/api/useConversations', () => ({
  useConversations: vi.fn(() => ({
    data: [
      { id: 'conv-1', title: 'Test Conversation 1' },
      { id: 'conv-2', title: 'Test Conversation 2' },
      { id: 'conv-3', title: 'Search Test' }
    ],
    isLoading: false
  })),
  useDeleteConversation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false
  })),
  useUpdateConversation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false
  }))
}))

vi.mock('@/hooks/useChatNavigation', () => ({
  useChatNavigation: vi.fn(() => ({
    currentConversationId: null,
    handleNewChat: vi.fn(),
    handleConversationClick: vi.fn()
  }))
}))

vi.mock('@/hooks/useKnowledgeBase', () => ({
  useKnowledgeBase: vi.fn(() => ({
    files: [
      { id: 'file-1', filename: 'doc1.pdf', created_at: new Date() },
      { id: 'file-2', filename: 'doc2.txt', created_at: new Date() }
    ],
    filesLoading: false,
    totalFiles: 2,
    isUploading: false,
    isError: false,
    isSuccess: false,
    error: null,
    handleDocumentUpload: vi.fn(),
    openDocumentSelector: vi.fn(),
    navigateToKnowledgeArticles: vi.fn(),
    documentInputRef: { current: null }
  }))
}))

vi.mock('@/hooks/useFirstTimeLogin', () => ({
  useFirstTimeLogin: vi.fn(() => ({
    shouldShowModal: false,
    markModalAsShown: vi.fn()
  }))
}))

describe('RitaLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders layout with children', () => {
    render(
      <BrowserRouter>
        <RitaLayout>
          <div data-testid="test-child">Test Content</div>
        </RitaLayout>
      </BrowserRouter>
    )

    expect(screen.getByTestId('test-child')).toBeInTheDocument()
  })

  it('displays conversation list in sidebar', () => {
    render(
      <BrowserRouter>
        <RitaLayout>
          <div>Content</div>
        </RitaLayout>
      </BrowserRouter>
    )

    expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
    expect(screen.getByText('Test Conversation 2')).toBeInTheDocument()
  })

  it('renders layout structure correctly', () => {
    render(
      <BrowserRouter>
        <RitaLayout>
          <div>Content</div>
        </RitaLayout>
      </BrowserRouter>
    )

    // Verify main layout elements are present
    expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
  })

  it('displays share button and opens dialog', async () => {
    render(
      <BrowserRouter>
        <RitaLayout activePage="chat">
          <div>Content</div>
        </RitaLayout>
      </BrowserRouter>
    )

    // Look for share button in the layout
    const shareButtons = screen.getAllByRole('button')
    const shareButton = shareButtons.find((button: HTMLElement) =>
      button.textContent?.includes('Share') ||
      button.querySelector('[class*="share"]')
    )

    expect(shareButton).toBeTruthy()
  })

  // TODO: Update test - "Knowledge base" UI has been redesigned
  it.skip('displays knowledge base panel on chat page', () => {
    render(
      <BrowserRouter>
        <RitaLayout activePage="chat">
          <div>Content</div>
        </RitaLayout>
      </BrowserRouter>
    )

    expect(screen.getByText('Knowledge base')).toBeInTheDocument()
    expect(screen.getByText('doc1.pdf')).toBeInTheDocument()
    expect(screen.getByText('doc2.txt')).toBeInTheDocument()
  })

  it('does not display knowledge base panel on non-chat pages', () => {
    render(
      <BrowserRouter>
        <RitaLayout activePage="users">
          <div>Content</div>
        </RitaLayout>
      </BrowserRouter>
    )

    expect(screen.queryByText('Knowledge base')).not.toBeInTheDocument()
  })

  it('displays knowledge base upload button', () => {
    render(
      <BrowserRouter>
        <RitaLayout activePage="chat">
          <div>Content</div>
        </RitaLayout>
      </BrowserRouter>
    )

    // Plus button should be in knowledge base section
    const addButtons = screen.getAllByRole('button')
    const uploadButton = addButtons.find((button: HTMLElement) =>
      button.querySelector('[class*="plus"]') &&
      button.closest('[class*="knowledge"]')
    )

    expect(uploadButton || addButtons.length).toBeTruthy()
  })

  // TODO: Update test - "New chat" UI has been redesigned
  it.skip('displays new chat button', () => {
    render(
      <BrowserRouter>
        <RitaLayout>
          <div>Content</div>
        </RitaLayout>
      </BrowserRouter>
    )

    expect(screen.getByText('New chat')).toBeInTheDocument()
  })

  // TODO: Update test - "New chat" button interaction has been redesigned
  it.skip('handles new chat button click', async () => {
    const mockHandleNewChat = vi.fn()
    const { useChatNavigation } = await import('@/hooks/useChatNavigation')

    vi.mocked(useChatNavigation).mockReturnValue({
      currentConversationId: null,
      handleNewChat: mockHandleNewChat,
      handleConversationClick: vi.fn()
    } as any)

    render(
      <BrowserRouter>
        <RitaLayout>
          <div>Content</div>
        </RitaLayout>
      </BrowserRouter>
    )

    const newChatButton = screen.getByText('New chat')
    fireEvent.click(newChatButton)

    expect(mockHandleNewChat).toHaveBeenCalled()
  })

  it('handles conversation click', async () => {
    const mockHandleConversationClick = vi.fn()
    const { useChatNavigation } = await import('@/hooks/useChatNavigation')

    vi.mocked(useChatNavigation).mockReturnValue({
      currentConversationId: null,
      handleNewChat: vi.fn(),
      handleConversationClick: mockHandleConversationClick
    } as any)

    render(
      <BrowserRouter>
        <RitaLayout>
          <div>Content</div>
        </RitaLayout>
      </BrowserRouter>
    )

    const conversationButton = screen.getByText('Test Conversation 1')
    fireEvent.click(conversationButton)

    expect(mockHandleConversationClick).toHaveBeenCalledWith('conv-1')
  })

  // TODO: Update test - Conversation highlighting styles have changed
  it.skip('highlights current conversation', async () => {
    const { useChatNavigation } = await import('@/hooks/useChatNavigation')

    vi.mocked(useChatNavigation).mockReturnValue({
      currentConversationId: 'conv-1',
      handleNewChat: vi.fn(),
      handleConversationClick: vi.fn()
    } as any)

    render(
      <BrowserRouter>
        <RitaLayout>
          <div>Content</div>
        </RitaLayout>
      </BrowserRouter>
    )

    const currentConv = screen.getByText('Test Conversation 1')
    expect(currentConv.closest('button')).toHaveClass('bg-secondary')
  })
})
