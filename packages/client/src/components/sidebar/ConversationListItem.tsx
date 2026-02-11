/**
 * ConversationListItem - Sidebar conversation item with rename and delete actions
 *
 * Displays a conversation in the sidebar with:
 * - Click to navigate to conversation
 * - Hover-revealed ellipsis menu
 * - Rename action with inline edit dialog
 * - Delete action with confirmation dialog
 */

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import {
	useDeleteConversation,
	useUpdateConversation,
} from "@/hooks/api/useConversations";
import type { Conversation } from "@/stores/conversationStore";

interface ConversationListItemProps {
	conversation: Conversation;
	isActive: boolean;
	onClick: (conversationId: string) => void;
}

export function ConversationListItem({
	conversation,
	isActive,
	onClick,
}: ConversationListItemProps) {
	const { t } = useTranslation(["common", "chat"]);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [editedTitle, setEditedTitle] = useState("");
	const deleteConversationMutation = useDeleteConversation();
	const updateConversationMutation = useUpdateConversation();

	const handleRenameClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setEditedTitle(conversation.title);
		setRenameDialogOpen(true);
	};

	const handleConfirmRename = () => {
		if (editedTitle.trim().length === 0) return;
		updateConversationMutation.mutate({
			conversationId: conversation.id,
			title: editedTitle.trim(),
		});
		setRenameDialogOpen(false);
	};

	const handleCancelRename = () => {
		setRenameDialogOpen(false);
		setEditedTitle("");
	};

	const handleDeleteClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = () => {
		deleteConversationMutation.mutate(conversation.id);
		setDeleteDialogOpen(false);
	};

	const handleCancelDelete = () => {
		setDeleteDialogOpen(false);
	};

	return (
		<>
			<SidebarMenuItem className="min-w-0 group">
				<div
					className={`flex items-center gap-1 min-w-0 group/item rounded-md hover:bg-sidebar-accent ${isActive ? "bg-sidebar-accent" : ""}`}
				>
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
								aria-label={t("accessibility.moreOptions")}
							>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={handleRenameClick}>
								<Pencil className="h-4 w-4 mr-2" />
								{t("actions.rename")}
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={handleDeleteClick}
							>
								<Trash2 className="h-4 w-4 mr-2" />
								{t("actions.delete")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</SidebarMenuItem>

			{/* Rename Dialog */}
			<AlertDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("conversation.renameTitle", { ns: "chat" })}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("conversation.renameDescription", { ns: "chat" })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="py-4">
						<Input
							value={editedTitle}
							onChange={(e) => setEditedTitle(e.target.value)}
							placeholder={t("conversation.titlePlaceholder", { ns: "chat" })}
							onKeyDown={(e) => {
								if (e.key === "Enter" && editedTitle.trim().length > 0) {
									handleConfirmRename();
								}
							}}
							autoFocus
						/>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancelRename}>
							{t("actions.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmRename}
							disabled={editedTitle.trim().length === 0}
						>
							{t("actions.save")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("deleteDialog.title", { ns: "chat" })}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("deleteDialog.message", {
								ns: "chat",
								title: conversation.title,
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancelDelete}>
							{t("actions.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							{t("deleteDialog.delete", { ns: "chat" })}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
