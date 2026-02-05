/**
 * ConversationListItem - Sidebar conversation item with rename and delete actions
 *
 * Displays a conversation in the sidebar with:
 * - Click to navigate to conversation
 * - Hover-revealed ellipsis menu
 * - Rename action with inline edit dialog
 * - Delete action with confirmation dialog
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Trash2, Pencil } from "lucide-react"
import { useDeleteConversation, useUpdateConversation } from "@/hooks/api/useConversations"
import type { Conversation } from "@/stores/conversationStore"

interface ConversationListItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: (conversationId: string) => void
}

export function ConversationListItem({
  conversation,
  isActive,
  onClick,
}: ConversationListItemProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const deleteConversationMutation = useDeleteConversation()
  const updateConversationMutation = useUpdateConversation()

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditedTitle(conversation.title)
    setRenameDialogOpen(true)
  }

  const handleConfirmRename = () => {
    if (editedTitle.trim().length === 0) return
    updateConversationMutation.mutate({
      conversationId: conversation.id,
      title: editedTitle.trim()
    })
    setRenameDialogOpen(false)
  }

  const handleCancelRename = () => {
    setRenameDialogOpen(false)
    setEditedTitle("")
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    deleteConversationMutation.mutate(conversation.id)
    setDeleteDialogOpen(false)
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
  }

  return (
    <>
      <SidebarMenuItem className="min-w-0 group">
        <div className={`flex items-center gap-1 min-w-0 group/item rounded-md hover:bg-sidebar-accent ${isActive ? 'bg-sidebar-accent' : ''}`}>
          <SidebarMenuButton
            className="px-2 py-2 h-8 text-sm text-sidebar-foreground min-w-0 flex-1 hover:bg-transparent data-[active=true]:bg-transparent"
            onClick={() => onClick(conversation.id)}
            isActive={isActive}
          >
            <span className="truncate min-w-0">{conversation.title}</span>
          </SidebarMenuButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-transparent"
                onClick={(e) => e.stopPropagation()}
                aria-label="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRenameClick}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarMenuItem>

      {/* Rename Dialog */}
      <AlertDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new title for this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="Conversation title"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editedTitle.trim().length > 0) {
                  handleConfirmRename()
                }
              }}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRename}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRename}
              disabled={editedTitle.trim().length === 0}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{conversation.title}"? This action cannot be undone and will permanently delete all messages in this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete conversation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
