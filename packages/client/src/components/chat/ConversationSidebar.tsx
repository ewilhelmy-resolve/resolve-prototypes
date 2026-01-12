/** biome-ignore-all lint/a11y/noStaticElementInteractions: temporary */

import {
	Clock,
	Edit2,
	Hash,
	LogOut,
	MessageSquare,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	Search,
	Trash2,
	User,
	Users,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
	useConversations,
	useDeleteConversation,
	useUpdateConversation,
} from "@/hooks/api/useConversations.ts";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils.ts";
import { useConversationStore } from "@/stores/conversationStore.ts";
import { useUIStore } from "@/stores/uiStore.ts";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";

interface ConversationItemProps {
	conversation: {
		id: string;
		title: string;
		created_at: Date;
		updated_at: Date;
	};
	isActive: boolean;
	onClick: () => void;
}

function ConversationItem({
	conversation,
	isActive,
	onClick,
}: ConversationItemProps) {
	const { t } = useTranslation("chat");
	const [isEditing, setIsEditing] = useState(false);
	const [editTitle, setEditTitle] = useState(conversation.title);
	const [showActions, setShowActions] = useState(false);

	const updateConversationMutation = useUpdateConversation();
	const deleteConversationMutation = useDeleteConversation();

	const handleEdit = () => {
		setIsEditing(true);
		setShowActions(false);
	};

	const handleSaveEdit = async () => {
		if (editTitle.trim() && editTitle.trim() !== conversation.title) {
			try {
				await updateConversationMutation.mutateAsync({
					conversationId: conversation.id,
					title: editTitle.trim(),
				});
			} catch (error) {
				console.error("Failed to update conversation title:", error);
				// Reset to original title on error
				setEditTitle(conversation.title);
			}
		}
		setIsEditing(false);
	};

	const handleCancelEdit = () => {
		setEditTitle(conversation.title);
		setIsEditing(false);
	};

	const handleDelete = async () => {
		try {
			await deleteConversationMutation.mutateAsync(conversation.id);
		} catch (error) {
			console.error("Failed to delete conversation:", error);
		}
		setShowActions(false);
	};

	const formatTime = (date: Date) => {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) {
			return date.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
		} else if (days === 1) {
			return t("sidebar.yesterday");
		} else if (days < 7) {
			return date.toLocaleDateString([], { weekday: "short" });
		} else {
			return date.toLocaleDateString([], { month: "short", day: "numeric" });
		}
	};

	return (
		<div
			className={cn(
				"group relative p-3 rounded-lg cursor-pointer transition-all duration-200",
				"hover:bg-sidebar-accent/50 hover:scale-[1.02] hover:shadow-sm",
				isActive && "bg-sidebar-accent shadow-sm scale-[1.01]",
			)}
			onClick={onClick}
			onMouseEnter={() => setShowActions(true)}
			onMouseLeave={() => setShowActions(false)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<Hash className="h-3 w-3 text-sidebar-foreground/40 flex-shrink-0" />
						{isEditing ? (
							<Input
								value={editTitle}
								onChange={(e) => setEditTitle(e.target.value)}
								onBlur={handleSaveEdit}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleSaveEdit();
									}
									if (e.key === "Escape") {
										e.preventDefault();
										handleCancelEdit();
									}
								}}
								className="h-6 text-sm font-medium bg-transparent border-none p-0 focus:ring-1 focus:ring-primary"
								autoFocus
								onClick={(e) => e.stopPropagation()}
								disabled={updateConversationMutation.isPending}
							/>
						) : (
							<span className="text-sm font-medium text-sidebar-foreground truncate">
								{conversation.title}
							</span>
						)}
					</div>

					<div className="flex items-center gap-1 text-xs text-sidebar-foreground/60">
						<Clock className="h-3 w-3" />
						<span>{formatTime(conversation.updated_at)}</span>
					</div>
				</div>

				{/* Actions */}
				{showActions && !isEditing && (
					<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
						<Button
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground"
							onClick={(e) => {
								e.stopPropagation();
								handleEdit();
							}}
							disabled={
								updateConversationMutation.isPending ||
								deleteConversationMutation.isPending
							}
						>
							<Edit2 className="h-3 w-3" />
						</Button>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0 text-sidebar-foreground/60 hover:text-destructive"
									onClick={(e) => {
										e.stopPropagation();
									}}
									disabled={
										updateConversationMutation.isPending ||
										deleteConversationMutation.isPending
									}
								>
									<Trash2 className="h-3 w-3" />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
									<AlertDialogDescription>
										{t("deleteDialog.message", { title: conversation.title })}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleDelete}
										className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
									>
										{t("deleteDialog.delete")}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				)}
			</div>
		</div>
	);
}

