/**
 * RitaLayout - Adapted v0.app Dashboard layout for RITA
 *
 * This layout is based on the v0.app Dashboard component but adapted to work with:
 * - React/Vite (no Next.js)
 * - RITA's authentication (Keycloak via useAuth)
 * - RITA's conversation store and API hooks
 * - RITA's knowledge base integration
 * - RITA's SSE real-time updates
 *
 * Source: https://v0.app/chat/b/b_zjL85AzE9kl
 */

"use client";

import {
	ALargeSmall,
	CheckCircle,
	ChevronDown,
	File,
	Home,
	LogOut,
	MailOpen,
	Plus,
	SquarePen,
	Ticket,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader } from "@/components/ai-elements/loader";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import InviteUsersButton from "@/components/users/InviteUsersButton";
import WelcomeDialog from "@/components/WelcomeDialog";
import { SOURCE_METADATA } from "@/constants/connectionSources";
import { useConversations } from "@/hooks/api/useConversations";
import { useProfile, useProfilePermissions } from "@/hooks/api/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useChatNavigation } from "@/hooks/useChatNavigation";
import { useDataSources } from "@/hooks/useDataSources";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { SUPPORTED_DOCUMENT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/stores/conversationStore";
import type { DataSourceConnection } from "@/types/dataSource";

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

	// RITA hooks
	const { user, logout } = useAuth();
	const { data: profile } = useProfile();
	const { isOwnerOrAdmin } = useProfilePermissions();
	const { data: conversationsData, isLoading: conversationsLoading } =
		useConversations();
	const { data: dataSources } = useDataSources();
	const { handleNewChat, handleConversationClick, currentConversationId } =
		useChatNavigation();
	const {
		files,
		totalFiles: totalKnowledgeBaseFiles,
		openDocumentSelector,
		documentInputRef,
		handleDocumentUpload,
	} = useKnowledgeBase();

	const conversations = conversationsData || [];

	// Filter synced sources (completed + enabled)
	const syncedSources =
		dataSources?.filter(
			(source: DataSourceConnection) =>
				source.last_sync_status === "completed" && source.enabled,
		) || [];

	// Loading knowledge indicator state
	files.some((f) => f.status === "processed" || f.status === "uploaded");
	const hasProcessingFiles = files.some((f) => f.status === "processing");
	const hasDataSourcesSyncing =
		dataSources?.some((ds) => ds.status === "syncing") ?? false;
	const showLoadingIndicator = hasProcessingFiles || hasDataSourcesSyncing;

	// State machine for loading indicator (hidden → loading → success → hidden)
	type IndicatorState = "hidden" | "loading" | "success";
	const [indicatorState, setIndicatorState] =
		useState<IndicatorState>("hidden");
	const prevLoadingRef = useRef(showLoadingIndicator);

	useEffect(() => {
		if (showLoadingIndicator) {
			// Show loading state
			setIndicatorState("loading");
		} else if (prevLoadingRef.current && !showLoadingIndicator) {
			// Transition from loading to success
			setIndicatorState("success");
			// Auto-dismiss after 3 seconds
			const timer = setTimeout(() => setIndicatorState("hidden"), 3000);
			return () => clearTimeout(timer);
		}

		prevLoadingRef.current = showLoadingIndicator;
	}, [showLoadingIndicator]);

	// Check if user has seen welcome modal before (localStorage + cookie fallback)
	const hasSeenWelcomeModal = useCallback(() => {
		// Need user ID to check per-user state
		const userId = profile?.user?.id;
		if (!userId) return false;

		const storageKey = `rita_welcome_seen_${userId}`;

		// Check localStorage first (persists across sessions)
		const hasSeenInLocalStorage =
			localStorage.getItem(storageKey) === "true";
		// Check cookie as fallback
		const hasSeenInCookie = document.cookie.includes(`${storageKey}=true`);
		return hasSeenInLocalStorage || hasSeenInCookie;
	}, [profile?.user?.id]);

	// Mark welcome modal as seen (both localStorage and cookie)
	const markWelcomeModalAsSeen = useCallback(() => {
		// Need user ID to save per-user state
		const userId = profile?.user?.id;
		if (!userId) return;

		const storageKey = `rita_welcome_seen_${userId}`;

		// Set in localStorage (persists indefinitely)
		localStorage.setItem(storageKey, "true");

		// Set cookie to expire in 1 year (for cross-tab consistency)
		const expiryDate = new Date();
		expiryDate.setFullYear(expiryDate.getFullYear() + 1);
		document.cookie = `${storageKey}=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
	}, [profile?.user?.id]);

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

	return (
		<>
			<Sidebar className="bg-sidebar-primary-foreground border-sidebar-border w-[256px] lg:flex-shrink-0">
				<SidebarHeader className="h-[67px] flex items-left justify-start pl-2">
					<div className="flex items-center h-full pl-2">
						<img
							src="/logo-rita.svg"
							alt="RITA Logo"
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
													RITA
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
					className={`h-[67px] bg-background flex items-center flex-shrink-0 pr-6 border-b border-gray-200 transition-[padding] duration-200 ease-linear ${state === "expanded" ? "lg:pl-[250px]" : "lg:pl-0"}`}
				>
					<div className="flex items-center gap-2 h-full pl-4">
						<SidebarTrigger className="lg:flex" />
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<span className="text-sm text-foreground leading-none">
										RITA Go
									</span>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
						{(indicatorState === "loading" || indicatorState === "success") && (
							<div
								className={cn(
									"flex items-center gap-2 ml-2 text-sm transition-colors",
									indicatorState === "success"
										? "text-green-700 bg-green-50 px-2 py-1 rounded-md"
										: "text-muted-foreground",
								)}
							>
								{indicatorState === "loading" ? (
									<>
										<Loader size={16} />
										<span>We are loading knowledge...</span>
									</>
								) : (
									<>
										<CheckCircle size={16} />
										<span>Knowledge successfully added</span>
									</>
								)}
							</div>
						)}
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
					<div className="ml-auto flex items-center gap-2">
						{activePage === "chat" &&
							isOwnerOrAdmin() &&
							totalKnowledgeBaseFiles > 0 && (
								<>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												className="gap-2 h-9 px-3 text-sm"
											>
												<Plus className="w-4 h-4" />
												<span className="hidden sm:inline">Add Articles</span>
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											{/* Upload file option */}
											<DropdownMenuItem onClick={openDocumentSelector}>
												<Upload className="h-4 w-4 mr-2" />
												Upload file
											</DropdownMenuItem>

											{/* Connect sources option */}
											<DropdownMenuItem
												onClick={() => navigate("/settings/connections")}
											>
												<Plus className="h-4 w-4 mr-2" />
												Connect sources
												<div className="ml-auto flex gap-1 pl-8">
													<img
														src="/connections/icon_confluence.svg"
														alt=""
														className="h-4 w-4"
													/>
													<img
														src="/connections/icon_sharepoint.svg"
														alt=""
														className="h-4 w-4"
													/>
													<img
														src="/connections/icon_servicenow.svg"
														alt=""
														className="h-4 w-4"
													/>
												</div>
											</DropdownMenuItem>

											{/* Synced sources */}
											{syncedSources.length > 0 && (
												<>
													<DropdownMenuSeparator />
													{syncedSources.map((source: DataSourceConnection) => (
														<DropdownMenuItem
															key={source.id}
															onClick={() =>
																navigate(`/settings/connections/${source.id}`)
															}
														>
															<img
																src={`/connections/icon_${source.type}.svg`}
																alt=""
																className="h-4 w-4 mr-2"
															/>
															{SOURCE_METADATA[source.type]?.title ||
																source.type}
														</DropdownMenuItem>
													))}
												</>
											)}
										</DropdownMenuContent>
									</DropdownMenu>
									<InviteUsersButton
										variant="secondary"
										icon={<MailOpen className="w-4 h-4" />}
									>
										Invite Users
									</InviteUsersButton>
								</>
							)}
					</div>
				</header>

				<div
					className={`flex flex-1 overflow-hidden min-w-0 transition-[padding] duration-200 ease-linear ${state === "expanded" ? "lg:pl-[250px]" : "lg:pl-0"}`}
				>
					<main className="flex-1 flex flex-col overflow-y-auto min-w-0 w-full">
						{children}
					</main>
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
