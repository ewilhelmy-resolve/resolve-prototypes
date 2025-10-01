/**
 * RitaV1Layout - Modern shared layout component with Figma design
 *
 * This component provides the new layout structure based on the RitaUpload Figma design:
 * - Top Navigation: Modern nav with Rita GO branding
 * - Left Sidebar: Navigation, search, and conversations
 * - Main Content: Children (page-specific content)
 * - Right Sidebar: Knowledge base and share panel (chat page only)
 */

"use client";

import {
	FileText,
	LayoutGrid,
	LifeBuoy,
	LogOut,
	Menu,
	MessageCirclePlus,
	Newspaper,
	PanelLeft,
	Plus,
	Search,
	Share2,
	Ticket,
	User,
	Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AccountDropdown from "@/components/AccountDropdown";
import ShareDialog from "@/components/ShareDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResolveLogo } from "@/components/ui/ResolveLogo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import WelcomeDialog from "@/components/WelcomeDialog";
import { useConversations } from "@/hooks/api/useConversations";
// Custom hooks and types
import { useAuth } from "@/hooks/useAuth";
import { useChatNavigation } from "@/hooks/useChatNavigation";
import { useFirstTimeLogin } from "@/hooks/useFirstTimeLogin";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import type { Conversation } from "@/stores/conversationStore";

export interface RitaV1LayoutProps {
	children: React.ReactNode;
	/** Current active page for navigation highlighting */
	activePage?: "chat" | "files" | "automations" | "tickets" | "users";
}

export default function RitaV1Layout({
	children,
	activePage = "chat",
}: RitaV1LayoutProps) {
	const [searchValue, setSearchValue] = useState("");
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const { logout } = useAuth();
	const navigate = useNavigate();

	// Navigation hooks
	const { handleNewChat, handleConversationClick, currentConversationId } =
		useChatNavigation();

	// Knowledge base functionality
	const {
		isUploading: documentUploadIsUploading,
		isError: documentUploadIsError,
		isSuccess: documentUploadIsSuccess,
		error: documentUploadError,
		files: knowledgeBaseFiles,
		filesLoading: knowledgeBaseFilesLoading,
		totalFiles: totalKnowledgeBaseFiles,
		handleDocumentUpload,
		openDocumentSelector,
		navigateToKnowledgeArticles,
		documentInputRef,
	} = useKnowledgeBase();

	// Conversations for sidebar
	const { data: conversationsData, isLoading: conversationsLoading } =
		useConversations();
	const conversations = conversationsData || [];

	// First-time login and share modal state
	const { shouldShowModal: shouldShowFirstTimeModal, markModalAsShown } =
		useFirstTimeLogin();
	const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

	// Filter conversations based on search
	const filteredConversations = conversations.filter((conversation) =>
		conversation.title.toLowerCase().includes(searchValue.toLowerCase()),
	);

	const handleSignOut = async () => {
		try {
			logout();
		} catch (error) {
			console.error("Failed to sign out:", error);
		}
	};

	const handleSearchChange = (value: string) => {
		setSearchValue(value);
	};

	const navigateToUsers = () => {
		navigate("/users");
	};

	const toggleSidebar = () => {
		setSidebarCollapsed(!sidebarCollapsed);
	};

	return (
		<div className="min-h-screen bg-background">
			{/* Top Navigation */}
			<nav className="h-16 bg-primary border-b border-border px-6 shadow-sm">
				<div className="flex justify-between items-center h-full">
					<div className="flex items-center gap-4">
						<div className="w-[100px] h-5">
							<ResolveLogo />
						</div>
						<span className="text-lg font-medium text-white">Rita GO</span>
						<Sheet>
							<SheetTrigger asChild className="md:hidden">
								<Button
									variant="ghost"
									size="icon"
									className="w-7 h-7 text-white"
								>
									<Menu className="h-4 w-4" />
								</Button>
							</SheetTrigger>
							<SheetContent side="left" className="w-64">
								<div className="flex flex-col gap-4 mt-8">
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setIsShareDialogOpen(true)}
									>
										<Share2 className="h-4 w-4" />
									</Button>
									<Button variant="ghost" size="icon">
										<LifeBuoy className="h-4 w-4" />
									</Button>
									<Button
										variant="outline"
										className="justify-start"
										onClick={handleSignOut}
									>
										<LogOut className="h-4 w-4 mr-2" />
										Logout
									</Button>
								</div>
							</SheetContent>
						</Sheet>
						<Button
							variant="ghost"
							size="icon"
							className="hidden md:flex w-7 h-7 text-white"
							onClick={toggleSidebar}
						>
							<PanelLeft className="h-4 w-4" />
						</Button>
					</div>
					<div className="flex items-center gap-4">
						<div className="hidden md:flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								className="text-white"
								onClick={handleNewChat}
							>
								<MessageCirclePlus className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="text-white"
								onClick={() => setIsShareDialogOpen(true)}
							>
								<Share2 className="h-4 w-4" />
							</Button>
							<Button variant="ghost" size="icon" className="text-white">
								<LifeBuoy className="h-4 w-4" />
							</Button>
						</div>
						<AccountDropdown onSignOut={handleSignOut} />
					</div>
				</div>
			</nav>

			<div className="flex">
				{/* Sidebar - Hidden on mobile, toggle on desktop */}
				<div
					className={`${sidebarCollapsed ? "w-0" : "w-[235px]"} h-[calc(100vh-4rem)] bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden hidden md:flex flex-col`}
				>
					{/* Sidebar Header with Search */}
					<div className="p-4 bg-sidebar">
						<div className="px-2">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search"
									value={searchValue}
									onChange={(e) => handleSearchChange(e.target.value)}
									className="pl-9 h-9 bg-background border-input shadow-sm"
								/>
							</div>
						</div>
					</div>

					{/* Sidebar Content */}
					<div className="flex-1 p-2 overflow-y-auto">
						{/* Main Navigation */}
						<div className="mb-4">
							<div className="space-y-1">
								<Button
									variant={activePage === "chat" ? "default" : "ghost"}
									className="w-full justify-start"
									onClick={handleNewChat}
								>
									<MessageCirclePlus className="h-4 w-4 mr-2" />
									<span>New chat</span>
								</Button>
								<Button variant="ghost" className="w-full justify-start">
									<LayoutGrid className="h-4 w-4 mr-2" />
									<span>Dashboard</span>
								</Button>
							</div>
						</div>

						{/* Manage Section */}
						<div className="mb-6">
							<div className="px-2 mb-2">
								<span className="text-xs opacity-70 text-sidebar-foreground font-semibold">
									Manage
								</span>
							</div>
							<div className="space-y-1">
								<Button
									variant={activePage === "files" ? "secondary" : "ghost"}
									className="w-full justify-start"
									onClick={() => navigate("/content")}
								>
									<Newspaper className="h-4 w-4 mr-2" />
									<span>Knowledge articles</span>
								</Button>
								<Button
									variant={activePage === "tickets" ? "secondary" : "ghost"}
									className="w-full justify-start"
								>
									<Ticket className="h-4 w-4 mr-2" />
									<span>Tickets</span>
								</Button>
								<Button
									variant={activePage === "users" ? "secondary" : "ghost"}
									className="w-full justify-start"
									onClick={navigateToUsers}
								>
									<User className="h-4 w-4 mr-2" />
									<span>Users</span>
								</Button>
							</div>
						</div>

						{/* Recent Chats Section */}
						<div>
							<div className="px-2 mb-2">
								<span className="text-xs opacity-70 text-sidebar-foreground font-semibold">
									Recent chats
								</span>
							</div>
							<div className="space-y-1">
								{conversationsLoading ? (
									// Loading skeleton
									<div className="space-y-1">
										{[...Array(5)].map((_, i) => (
											<div key={i} className="p-2 rounded-lg">
												<Skeleton className="h-4 w-full" />
											</div>
										))}
									</div>
								) : filteredConversations.length === 0 ? (
									// Empty state
									<div className="text-center py-4">
										<p className="text-xs text-muted-foreground">
											No conversations yet
										</p>
										<Button
											variant="outline"
											size="sm"
											className="mt-2 text-xs h-7"
											onClick={handleNewChat}
										>
											Start your first chat
										</Button>
									</div>
								) : (
									// Conversation list
									filteredConversations.map((conversation: Conversation) => (
										<Button
											key={conversation.id}
											variant={
												conversation.id === currentConversationId
													? "secondary"
													: "ghost"
											}
											className="w-full justify-start text-left h-8 text-xs px-2"
											onClick={() => handleConversationClick(conversation.id)}
										>
											<span className="truncate">{conversation.title}</span>
										</Button>
									))
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Main Content */}
				<main className="flex-1 bg-background">
					<div className="h-[calc(100vh-4rem)] w-full">{children}</div>
				</main>

				{/* Right Sidebar - Only show on chat page */}
				{activePage === "chat" && (
					<div className="w-80 bg-white border-l border-gray-200 flex-col hidden lg:flex">
						<div className="p-4 border-b border-gray-200">
							<h2 className="font-semibold text-gray-900 mb-2">Share Rita</h2>
							<p className="text-sm text-gray-600 mb-3">
								Invite teammates to use Rita and resolve support faster.
							</p>
							<Button
								className="w-full"
								onClick={() => setIsShareDialogOpen(true)}
							>
								<Share2 className="h-4 w-4 mr-2" />
								Share
							</Button>
						</div>

						<div className="flex-1 p-4">
							<div className="mb-6">
								<h3 className="font-semibold text-gray-900 mb-1">
									Knowledge base
								</h3>
								<Button
									variant="outline"
									size="icon"
									className="float-right -mt-6"
									onClick={openDocumentSelector}
									disabled={documentUploadIsUploading}
									title="Add knowledge base articles"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>

							<div className="space-y-3">
								<div className="flex gap-3">
									<Card className="flex-1 p-3 border">
										<div className="space-y-0">
											<h3 className="text-2xl font-medium font-serif">
												{knowledgeBaseFilesLoading
													? "-"
													: totalKnowledgeBaseFiles}
											</h3>
											<p className="text-sm text-muted-foreground">Articles</p>
										</div>
									</Card>
									<Card className="flex-1 p-3 border">
										<div className="space-y-0">
											<h3 className="text-2xl font-medium font-serif text-card-foreground">
												0
											</h3>
											<p className="text-sm text-muted-foreground">Vectors</p>
										</div>
									</Card>
									<Card className="flex-1 p-3 border">
										<div className="space-y-0">
											<h3 className="text-2xl font-medium font-serif text-card-foreground">
												0%
											</h3>
											<p className="text-sm text-muted-foreground">Accuracy</p>
										</div>
									</Card>
								</div>

								<div className="flex items-center gap-1">
									<span className="text-sm">
										{knowledgeBaseFilesLoading ? "-" : totalKnowledgeBaseFiles}
									</span>
									<span className="text-sm text-muted-foreground">
										recent articles
									</span>
								</div>

								{knowledgeBaseFilesLoading ? (
									<Card className="p-4 border rounded-lg">
										<div className="space-y-3">
											{[...Array(3)].map((_, i) => (
												<div key={i} className="flex items-center gap-3">
													<Skeleton className="w-8 h-8 rounded" />
													<div className="flex-1">
														<Skeleton className="h-4 w-3/4 mb-1" />
														<Skeleton className="h-3 w-1/2" />
													</div>
												</div>
											))}
										</div>
									</Card>
								) : knowledgeBaseFiles.length === 0 ? (
									<Card className="p-6 border rounded-lg text-center space-y-6">
										<div className="w-12 h-12 bg-card border rounded-md flex items-center justify-center mx-auto">
											<Newspaper className="h-6 w-6" />
										</div>
										<div className="space-y-2">
											<h3 className="text-xl font-medium font-serif">
												No Articles Found
											</h3>
											<p className="text-sm text-muted-foreground">
												Add your knowledge base articles and unlock instant chat
												with your company's articles.
											</p>
										</div>
										<Button
											variant="outline"
											onClick={openDocumentSelector}
											disabled={documentUploadIsUploading}
											className="gap-2"
										>
											<Plus className="h-4 w-4" />
											Add Article
										</Button>
									</Card>
								) : (
									<Card className="p-4 border rounded-lg">
										<div className="space-y-3">
											{knowledgeBaseFiles.slice(0, 3).map((file) => (
												<Button
													key={file.id}
													variant="ghost"
													className="flex items-center gap-3 h-auto w-full justify-start p-2 hover:bg-muted/50"
													onClick={() => navigate("/content")}
												>
													<div className="w-8 h-8 bg-card border rounded flex items-center justify-center">
														<FileText className="h-4 w-4 text-card-foreground" />
													</div>
													<div className="flex-1 min-w-0 text-left">
														<p className="text-sm font-medium truncate">
															{file.filename}
														</p>
														<p className="text-xs text-muted-foreground">
															{file.created_at?.toLocaleDateString() ||
																"Recently added"}
														</p>
													</div>
												</Button>
											))}
										</div>
										{knowledgeBaseFiles.length > 3 && (
											<div className="mt-3 pt-3 border-t border-border">
												<Button
													variant="ghost"
													size="sm"
													className="w-full text-xs text-muted-foreground hover:text-foreground"
													onClick={navigateToKnowledgeArticles}
												>
													View all {totalKnowledgeBaseFiles} articles
												</Button>
											</div>
										)}
									</Card>
								)}
							</div>
						</div>

						{/* Help Section */}
						<div className="p-4 border-t border-gray-200">
							<div className="space-y-2">
								<Button
									variant="ghost"
									size="sm"
									className="w-full justify-start gap-3"
								>
									<LifeBuoy className="h-4 w-4" />
									Help & Support
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="w-full justify-start gap-3"
								>
									<Zap className="h-4 w-4" />
									What's New
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Hidden file input for document upload */}
			<input
				ref={documentInputRef}
				type="file"
				className="hidden"
				onChange={handleDocumentUpload}
				accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.md,.doc,.docx,.xls,.xlsx"
				disabled={documentUploadIsUploading}
				multiple={false}
			/>

			{/* Welcome Dialog - Shows only on first login */}
			<WelcomeDialog
				open={shouldShowFirstTimeModal}
				onOpenChange={(open) => {
					if (!open) {
						markModalAsShown();
					}
				}}
				onUploadFiles={openDocumentSelector}
			/>

			{/* Share Dialog - Shows only when share button is clicked */}
			<ShareDialog
				open={isShareDialogOpen}
				onOpenChange={setIsShareDialogOpen}
			/>

			{/* Upload status messages */}
			{documentUploadIsError && (
				<div className="fixed bottom-4 right-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg max-w-sm animate-in slide-in-from-bottom-2">
					<div className="flex items-center gap-2 text-destructive">
						<div className="w-2 h-2 bg-destructive rounded-full" />
						<div>
							<p className="font-medium text-sm">Upload failed</p>
							<p className="text-xs opacity-90">
								{documentUploadError?.message || "Please try again"}
							</p>
						</div>
					</div>
				</div>
			)}

			{documentUploadIsSuccess && (
				<div className="fixed bottom-4 right-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg max-w-sm animate-in slide-in-from-bottom-2">
					<div className="flex items-center gap-2 text-green-700 dark:text-green-400">
						<div className="w-2 h-2 bg-green-500 rounded-full" />
						<div>
							<p className="font-medium text-sm">Upload successful</p>
							<p className="text-xs opacity-90">
								Document added to knowledge base
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
