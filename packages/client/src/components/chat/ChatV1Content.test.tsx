/**
 * ChatV1Content.test.tsx - Unit tests for chat content attachment permissions
 *
 * Tests attachment upload functionality (currently disabled):
 * - All attachment features are temporarily disabled for ALL users
 * - Drag-and-drop overlay still conditionally shown for admins (non-functional)
 * - Permission checks remain in place for future re-enablement
 * - Tests verify permission-based conditional rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChatV1Content from './ChatV1Content'
import type { ChatV1ContentProps } from './ChatV1Content'

// Mock dependencies
const mockIsOwnerOrAdmin = vi.fn()
const mockIsDragging = vi.fn(() => false)
const mockUploadFileMutation = { mutate: vi.fn(), isPending: false }

vi.mock('@/hooks/api/useProfile', () => ({
  useProfilePermissions: vi.fn(() => ({
    isOwnerOrAdmin: mockIsOwnerOrAdmin,
    hasRole: vi.fn(),
    isOwner: vi.fn(),
    isAdmin: vi.fn(),
    canManageInvitations: vi.fn(),
    canManageMembers: vi.fn(),
    canManageOrganization: vi.fn(),
    canDeleteConversations: vi.fn(),
    canManageFiles: vi.fn(),
  })),
}))

vi.mock('@/hooks/useDragAndDrop', () => ({
  useDragAndDrop: vi.fn((config: any) => ({
    isDragging: mockIsDragging(),
    enabled: config.enabled,
  })),
}))

vi.mock('@/hooks/api/useFiles', () => ({
  useUploadFile: vi.fn(() => mockUploadFileMutation),
}))

vi.mock('@/stores/conversationStore', () => ({
  useConversationStore: vi.fn(() => ({
    chatMessages: [],
    currentConversationId: null,
  })),
}))

vi.mock('@/hooks/useChatPagination', () => ({
  useChatPagination: vi.fn(() => ({
    displayedMessages: [],
    hasMore: false,
    isLoading: false,
    loadMore: vi.fn(),
    containerRef: { current: null },
  })),
}))

vi.mock('@/components/citations', () => ({
  Citations: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('./ResponseWithInlineCitations', () => ({
  ResponseWithInlineCitations: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('./DragDropOverlay', () => ({
  DragDropOverlay: ({ isDragging }: { isDragging: boolean }) => (
    <div data-testid="drag-drop-overlay" data-dragging={isDragging}>
      Drag and Drop Overlay
    </div>
  ),
}))

// Helper to create default props
const createDefaultProps = (): ChatV1ContentProps => ({
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
    isSuccess: false,
  },
  fileInputRef: { current: null },
})

describe('ChatV1Content - Attachment Upload Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Attachment Upload Disabled', () => {
    it('does NOT show drag-and-drop overlay for any users', () => {
      mockIsOwnerOrAdmin.mockReturnValue(true) // Even for admins
      const props = createDefaultProps()
      render(<ChatV1Content {...props} />)

      const overlay = screen.queryByTestId('drag-drop-overlay')
      expect(overlay).not.toBeInTheDocument()
    })

    it('disables drag-and-drop hook for all users', async () => {
      mockIsOwnerOrAdmin.mockReturnValue(true)
      const props = createDefaultProps()
      const { useDragAndDrop } = await import('@/hooks/useDragAndDrop')

      render(<ChatV1Content {...props} />)

      // Verify useDragAndDrop was called with enabled: false (disabled for all)
      expect(useDragAndDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('renders chat interface without attachment features', () => {
      const props = createDefaultProps()
      render(<ChatV1Content {...props} />)

      // Verify basic chat interface is present
      const textarea = screen.getByPlaceholderText(/ask me anything/i)
      expect(textarea).toBeInTheDocument()

      // Verify drag-and-drop overlay is absent (no attachment features)
      expect(screen.queryByTestId('drag-drop-overlay')).not.toBeInTheDocument()
    })
  })
})