export function ConversationSidebar() {
	const { t } = useTranslation("chat");
	const [searchQuery, setSearchQuery] = useState("");
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	const { isSidebarOpen, toggleSidebar } = useUIStore();
	const { conversations, currentConversationId, clearCurrentConversation } =
		useConversationStore();
	const { data: fetchedConversations, isLoading } = useConversations();

	// Use fetched conversations if available, fallback to store
	const conversationList = fetchedConversations || conversations;

	// Filter conversations based on search
	const filteredConversations = conversationList.filter((conv) =>
		conv.title.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const handleNewChat = () => {
		clearCurrentConversation();
		navigate("/chat");
	};

	const handleConversationClick = (conversationId: string) => {
		navigate(`/chat/${conversationId}`);
	};

	return (
		<>
			{/* Mobile Overlay */}
			{isSidebarOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-40 lg:hidden"
					onClick={toggleSidebar}
				/>
			)}

			{/* Sidebar */}
			<div
				className={cn(
					"fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-50 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
					isSidebarOpen ? "translate-x-0" : "-translate-x-full",
					"w-64",
				)}
			>
				<div className="flex flex-col h-full">
					{/* Mobile Branding - only show on mobile when sidebar is floating */}
					<div className="bg-blue-600 text-white px-4 py-3 lg:hidden">
						<div className="flex items-center gap-2">
							<div className="bg-white text-blue-600 px-2 py-1 rounded font-bold text-sm">
								RESOLVE
							</div>
							<span className="text-sm opacity-90">RITA Go</span>
						</div>
					</div>

					{/* Navigation */}
					<div className="p-4 border-b border-gray-200">
						<Button
							variant="outline"
							size="sm"
							className="w-full justify-center mb-4 bg-transparent border-blue-300 text-blue-700 hover:bg-blue-50"
							onClick={handleNewChat}
						>
							<Plus className="w-4 h-4 mr-2" />
							{t("sidebar.newChat")}
						</Button>

						<nav className="space-y-2">
							<div className="relative">
								<Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
								<Input
									type="text"
									placeholder={t("sidebar.searchPlaceholder")}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10 h-9 bg-gray-50 border-gray-200 focus:bg-white"
								/>
							</div>
							<Button
								variant="ghost"
								className="w-full justify-start text-gray-700 hover:bg-gray-100"
							>
								<svg
									className="w-4 h-4 mr-3"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
								{t("sidebar.analytics")}
							</Button>
							<Link to="/files" className="w-full">
								<Button
									variant="ghost"
									className="w-full justify-start text-gray-700 hover:bg-gray-100"
								>
									<svg
										className="w-4 h-4 mr-3"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
										/>
									</svg>
									{t("sidebar.knowledgeArticles")}
								</Button>
							</Link>
							<Button
								variant="ghost"
								className="w-full justify-start text-gray-700 hover:bg-gray-100"
							>
								<Users className="w-4 h-4 mr-3" />
								{t("sidebar.users")}
							</Button>
						</nav>
					</div>

					{/* Recent Chats */}
					<div className="flex-1 overflow-y-auto p-4">
						<h3 className="text-sm font-medium text-gray-900 mb-3">
							{t("sidebar.recentChats")}
						</h3>
						{isLoading ? (
							<div className="space-y-1">
								{[...Array(5)].map((_, i) => (
									<div key={i} className="p-3 rounded-lg">
										<div className="flex items-start gap-2">
											<Skeleton className="h-3 w-3 rounded-sm flex-shrink-0 mt-0.5" />
											<div className="flex-1 space-y-2">
												<Skeleton className="h-4 w-3/4" />
												<Skeleton className="h-3 w-1/3" />
											</div>
										</div>
									</div>
								))}
							</div>
						) : filteredConversations.length === 0 ? (
							<div className="text-center py-8">
								{searchQuery ? (
									<div>
										<Search className="h-8 w-8 mx-auto mb-3 text-sidebar-foreground/40" />
										<p className="text-sm text-sidebar-foreground/60">
											{t("sidebar.noResults")}
										</p>
										<p className="text-xs text-sidebar-foreground/40 mt-1">
											{t("sidebar.tryDifferentSearch")}
										</p>
									</div>
								) : (
									<div>
										<MessageSquare className="h-8 w-8 mx-auto mb-3 text-sidebar-foreground/40" />
										<p className="text-sm text-sidebar-foreground/60 mb-2">
											{t("sidebar.noConversations")}
										</p>
										<Button
											variant="outline"
											size="sm"
											onClick={handleNewChat}
											className="gap-1 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
										>
											<Plus className="h-3 w-3" />
											{t("sidebar.startFirstChat")}
										</Button>
									</div>
								)}
							</div>
						) : (
							<div className="space-y-1">
								{filteredConversations.map((conversation) => (
									<ConversationItem
										key={conversation.id}
										conversation={conversation}
										isActive={conversation.id === currentConversationId}
										onClick={() => handleConversationClick(conversation.id)}
									/>
								))}
							</div>
						)}
					</div>

					<div className="mt-auto p-4 border-t border-gray-200">
						<div className="flex items-center gap-3">
							{user ? (
								<>
									<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
										<User className="w-5 h-5 text-blue-600" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="font-bold text-gray-900 truncate text-sm">
											{user.firstName} {user.lastName}
										</div>
										<div className="text-xs text-gray-600 truncate">
											{user.email}
										</div>
									</div>
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900"
													onClick={() => logout()}
												>
													<LogOut className="h-4 w-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>{t("sidebar.logout")}</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</>
							) : (
								<>
									<Skeleton className="w-10 h-10 rounded-full" />
									<div className="flex-1 space-y-1">
										<Skeleton className="h-4 w-3/4" />
										<Skeleton className="h-3 w-1/2" />
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

// Toggle button for the sidebar (to be used in the main chat header)
export function SidebarToggle() {
	const { t } = useTranslation("chat");
	const { isSidebarOpen, toggleSidebar } = useUIStore();

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						onClick={toggleSidebar}
						className="gap-2"
					>
						{isSidebarOpen ? (
							<>
								<PanelLeftClose className="h-4 w-4" />
								<span className="hidden sm:inline">{t("sidebar.hideSidebar")}</span>
							</>
						) : (
							<>
								<PanelLeftOpen className="h-4 w-4" />
								<span className="hidden sm:inline">{t("sidebar.showSidebar")}</span>
							</>
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>
						{t("sidebar.toggleSidebar")}{" "}
						<kbd className="ml-1 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
							⌘B
						</kbd>
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
