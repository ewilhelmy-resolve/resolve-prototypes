/**
 * RitaLayout - Adapted v0.app Dashboard layout for Rita
 *
 * This layout is based on the v0.app Dashboard component but adapted to work with:
 * - React/Vite (no Next.js)
 * - Rita's authentication (Keycloak via useAuth)
 * - Rita's conversation store and API hooks
 * - Rita's knowledge base integration
 * - Rita's SSE real-time updates
 *
 * Source: https://v0.app/chat/b/b_zjL85AzE9kl
 */

"use client";

import {
	ALargeSmall,
	ChevronDown,
	File,
	FileText,
	Home,
	LogOut,
	Plus,
	SquarePen,
	Ticket,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileUploadRequirements } from "@/components/knowledge-articles/FileUploadRequirements";
import { ShareModal } from "@/components/ShareModal";
import { ConversationListItem } from "@/components/sidebar/ConversationListItem";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from "@/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import WelcomeDialog from "@/components/WelcomeDialog";
import { useConversations } from "@/hooks/api/useConversations";
import { useProfilePermissions } from "@/hooks/api/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useChatNavigation } from "@/hooks/useChatNavigation";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import {
	MAX_FILE_SIZE_MB,
	SUPPORTED_DOCUMENT_EXTENSIONS,
	SUPPORTED_DOCUMENT_TYPES,
} from "@/lib/constants";
import type { Conversation } from "@/stores/conversationStore";
import InviteUserCard from "../users/InviteUserCard";

export interface RitaLayoutProps {
	children: React.ReactNode;
	/** Current active page for navigation highlighting */
	activePage?: "chat" | "files" | "automations" | "tickets" | "users";
}

