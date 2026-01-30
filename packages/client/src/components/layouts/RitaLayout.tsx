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

import { useTranslation } from "react-i18next";
import {
	ALargeSmall,
	Bot,
	Calendar,
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
	Workflow,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader } from "@/components/ai-elements/loader";
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
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
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
import { memo } from "react";

export interface RitaLayoutProps {
	children: React.ReactNode;
	/** Current active page for navigation highlighting */
	activePage?: "chat" | "files" | "automations" | "tickets" | "users" | "scheduler";
}

// Logo component memoized to prevent re-renders
// Using background-image instead of <img> for better caching
const RitaLogo = memo(() => (
	<div
		className="w-[179px] h-[18px] bg-no-repeat bg-center bg-contain"
		style={{ backgroundImage: "url('/logo-rita.svg')" }}
		role="img"
		aria-label="RITA Logo"
	/>
));
RitaLogo.displayName = "RitaLogo";

function RitaLayoutContent({ children, activePage = "chat" }: RitaLayoutProps) {
	const { state } = useSidebar();
	const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const { t } = useTranslation();

	// Feature flags
	const showWelcomeModal = useFeatureFlag("SHOW_WELCOME_MODAL");
	const enableMultiFileUpload = useFeatureFlag("ENABLE_MULTI_FILE_UPLOAD");
	const enableWorkflows = useFeatureFlag("ENABLE_WORKFLOWS");
	const enableLanguageSwitcher = useFeatureFlag("ENABLE_LANGUAGE_SWITCHER");
	const enableAgents = useFeatureFlag("ENABLE_AGENTS");

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
		uploadingFiles,
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
	// Skip in demo mode
	const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
	useEffect(() => {
		// Skip modal in demo mode
		if (isDemoMode) return;

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
	}, [showWelcomeModal, hasSeenWelcomeModal, markWelcomeModalAsSeen, isDemoMode]);

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
						<RitaLogo />
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
											{t("nav.home")}
										</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
								{enableAgents && (
									<SidebarMenuItem>
										<SidebarMenuButton
											className="flex items-center gap-2 px-2 py-2 h-8 rounded-md"
											onClick={() => navigate("/agents")}
											isActive={location.pathname.startsWith("/agents")}
										>
											<Bot className="w-4 h-4" />
											<span className="text-sm text-sidebar-foreground">
												{t("nav.agents")}
											</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)}
								<SidebarMenuItem>
									<SidebarMenuButton
										className="flex items-center gap-2 px-2 py-2 h-8 rounded-md"
										onClick={navigateToKnowledgeArticles}
										isActive={location.pathname === "/content"}
									>
										<File className="w-4 h-4" />
										<span className="text-sm text-sidebar-foreground">
											{t("nav.knowledgeArticles")}
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
											{t("nav.tickets")}
										</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton
										className="flex items-center gap-2 px-2 py-2 h-8 rounded-md"
										onClick={() => navigate("/scheduler")}
										isActive={location.pathname.startsWith("/scheduler")}
									>
										<Calendar className="w-4 h-4" />
										<span className="text-sm text-sidebar-foreground">
											Scheduler
										</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
								</SidebarMenu>
						</SidebarGroup>
					)}

					{enableWorkflows && (
						<SidebarGroup>
							<SidebarMenu className="gap-1">
								<SidebarMenuItem>
									<SidebarMenuButton
										className="flex items-center gap-2 px-2 py-2 h-8 rounded-md"
										onClick={() => navigate("/jirita")}
										isActive={location.pathname === "/jirita"}
									>
										<Workflow className="w-4 h-4" />
										<span className="text-sm text-sidebar-foreground">
											{t("nav.workflows")}
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
								{t("nav.newChat")}
							</Button>
						</SidebarMenuItem>
					</div>

					<SidebarGroup>
						<SidebarGroupLabel className="px-2 h-8 rounded-md text-xs text-sidebar-foreground">
							{t("nav.recentChats")}
						</SidebarGroupLabel>
						<SidebarMenu className="gap-1">
							{conversationsLoading ? (
								<div className="px-2 text-xs text-muted-foreground">
									{t("nav.loading")}
								</div>
							) : conversations.length === 0 ? (
								<div className="px-2 text-xs text-muted-foreground">
									{t("nav.noConversations")}
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
											{t("nav.settings")}
										</button>
									) : (
										<button
											className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent cursor-pointer flex items-center gap-2"
											onClick={() => navigate("/settings/profile")}
										>
											{t("nav.profile")}
										</button>
									)}
									<a
										href="https://help.resolve.io/rita-go/"
										target="_blank"
										rel="noopener noreferrer"
										className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent cursor-pointer block"
									>
										{t("nav.helpDocumentation")}
									</a>
									<Separator className="my-1" />
									<button
										className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 cursor-pointer"
										onClick={handleSignOut}
									>
										<LogOut className="w-4 h-4" />
										{t("nav.logOut")}
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
										{t("nav.ritaGo")}
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
								{t("nav.newChat")}
							</Button>
						)}
					</div>
					<div className="ml-auto flex items-center gap-2">
						{enableLanguageSwitcher && <LanguageSwitcher />}
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
												<span className="hidden sm:inline">{t("nav.addArticles")}</span>
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											{/* Upload file option */}
											<DropdownMenuItem onClick={openDocumentSelector}>
												<Upload className="h-4 w-4 mr-2" />
												{t("nav.uploadFile")}
											</DropdownMenuItem>

											{/* Connect sources option */}
											<DropdownMenuItem
												onClick={() => navigate("/settings/connections")}
											>
												<Plus className="h-4 w-4 mr-2" />
												{t("nav.connectSources")}
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
										{t("nav.inviteUsers")}
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
				multiple={enableMultiFileUpload}
				disabled={uploadingFiles.size > 0}
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
