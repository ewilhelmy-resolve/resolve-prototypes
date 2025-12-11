"use client";

import {
	LayoutGrid,
	LogOut,
	MessageCirclePlus,
	Newspaper,
	PanelLeft,
	Plus,
	Search,
	SendHorizontal,
	Share2,
	Ticket,
	User,
	Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

// Import existing functionality
import { useSSEContext } from "../contexts/SSEContext";
import {
	useConversations,
	useCreateConversation,
	useSendMessage,
} from "../hooks/api/useConversations";
import { useAuth } from "../hooks/useAuth";
import { useConversationStore } from "../stores/conversationStore";
import { useUIStore } from "../stores/uiStore";

export default function ChatUIv1() {
	const { conversationId } = useParams<{ conversationId?: string }>();
	const navigate = useNavigate();
	const { latestUpdate } = useSSEContext();
	const { logout } = useAuth();
	const { toggleSidebar } = useUIStore();

	const [searchValue, setSearchValue] = useState("");
	const [messageValue, setMessageValue] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Store state
	const {
		currentConversationId,
		messages,
		isSending,
		isLoadingMore,
		updateMessage,
		clearCurrentConversation,
		setCurrentConversation,
	} = useConversationStore();

	// Queries and mutations
	useConversations(); // Keep conversations in sync
	// Note: Message loading is now handled by useInfiniteConversationMessages in useChatPagination
	const createConversationMutation = useCreateConversation();
	const sendMessageMutation = useSendMessage();

	// Sync URL parameter with conversation store
	useEffect(() => {
		if (conversationId && conversationId !== currentConversationId) {
			setCurrentConversation(conversationId);
		} else if (!conversationId && currentConversationId) {
			setCurrentConversation(null);
		}
	}, [conversationId, currentConversationId, setCurrentConversation]);

	// Handle SSE message updates
	useEffect(() => {
		if (latestUpdate) {
			console.log("Applying SSE update to store:", latestUpdate);
			updateMessage(latestUpdate.messageId, {
				status: latestUpdate.status,
				error_message: latestUpdate.errorMessage,
			});
		}
	}, [latestUpdate, updateMessage]);

	const handleNewChat = useCallback(() => {
		clearCurrentConversation();
		navigate("/chat");
	}, [clearCurrentConversation, navigate]);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ctrl+K or Cmd+K for new chat
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				handleNewChat();
			}
			// Ctrl+B or Cmd+B for toggle sidebar
			if ((e.ctrlKey || e.metaKey) && e.key === "b") {
				e.preventDefault();
				toggleSidebar();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleNewChat, toggleSidebar]);

	// Auto-scroll to bottom when messages change
	// biome-ignore lint/correctness/useExhaustiveDependencies: needed for scroll
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSendMessage = async () => {
		if (!messageValue.trim() || isSending) return;

		const messageContent = messageValue;
		const tempId = `msg_${Date.now()}`;

		setMessageValue("");

		try {
			let conversationId = currentConversationId;

			// Create conversation if we don't have one
			if (!conversationId) {
				const conversation = await createConversationMutation.mutateAsync({
					title:
						messageContent.substring(0, 50) +
						(messageContent.length > 50 ? "..." : ""),
				});
				conversationId = conversation.id;
				// Navigate to the new conversation URL
				navigate(`/chat/${conversationId}`);
			}

			// Send message
			await sendMessageMutation.mutateAsync({
				conversationId,
				content: messageContent,
				tempId,
			});
		} catch (error) {
			console.error("Failed to send message:", error);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const handleSignOut = async () => {
		try {
			logout();
		} catch (error) {
			console.error("Failed to sign out:", error);
		}
	};

	return (
		<div className="h-dvh flex flex-col">
			{/* Top Header Bar - Unstyled */}
			<div className="border-b px-6 py-3 flex-shrink-0">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<svg
							width="100"
							height="19"
							viewBox="0 0 100 19"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M96.0801 3.875H93.7709C93.5371 3.875 93.3617 4.04852 93.3617 4.27987V5.08961C93.3324 5.08961 93.3325 5.08961 93.3325 5.08961H91.6079C91.4909 5.08961 91.374 5.14745 91.2863 5.23421L89.9125 6.88261H82.7803C82.5465 6.88261 82.3711 7.05613 82.3711 7.28751C82.3711 7.51887 82.5465 7.69238 82.7803 7.69238H89.854H90.0879C90.2048 7.69238 90.3217 7.63454 90.4094 7.54779L91.7832 5.89935H93.3325C93.3617 5.89935 93.3617 5.89935 93.3617 5.89935V6.5645C93.3617 6.79585 93.5371 6.96937 93.7709 6.96937H96.0801C96.3139 6.96937 96.4893 6.79585 96.4893 6.5645V4.27987C96.4893 4.04852 96.3139 3.875 96.0801 3.875ZM95.6709 6.15963H94.2094V4.71366H95.6709V6.15963Z"
								fill="currentColor"
							></path>
						</svg>
						<span className="text-sm">RITA Go</span>
					</div>

					<div className="flex items-center gap-2">
						<Button variant="ghost" size="sm" onClick={handleNewChat}>
							<Plus className="h-4 w-4" />
							<span className="hidden sm:inline">New Chat</span>
						</Button>

						<Button variant="outline" size="sm">
							<Zap className="h-4 w-4 mr-2" />
							Upgrade
						</Button>

						<Button variant="ghost" size="sm" onClick={handleSignOut}>
							<LogOut className="h-4 w-4" />
							<span className="hidden sm:inline">Sign Out</span>
						</Button>
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 flex">
				<SidebarProvider>
					<div className="flex h-full w-full overflow-hidden">
						{/* Sidebar */}
						<Sidebar className="hidden lg:block bg-sidebar border-r">
							<SidebarHeader className="p-4">
								<div className="px-2 flex items-center gap-2 mb-3">
									<SidebarTrigger>
										<PanelLeft className="h-4 w-4" />
									</SidebarTrigger>
									<span className="text-sm font-medium">Menu</span>
								</div>
								<div className="px-2">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											placeholder="Search"
											value={searchValue}
											onChange={(e) => setSearchValue(e.target.value)}
											className="pl-9 h-9 bg-background border-input"
										/>
									</div>
								</div>
							</SidebarHeader>
							<SidebarContent>
								<SidebarGroup>
									<SidebarGroupContent>
										<SidebarMenu>
											<SidebarMenuItem>
												<SidebarMenuButton
													className="h-8"
													onClick={handleNewChat}
												>
													<MessageCirclePlus className="h-4 w-4" />
													<span>New chat</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
											<SidebarMenuItem>
												<SidebarMenuButton className="h-8">
													<LayoutGrid className="h-4 w-4" />
													<span>Dashboard</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
										</SidebarMenu>
									</SidebarGroupContent>
								</SidebarGroup>
								<SidebarGroup>
									<SidebarGroupLabel className="text-xs opacity-70">
										Manage
									</SidebarGroupLabel>
									<SidebarGroupContent>
										<SidebarMenu>
											<SidebarMenuItem>
												<SidebarMenuButton className="h-8">
													<Newspaper className="h-4 w-4" />
													<span>Knowledge articles</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
											<SidebarMenuItem>
												<SidebarMenuButton className="h-8">
													<Ticket className="h-4 w-4" />
													<span>Tickets</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
											<SidebarMenuItem>
												<SidebarMenuButton className="h-8">
													<User className="h-4 w-4" />
													<span>Users</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
										</SidebarMenu>
									</SidebarGroupContent>
								</SidebarGroup>
								<SidebarGroup>
									<SidebarGroupLabel className="text-xs opacity-70">
										Recent chats
									</SidebarGroupLabel>
									<SidebarGroupContent>
										<SidebarMenu>
											<SidebarMenuItem>
												<SidebarMenuButton className="h-8">
													<span>Password reset articles</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
											<SidebarMenuItem>
												<SidebarMenuButton className="h-8 bg-sidebar-accent text-sidebar-accent-foreground">
													<span>VPN Connection Troubleshooting</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
											<SidebarMenuItem>
												<SidebarMenuButton className="h-8">
													<span>Two-factor authentication setup</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
											<SidebarMenuItem>
												<SidebarMenuButton className="h-8">
													<span>Phishing awareness guide</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
											<SidebarMenuItem>
												<SidebarMenuButton className="h-8">
													<span>Email Configuration Setup</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
										</SidebarMenu>
									</SidebarGroupContent>
								</SidebarGroup>
							</SidebarContent>
						</Sidebar>

						{/* Main Chat Area */}
						<main className="flex-1 bg-background flex flex-col">
							<div className="flex flex-col flex-1">
								{/* Messages Area */}
								<div className="flex-1 overflow-y-auto p-4">
									{isLoadingMore ||
									(currentConversationId && messages.length === 0) ? (
										<div className="max-w-4xl mx-auto space-y-4">
											{[...Array(3)].map((_, i) => (
												<div key={i} className="flex items-start gap-3">
													<Skeleton className="w-8 h-8 rounded-full" />
													<div className="flex-1 space-y-2">
														<div className="flex items-center gap-2">
															<Skeleton className="h-4 w-16" />
															<Skeleton className="h-3 w-12" />
														</div>
														<Skeleton className="h-12 w-full rounded-lg" />
													</div>
												</div>
											))}
										</div>
									) : !currentConversationId || messages.length === 0 ? (
										<div className="h-full flex items-center justify-center">
											<div className="text-center max-w-lg mx-auto">
												<h1 className="text-5xl font-medium text-foreground font-serif mb-4">
													Ask RITA
												</h1>
												<p className="text-base text-foreground leading-relaxed">
													Diagnose and resolve issues, then create automations
													to speed up future remediation
												</p>
											</div>
										</div>
									) : (
										<div className="max-w-4xl mx-auto space-y-4">
											{messages.map((message, index) => (
												<div
													key={message.id}
													className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1`}
													style={{
														animationDelay: `${index * 100}ms`,
														animationFillMode: "both",
													}}
												>
													<div
														className={`max-w-[85%] ${message.role === "user" ? "ml-auto" : ""}`}
													>
														<div className="min-w-0">
															<div
																className={`flex items-center gap-2 mb-2 ${message.role === "user" ? "justify-end" : ""}`}
															>
																<span className="text-sm font-semibold">
																	{message.role === "user" ? "You" : "RITA"}
																</span>
																<span className="text-xs text-muted-foreground/70 font-medium">
																	{message.timestamp.toLocaleTimeString([], {
																		hour: "2-digit",
																		minute: "2-digit",
																	})}
																</span>
															</div>
															{message.role === "user" ? (
																<div
																	className="text-sm rounded-2xl px-4 py-3"
																	style={{ backgroundColor: "#F7F9FF" }}
																>
																	<p className="leading-relaxed text-gray-800">
																		{message.message}
																	</p>
																</div>
															) : (
																<div className="text-sm">
																	<p className="leading-relaxed text-gray-800">
																		{message.message}
																	</p>
																</div>
															)}

															{/* Status indicator for user messages */}
															{message.role === "user" &&
																message.status !== "completed" && (
																	<div
																		className={`mt-3 flex items-center gap-2 text-xs ${message.role === "user" ? "justify-end" : ""}`}
																	>
																		<div
																			className={`px-2 py-1 rounded-full flex items-center gap-1.5 ${
																				message.status === "failed"
																					? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400"
																					: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
																			}`}
																		>
																			{message.status === "sending" && (
																				<>
																					<div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
																					<span className="font-medium">
																						Sending...
																					</span>
																				</>
																			)}
																			{message.status === "pending" && (
																				<>
																					<div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
																					<span className="font-medium">
																						Waiting for response...
																					</span>
																				</>
																			)}
																			{message.status === "processing" && (
																				<>
																					<div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
																					<span className="font-medium">
																						Processing...
																					</span>
																				</>
																			)}
																			{message.status === "failed" && (
																				<>
																					<div className="w-2 h-2 bg-red-500 rounded-full"></div>
																					<span className="font-medium">
																						Failed to send{" "}
																						{message.error_message &&
																							`- ${message.error_message}`}
																					</span>
																				</>
																			)}
																		</div>
																	</div>
																)}
														</div>
													</div>
												</div>
											))}
											<div ref={messagesEndRef} />
										</div>
									)}
								</div>

								{/* Input Area */}
								<div className="p-4 border-t border-gray-200 bg-white">
									<div className="flex items-center gap-2">
										<Textarea
											value={messageValue}
											onChange={(e) => setMessageValue(e.target.value)}
											onKeyPress={handleKeyPress}
											placeholder="Ask me anything..."
											className="flex-1 resize-none min-h-[40px] max-h-[120px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
											rows={1}
											disabled={isSending}
										/>
										<Button
											onClick={handleSendMessage}
											disabled={!messageValue.trim() || isSending}
											size="sm"
											className="shrink-0"
										>
											<SendHorizontal className="w-4 h-4" />
										</Button>
									</div>
								</div>
							</div>
						</main>

						{/* Right Panel */}
						<div className="w-72 bg-background p-4 space-y-6 hidden lg:block">
							<Card className="border">
								<CardHeader className="space-y-1.5">
									<CardTitle className="text-2xl font-medium font-serif">
										Share RITA
									</CardTitle>
									<p className="text-sm text-muted-foreground">
										Invite teammates to use RITA and resolve support faster.
									</p>
								</CardHeader>
								<CardContent>
									<Button className="w-full">
										<Share2 className="h-4 w-4 mr-2" />
										Share
									</Button>
								</CardContent>
							</Card>

							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<h4 className="text-xl font-medium font-serif">
										Knowledge base
									</h4>
									<Button variant="outline" size="icon">
										<Plus className="h-4 w-4" />
									</Button>
								</div>

								<div className="space-y-3">
									<div className="flex gap-3">
										<Card className="flex-1 p-3 border">
											<div className="space-y-0">
												<h3 className="text-2xl font-medium font-serif">0</h3>
												<p className="text-sm text-muted-foreground">
													Articles
												</p>
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
												<p className="text-sm text-muted-foreground">
													Accuracy
												</p>
											</div>
										</Card>
									</div>

									<div className="flex items-center gap-1">
										<span className="text-sm">0</span>
										<span className="text-sm text-muted-foreground">
											recent articles
										</span>
									</div>

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
										<Button variant="secondary">
											<Plus className="h-4 w-4 mr-2" />
											Add Articles
										</Button>
									</Card>
								</div>
							</div>
						</div>
					</div>
				</SidebarProvider>
			</div>
		</div>
	);
}