function RitaLayoutContent({ children, activePage = "chat" }: RitaLayoutProps) {
	const { state } = useSidebar();
	const [shareModalOpen, setShareModalOpen] = useState(false);
	const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();

	// Feature flags
	const showWelcomeModal = useFeatureFlag("SHOW_WELCOME_MODAL");

	// Rita hooks
	const { user, logout } = useAuth();
	const { isOwnerOrAdmin } = useProfilePermissions();
	const { data: conversationsData, isLoading: conversationsLoading } =
		useConversations();
	const { handleNewChat, handleConversationClick, currentConversationId } =
		useChatNavigation();
	const {
		files: knowledgeBaseFiles,
		filesLoading: knowledgeBaseFilesLoading,
		totalFiles: totalKnowledgeBaseFiles,
		openDocumentSelector,
		documentInputRef,
		handleDocumentUpload,
	} = useKnowledgeBase();

	const conversations = conversationsData || [];

	// Check if user has seen welcome modal before (localStorage + cookie fallback)
	const hasSeenWelcomeModal = useCallback(() => {
		// Check localStorage first (persists across sessions)
		const hasSeenInLocalStorage =
			localStorage.getItem("rita_welcome_seen") === "true";
		// Check cookie as fallback
		const hasSeenInCookie = document.cookie.includes("rita_welcome_seen=true");
		return hasSeenInLocalStorage || hasSeenInCookie;
	}, []);

	// Mark welcome modal as seen (both localStorage and cookie)
	const markWelcomeModalAsSeen = useCallback(() => {
		// Set in localStorage (persists indefinitely)
		localStorage.setItem("rita_welcome_seen", "true");

		// Set cookie to expire in 1 year (for cross-tab consistency)
		const expiryDate = new Date();
		expiryDate.setFullYear(expiryDate.getFullYear() + 1);
		document.cookie = `rita_welcome_seen=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
	}, []);

	// Show welcome modal on first load if user hasn't seen it, or if feature flag is manually enabled
	useEffect(() => {
		// Feature flag explicitly enabled in devtools - always show
		if (showWelcomeModal) {
			setWelcomeModalOpen(true);
			return;
		}

		// First time user - show modal
		if (!hasSeenWelcomeModal()) {
			setWelcomeModalOpen(true);
			// Mark as seen immediately to prevent showing on refresh
			markWelcomeModalAsSeen();
		}
	}, [showWelcomeModal, hasSeenWelcomeModal, markWelcomeModalAsSeen]);

	// Handle modal close
	const handleWelcomeModalClose = (open: boolean) => {
		setWelcomeModalOpen(open);
	};

	const handleSignOut = async () => {
		try {
			logout();
		} catch (error) {
			console.error("Failed to sign out:", error);
		}
	};

	const navigateToKnowledgeArticles = () => {
		navigate("/content");
	};

	// Get user initials for avatar
	const getUserInitials = () => {
		const firstName = user?.firstName || "";
		const lastName = user?.lastName || "";

		if (firstName && lastName) {
			return `${firstName[0]}${lastName[0]}`.toUpperCase();
		}

		if (firstName) {
			return firstName.substring(0, 2).toUpperCase();
		}

		return "U";
	};

	// Format file metadata for display (e.g., "PDF - Today, 4:00PM")
	const formatFileMetadata = (file: any) => {
		const fileExtension =
			file.filename?.split(".").pop()?.toUpperCase() || "FILE";

		if (!file.created_at) return fileExtension;

		const date = new Date(file.created_at);
		const today = new Date();
		const isToday = date.toDateString() === today.toDateString();

		const dateStr = isToday ? "Today" : date.toLocaleDateString();
		const timeStr = date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});

		return `${fileExtension} - ${dateStr}, ${timeStr}`;
	};

	return (
		<>
			<Sidebar className="bg-sidebar-primary-foreground border-sidebar-border max-w-64">
				<SidebarHeader className="h-[67px] flex items-left justify-start pl-2">
					<div className="flex items-center h-full pl-2">
						<img
							src="/logo-rita.svg"
							alt="Rita Logo"
							width={179}
							height={18}
							className="w-[179px] h-[18px]"
						/>
					</div>
				</SidebarHeader>

				<SidebarContent className="gap-2">
					{isOwnerOrAdmin() && (
						<SidebarGroup>
							<SidebarMenu className="gap-1">
								<SidebarMenuItem>
									<SidebarMenuButton
										className="flex items-center gap-2 px-2 py-2 h-8 rounded-md"
										onClick={() => navigate("/chat")}
										isActive={
											location.pathname === "/chat" ||
											location.pathname.startsWith("/chat/")
										}
									>
										<Home className="w-4 h-4" />
										<span className="text-sm text-sidebar-foreground">
											Home
										</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton
										className="flex items-center gap-2 px-2 py-2 h-8 rounded-md"
										onClick={navigateToKnowledgeArticles}
										isActive={location.pathname === "/content"}
									>
										<File className="w-4 h-4" />
										<span className="text-sm text-sidebar-foreground">
											Knowledge Articles
										</span>
										{totalKnowledgeBaseFiles > 0 && (
											<div className="ml-auto flex items-center justify-center px-1 h-5 bg-sidebar-accent rounded text-xs text-sidebar-foreground">
												{totalKnowledgeBaseFiles}
											</div>
										)}
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton
										className="flex items-center gap-2 px-2 py-2 h-8 rounded-md"
										onClick={() => navigate("/tickets")}
										isActive={location.pathname === "/tickets"}
									>
										<Ticket className="w-4 h-4" />
										<span className="text-sm text-sidebar-foreground">
											Tickets
										</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroup>
					)}

					<div className="px-2">
						<SidebarMenuItem>
							<Button
								className="w-full gap-2 px-4 py-2 h-9 rounded-md bg-primary text-primary-foreground"
								onClick={handleNewChat}
							>
								<SquarePen className="w-4 h-4" />
								New Chat
							</Button>
						</SidebarMenuItem>
					</div>

					<SidebarGroup>
						<SidebarGroupLabel className="px-2 h-8 rounded-md text-xs text-sidebar-foreground">
							Recent chats
						</SidebarGroupLabel>
						<SidebarMenu className="gap-1">
							{conversationsLoading ? (
								<div className="px-2 text-xs text-muted-foreground">
									Loading...
								</div>
							) : conversations.length === 0 ? (
								<div className="px-2 text-xs text-muted-foreground">
									No conversations yet
								</div>
							) : (
								conversations.map((conversation: Conversation) => (
									<ConversationListItem
										key={conversation.id}
										conversation={conversation}
										isActive={conversation.id === currentConversationId}
										onClick={handleConversationClick}
									/>
								))
							)}
						</SidebarMenu>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter className="p-2 border-t border-sidebar-border">
					<Popover>
						<PopoverTrigger asChild>
							<SidebarMenuButton className="flex items-center gap-2 px-2 py-2 h-12 rounded-md hover:bg-sidebar-accent">
								<Avatar className="w-8 h-8 rounded-lg">
									<AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
										{getUserInitials()}
									</AvatarFallback>
								</Avatar>
								<div className="flex flex-col gap-0.5 overflow-hidden">
									<span className="text-sm font-bold text-sidebar-foreground truncate">
										{user?.firstName && user?.lastName
											? `${user.firstName} ${user.lastName}`
											: user?.username || "User"}
									</span>
									<span className="text-xs text-sidebar-foreground truncate">
										{user?.email || ""}
									</span>
								</div>
								<ChevronDown className="w-4 h-4 ml-auto" />
							</SidebarMenuButton>
						</PopoverTrigger>
						<PopoverContent
							className="w-64 p-0"
							side="top"
							align="start"
							sideOffset={8}
						>
							<div className="flex flex-col">
								<div className="px-3 py-3 border-b border-gray-200">
									<p className="text-sm text-muted-foreground">
										{user?.email || ""}
									</p>
									<div className="flex items-center justify-between mt-2">
										<div className="flex items-center gap-2">
											<div className="w-6 h-6 rounded bg-sidebar-primary flex items-center justify-center">
												<ALargeSmall className="w-3 h-3 text-sidebar-primary-foreground" />
											</div>
											<div className="flex flex-col">
												<span className="text-sm font-medium text-foreground">
													Rita
												</span>
												<span className="text-xs text-muted-foreground">
													Free plan
												</span>
											</div>
										</div>
										{/*
										TODO : when implementing billing/plan upgrades
										<span className="text-sm text-blue-600 font-medium cursor-pointer">
											Upgrade
										</span> */}
									</div>
								</div>

								<div className="py-1">
									{isOwnerOrAdmin() ? (
										<button
											className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent cursor-pointer"
											onClick={() => navigate("/settings")}
										>
											Settings
										</button>
									) : (
										<button
											className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent cursor-pointer flex items-center gap-2"
											onClick={() => navigate("/settings/profile")}
										>
											Profile
										</button>
									)}
									<a
										href="https://help.resolve.io/rita-go/"
										target="_blank"
										rel="noopener noreferrer"
										className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent cursor-pointer block"
									>
										Help documentation
									</a>
									<Separator className="my-1" />
									<button
										className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 cursor-pointer"
										onClick={handleSignOut}
									>
										<LogOut className="w-4 h-4" />
										Log out
									</button>
								</div>
							</div>
						</PopoverContent>
					</Popover>
				</SidebarFooter>
			</Sidebar>

			<div className="fixed inset-y-0 right-0 left-0 z-0 flex flex-col overflow-hidden">
				<header
					className={`h-[67px] bg-background flex items-center flex-shrink-0 pr-6 border-b border-gray-200 transition-[padding] duration-200 ease-linear ${state === "expanded" ? "lg:pl-64" : "lg:pl-12"}`}
				>
					<div className="flex items-center gap-2 h-full pl-4">
						<SidebarTrigger className="lg:flex" />
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<span className="text-sm text-foreground leading-none">
										Rita Go
									</span>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
						{state === "collapsed" && (
							<Button
								variant="ghost"
								className="gap-2 h-9 px-3 text-sm text-primary hover:text-primary hover:bg-primary/10"
								onClick={handleNewChat}
							>
								<SquarePen className="w-4 h-4" />
								New Chat
							</Button>
						)}
					</div>
					<div className="ml-auto">
						<div className="px-2.5 h-7 rounded-sm border border-cyan-500 bg-cyan-500/10 flex items-center">
							<span className="text-sm text-foreground">
								Free trial ends in 34 days
							</span>
						</div>
					</div>
				</header>

				<div
					className={`flex flex-1 overflow-hidden min-w-0 transition-[padding] duration-200 ease-linear ${state === "expanded" ? "lg:pl-64" : "lg:pl-12"}`}
				>
					<main className="flex-1 flex flex-col overflow-y-auto min-w-0 w-full">
						{children}
					</main>

					{/* Right sidebar - Knowledge Articles panel (only on chat page for admins/owners) */}
					{activePage === "chat" && isOwnerOrAdmin() && (
						<aside className="hidden lg:flex w-80 bg-background p-6 flex-col gap-6 overflow-y-auto flex-shrink-0">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-semibold text-foreground">
									Knowledge Articles
								</h2>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="w-8 h-8"
											onClick={openDocumentSelector}
										>
											<Plus className="w-4 h-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent
										side="top"
										className="max-w-xs bg-primary text-primary-foreground"
										arrowClassName="bg-primary fill-primary"
									>
										<div className="space-y-1">
											<p>
												File types: {SUPPORTED_DOCUMENT_EXTENSIONS.join(", ")}
											</p>
											<p className="text-center">Max size: {MAX_FILE_SIZE_MB}mb</p>
										</div>
									</TooltipContent>
								</Tooltip>
							</div>

							{/* 
							TODO : Add knowledge base stats summary when backend support is added
							
							<div className="flex gap-4 w-full justify-between border border-border rounded-lg p-4">
								<div className="flex flex-col items-center flex-1">
									<span className="text-2xl font-semibold text-foreground">
										{knowledgeBaseFilesLoading ? "-" : totalKnowledgeBaseFiles}
									</span>
									<span className="text-xs text-muted-foreground">
										Articles
									</span>
								</div>
								<Separator orientation="vertical" className="h-auto" />
								<div className="flex flex-col items-center flex-1">
									<span className="text-2xl font-semibold text-foreground">
										0
									</span>
									<span className="text-xs text-muted-foreground">Vectors</span>
								</div>
								<Separator orientation="vertical" className="h-auto" />
								<div className="flex flex-col items-center flex-1">
									<span className="text-2xl font-semibold text-foreground">
										0%
									</span>
									<span className="text-xs text-muted-foreground">
										Accuracy
									</span>
								</div>
							</div> */}

							<div className="flex flex-col gap-3">
								<span className="text-sm text-muted-foreground">
									{knowledgeBaseFiles.length} recent articles
								</span>

								{knowledgeBaseFilesLoading ? (
									<div className="text-sm text-muted-foreground">
										Loading...
									</div>
								) : knowledgeBaseFiles.length === 0 ? (
									<div className="flex flex-col items-center gap-4 py-8 px-4 border border-border rounded-lg">
										<h3 className="text-lg font-semibold text-foreground">
											No articles yet
										</h3>
										<p className="text-sm text-muted-foreground text-center max-w-xs">
											Upload your knowledge articles to unlock instant answers
											from Rita
										</p>
										<Button
											variant="secondary"
											onClick={openDocumentSelector}
											className="gap-2 bg-muted hover:bg-muted/80"
										>
											<Plus className="h-4 w-4" />
											Add knowledge
										</Button>
										<FileUploadRequirements />
									</div>
								) : (
									<div className="flex flex-col gap-2">
										{knowledgeBaseFiles.slice(0, 4).map((file) => (
											<button
												key={file.id}
												type="button"
												className="flex items-start gap-3 py-3 rounded-md hover:bg-accent cursor-pointer text-left w-full"
												onClick={navigateToKnowledgeArticles}
											>
												<FileText className="w-5 h-5 mt-0.5 text-foreground flex-shrink-0" />
												<div className="flex-1 min-w-0">
													<p className="text-base text-foreground truncate">
														{file.filename}
													</p>
													<p className="text-sm text-muted-foreground">
														{formatFileMetadata(file)}
													</p>
												</div>
											</button>
										))}
										{knowledgeBaseFiles.length > 4 && (
											<Button
												variant="secondary"
												className="w-full h-10 text-sm bg-muted hover:bg-muted/80"
												onClick={navigateToKnowledgeArticles}
											>
												See all
											</Button>
										)}
									</div>
								)}
							</div>

							<InviteUserCard />
						</aside>
					)}
				</div>
			</div>

			{/* Hidden file input for document upload */}
			<input
				ref={documentInputRef}
				type="file"
				className="hidden"
				onChange={handleDocumentUpload}
				accept={SUPPORTED_DOCUMENT_TYPES}
				multiple={false}
			/>

			{/* Share Modal */}
			<ShareModal
				open={shareModalOpen}
				onOpenChange={setShareModalOpen}
				onNavigateToSettings={() => navigate("/settings")}
			/>

			{/* Welcome Modal */}
			<WelcomeDialog
				open={welcomeModalOpen}
				onOpenChange={handleWelcomeModalClose}
				onUploadFiles={openDocumentSelector}
			/>
		</>
	);
}

export default function RitaLayout(props: RitaLayoutProps) {
	return (
		<SidebarProvider className="w-screen">
			<RitaLayoutContent {...props} />
		</SidebarProvider>
	);
}
