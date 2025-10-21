/**
 * ChatV1Content.test.tsx - Unit tests for chat content attachment permissions
 *
 * Tests critical attachment upload permission functionality:
 * - Admin/owner users can see and use attachment features
 * - Regular users cannot see or use attachment features
 * - Drag-and-drop is enabled/disabled based on role
 * - Attachment buttons are visible/hidden based on role
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

  describe('Admin/Owner User Permissions', () => {
    beforeEach(() => {
      // Mock user as admin/owner
      mockIsOwnerOrAdmin.mockReturnValue(true)
    })

    it('shows drag-and-drop overlay for admin users', () => {
      const props = createDefaultProps()
      render(<ChatV1Content {...props} />)

      const overlay = screen.getByTestId('drag-drop-overlay')
      expect(overlay).toBeInTheDocument()
    })

    it('shows attachment button for admin users', () => {
      const props = createDefaultProps()
      render(<ChatV1Content {...props} />)

      // Find button by its sr-only text content
      const attachmentButton = screen.getByText('Add attachment', { selector: '.sr-only' })
      expect(attachmentButton).toBeInTheDocument()
      expect(attachmentButton.closest('button')).toBeInTheDocument()
    })

    it('enables drag-and-drop for admin users when not uploading', async () => {
      const props = createDefaultProps()
      const { useDragAndDrop } = await import('@/hooks/useDragAndDrop')

      render(<ChatV1Content {...props} />)

      // Verify useDragAndDrop was called with enabled: true
      expect(useDragAndDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true, // !uploadStatus.isUploading && isAdmin
        })
      )
    })

    it('disables drag-and-drop for admin users when uploading', async () => {
      const props = createDefaultProps()
      props.uploadStatus.isUploading = true
      const { useDragAndDrop } = await import('@/hooks/useDragAndDrop')

      render(<ChatV1Content {...props} />)

      // Verify useDragAndDrop was called with enabled: false
      expect(useDragAndDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false, // isUploading is true
        })
      )
    })

    it('does not disable attachment button when not uploading', () => {
      const props = createDefaultProps()
      render(<ChatV1Content {...props} />)

      const attachmentText = screen.getByText('Add attachment', { selector: '.sr-only' })
      const attachmentButton = attachmentText.closest('button')
      expect(attachmentButton).not.toBeDisabled()
    })

    it('disables attachment button when uploading', () => {
      const props = createDefaultProps()
      props.uploadStatus.isUploading = true

      render(<ChatV1Content {...props} />)

      const attachmentText = screen.getByText('Add attachment', { selector: '.sr-only' })
      const attachmentButton = attachmentText.closest('button')
      expect(attachmentButton).toBeDisabled()
    })
  })

  describe('Regular User Permissions', () => {
    beforeEach(() => {
      // Mock user as regular (non-admin)
      mockIsOwnerOrAdmin.mockReturnValue(false)
    })

    it('does NOT show drag-and-drop overlay for regular users', () => {
      const props = createDefaultProps()
      render(<ChatV1Content {...props} />)

      const overlay = screen.queryByTestId('drag-drop-overlay')
      expect(overlay).not.toBeInTheDocument()
    })

    it('does NOT show attachment button for regular users', () => {
      const props = createDefaultProps()
      render(<ChatV1Content {...props} />)

      const attachmentText = screen.queryByText('Add attachment', { selector: '.sr-only' })
      expect(attachmentText).not.toBeInTheDocument()
    })

    it('disables drag-and-drop for regular users', async () => {
      const props = createDefaultProps()
      const { useDragAndDrop } = await import('@/hooks/useDragAndDrop')

      render(<ChatV1Content {...props} />)

      // Verify useDragAndDrop was called with enabled: false
      expect(useDragAndDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false, // !isAdmin
        })
      )
    })

    it('renders chat interface without attachment features', () => {
      const props = createDefaultProps()
      render(<ChatV1Content {...props} />)

      // Verify basic chat interface is present
      const textarea = screen.getByPlaceholderText(/ask me anything/i)
      expect(textarea).toBeInTheDocument()

      // Verify attachment features are absent
      expect(screen.queryByTestId('drag-drop-overlay')).not.toBeInTheDocument()
      expect(screen.queryByText('Add attachment', { selector: '.sr-only' })).not.toBeInTheDocument()
    })
  })

  describe('Permission Edge Cases', () => {
    it('handles permission check returning undefined', () => {
      // Mock permission returning undefined (not loaded yet)
      mockIsOwnerOrAdmin.mockReturnValue(undefined)

      const props = createDefaultProps()
      render(<ChatV1Content {...props} />)

      // Should treat undefined as false (no permissions)
      const overlay = screen.queryByTestId('drag-drop-overlay')
      expect(overlay).not.toBeInTheDocument()

      const attachmentText = screen.queryByText('Add attachment', { selector: '.sr-only' })
      expect(attachmentText).not.toBeInTheDocument()
    })

    it('re-renders correctly when permissions change from false to true', async () => {
      // Start with no permissions
      mockIsOwnerOrAdmin.mockReturnValue(false)

      const props = createDefaultProps()
      const { rerender } = render(<ChatV1Content {...props} />)

      // Verify no attachment features
      expect(screen.queryByTestId('drag-drop-overlay')).not.toBeInTheDocument()
      expect(screen.queryByText('Add attachment', { selector: '.sr-only' })).not.toBeInTheDocument()

      // Update permissions to admin
      mockIsOwnerOrAdmin.mockReturnValue(true)
      rerender(<ChatV1Content {...props} />)

      // Wait for update and verify attachment features appear
      await waitFor(() => {
        expect(screen.getByTestId('drag-drop-overlay')).toBeInTheDocument()
        expect(screen.getByText('Add attachment', { selector: '.sr-only' })).toBeInTheDocument()
      })
    })

    it('combines upload status and permission checks correctly', async () => {
      mockIsOwnerOrAdmin.mockReturnValue(true)

      const props = createDefaultProps()
      props.uploadStatus.isUploading = true

      const { useDragAndDrop } = await import('@/hooks/useDragAndDrop')

      render(<ChatV1Content {...props} />)

      // Both conditions must be true: !isUploading AND isAdmin
      expect(useDragAndDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false, // isUploading is true, so disabled
        })
      )
    })
  })

  describe('Drag-and-Drop Configuration', () => {
    beforeEach(() => {
      mockIsOwnerOrAdmin.mockReturnValue(true)
    })

    it('configures drag-and-drop with correct file types', async () => {
      const props = createDefaultProps()
      const { useDragAndDrop } = await import('@/hooks/useDragAndDrop')

      render(<ChatV1Content {...props} />)

      expect(useDragAndDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          accept: "image/*,.pdf,.txt,.md,.doc,.docx,.xls,.xlsx",
          maxFiles: 5,
          maxFileSize: 10 * 1024 * 1024, // 10MB
        })
      )
    })

    it('passes onDrop and onError handlers to drag-and-drop hook', async () => {
      const props = createDefaultProps()
      const { useDragAndDrop } = await import('@/hooks/useDragAndDrop')

      render(<ChatV1Content {...props} />)

      expect(useDragAndDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          onDrop: expect.any(Function),
          onError: expect.any(Function),
        })
      )
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockIsOwnerOrAdmin.mockReturnValue(true)
    })

    it('provides sr-only label for attachment button', () => {
      const props = createDefaultProps()
      render(<ChatV1Content {...props} />)

      const srOnly = screen.getByText('Add attachment', { selector: '.sr-only' })
      expect(srOnly).toBeInTheDocument()
      expect(srOnly).toHaveTextContent('Add attachment')
      expect(srOnly).toHaveClass('sr-only')
    })

    it('includes proper ARIA attributes on interactive elements', () => {
      const props = createDefaultProps()
      render(<ChatV1Content {...props} />)

      const attachmentText = screen.getByText('Add attachment', { selector: '.sr-only' })
      const attachmentButton = attachmentText.closest('button')
      expect(attachmentButton).toHaveAttribute('type', 'button')
    })
  })
})
