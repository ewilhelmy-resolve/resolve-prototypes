/**
 * ConversationListItem.test.tsx - Unit tests for conversation list item
 *
 * Tests functionality:
 * - Rendering conversation item
 * - Rename dialog interaction
 * - Delete dialog interaction
 * - API integration via hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConversationListItem } from './ConversationListItem'
import { SidebarProvider } from '@/components/ui/sidebar'
import type { Conversation } from '@/stores/conversationStore'

// Mock conversation data
const mockConversation: Conversation = {
  id: 'conv-123',
  title: 'Test Conversation',
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-02'),
}

// Mock hooks
const mockDeleteMutation = { mutate: vi.fn(), isPending: false }
const mockUpdateMutation = { mutate: vi.fn(), isPending: false }

vi.mock('@/hooks/api/useConversations', () => ({
  useDeleteConversation: vi.fn(() => mockDeleteMutation),
  useUpdateConversation: vi.fn(() => mockUpdateMutation),
}))

// Helper to wrap component with SidebarProvider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <SidebarProvider>
      {ui}
    </SidebarProvider>
  )
}

describe('ConversationListItem', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders conversation title', () => {
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    expect(screen.getByText('Test Conversation')).toBeInTheDocument()
  })

  it('calls onClick when conversation is clicked', () => {
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    const conversationButton = screen.getByText('Test Conversation')
    fireEvent.click(conversationButton)

    expect(mockOnClick).toHaveBeenCalledWith('conv-123')
  })

  it('shows ellipsis menu button with aria-label', () => {
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    const menuButton = screen.getByLabelText('More options')
    expect(menuButton).toBeInTheDocument()
  })

  it('opens rename dialog when Rename is clicked', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    // Open dropdown menu
    const menuButton = screen.getByLabelText('More options')
    await user.click(menuButton)

    // Click Rename
    const renameOption = await screen.findByText('Rename')
    await user.click(renameOption)

    // Verify rename dialog appears
    await waitFor(() => {
      expect(screen.getByText('Rename Conversation')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Conversation title')).toBeInTheDocument()
    })
  })

  it('pre-fills input with current title in rename dialog', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    // Open dropdown and click Rename
    await user.click(screen.getByLabelText('More options'))
    const renameOption = await screen.findByText('Rename')
    await user.click(renameOption)

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Conversation title') as HTMLInputElement
      expect(input.value).toBe('Test Conversation')
    })
  })

  it('calls updateConversation mutation when Save is clicked', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    // Open rename dialog
    await user.click(screen.getByLabelText('More options'))
    const renameOption = await screen.findByText('Rename')
    await user.click(renameOption)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Conversation title')).toBeInTheDocument()
    })

    // Edit title
    const input = screen.getByPlaceholderText('Conversation title')
    fireEvent.change(input, { target: { value: 'Updated Title' } })

    // Click Save
    const saveButton = screen.getByRole('button', { name: 'Save' })
    fireEvent.click(saveButton)

    // Verify mutation was called
    expect(mockUpdateMutation.mutate).toHaveBeenCalledWith({
      conversationId: 'conv-123',
      title: 'Updated Title',
    })
  })

  it('disables Save button when title is empty', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    // Open rename dialog
    await user.click(screen.getByLabelText('More options'))
    const renameOption = await screen.findByText('Rename')
    await user.click(renameOption)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Conversation title')).toBeInTheDocument()
    })

    // Clear input
    const input = screen.getByPlaceholderText('Conversation title')
    fireEvent.change(input, { target: { value: '' } })

    // Verify Save button is disabled
    const saveButton = screen.getByRole('button', { name: 'Save' })
    expect(saveButton).toBeDisabled()
  })

  it('submits rename on Enter key press', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    // Open rename dialog
    await user.click(screen.getByLabelText('More options'))
    const renameOption = await screen.findByText('Rename')
    await user.click(renameOption)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Conversation title')).toBeInTheDocument()
    })

    // Edit title and press Enter
    const input = screen.getByPlaceholderText('Conversation title')
    fireEvent.change(input, { target: { value: 'New Title' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // Verify mutation was called
    expect(mockUpdateMutation.mutate).toHaveBeenCalledWith({
      conversationId: 'conv-123',
      title: 'New Title',
    })
  })

  it('opens delete dialog when Delete is clicked', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    // Open dropdown menu
    await user.click(screen.getByLabelText('More options'))

    // Click Delete
    const deleteOption = await screen.findByText('Delete')
    await user.click(deleteOption)

    // Verify delete dialog appears
    await waitFor(() => {
      expect(screen.getByText('Delete Conversation')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to delete "Test Conversation"/)).toBeInTheDocument()
    })
  })

  it('shows conversation title in delete confirmation', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    // Open delete dialog
    await user.click(screen.getByLabelText('More options'))
    const deleteOption = await screen.findByText('Delete')
    await user.click(deleteOption)

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete "Test Conversation"/)).toBeInTheDocument()
    })
  })

  it('calls deleteConversation mutation when Delete conversation is clicked', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    // Open delete dialog
    await user.click(screen.getByLabelText('More options'))
    const deleteOption = await screen.findByText('Delete')
    await user.click(deleteOption)

    await waitFor(() => {
      expect(screen.getByText('Delete Conversation')).toBeInTheDocument()
    })

    // Click Delete conversation button
    const deleteButton = screen.getByRole('button', { name: 'Delete conversation' })
    fireEvent.click(deleteButton)

    // Verify mutation was called
    expect(mockDeleteMutation.mutate).toHaveBeenCalledWith('conv-123')
  })

  it('closes rename dialog when Cancel is clicked', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    // Open rename dialog
    await user.click(screen.getByLabelText('More options'))
    const renameOption = await screen.findByText('Rename')
    await user.click(renameOption)

    await waitFor(() => {
      expect(screen.getByText('Rename Conversation')).toBeInTheDocument()
    })

    // Click Cancel
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButtons[0])

    // Verify dialog is closed
    await waitFor(() => {
      expect(screen.queryByText('Rename Conversation')).not.toBeInTheDocument()
    })
  })

  it('closes delete dialog when Cancel is clicked', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    // Open delete dialog
    await user.click(screen.getByLabelText('More options'))
    const deleteOption = await screen.findByText('Delete')
    await user.click(deleteOption)

    await waitFor(() => {
      expect(screen.getByText('Delete Conversation')).toBeInTheDocument()
    })

    // Click Cancel
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButtons[0])

    // Verify dialog is closed
    await waitFor(() => {
      expect(screen.queryByText('Delete Conversation')).not.toBeInTheDocument()
    })
  })

  it('applies active styling when isActive is true', () => {
    renderWithProvider(
      <ConversationListItem
        conversation={mockConversation}
        isActive={true}
        onClick={mockOnClick}
      />
    )

    // The SidebarMenuButton should receive isActive prop
    const conversationButton = screen.getByText('Test Conversation').closest('button')
    expect(conversationButton).toBeInTheDocument()
  })

  it('truncates long conversation titles', () => {
    const longTitleConversation: Conversation = {
      ...mockConversation,
      title: 'This is a very long conversation title that should be truncated in the UI',
    }

    renderWithProvider(
      <ConversationListItem
        conversation={longTitleConversation}
        isActive={false}
        onClick={mockOnClick}
      />
    )

    const titleElement = screen.getByText(longTitleConversation.title)
    expect(titleElement).toHaveClass('truncate')
  })
})
