"use client";

import { ArrowLeft, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	useSidebar,
} from "@/components/ui/sidebar";
import { useProfilePermissions } from "@/hooks/api/useProfile";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { cn } from "@/lib/utils";

interface RitaSettingsLayoutProps {
	children?: ReactNode;
}

function SettingsContent({ children }: { children?: ReactNode }) {
	const { open } = useSidebar();

	return (
		<main
			className={cn(
				"w-full transition-[margin] duration-200 ease-linear mr-4",
				open ? "md:ml-[calc(var(--sidebar-width)+2em)]" : "md:ml-6",
			)}
		>
			{children}
		</main>
	);
}

export default function RitaSettingsLayout({
	children,
}: RitaSettingsLayoutProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { isOwnerOrAdmin } = useProfilePermissions();
	const isServiceNowEnabled = useFeatureFlag("ENABLE_SERVICENOW");

	const handleBackToApp = () => {
		// Navigate to root, which will redirect to the default app route
		navigate("/");
	};

	// Check if current path matches route (including sub-routes)
	const isConnectionSourcesActive = location.pathname.startsWith(
		"/settings/connections",
	);
	const isKnowledgeSourcesActive = location.pathname.includes(
		"/connections/knowledge",
	);
	const isItsmSourcesActive = location.pathname.includes("/connections/itsm");
	const isUsersActive = location.pathname.startsWith("/settings/users");
	const isProfileActive = location.pathname === "/settings/profile";

	return (
		<SidebarProvider defaultOpen={true}>
			<Sidebar>
				<SidebarHeader className="p-2">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								className="flex items-center gap-2 p-2 h-8 rounded-md cursor-pointer"
								onClick={handleBackToApp}
							>
								<ArrowLeft className="h-4 w-4" />
								<span className="text-sm">Back to app</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>

				<SidebarContent>
					<SidebarGroup className="p-2">
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									className={cn(
										"p-2 h-8 rounded-md cursor-pointer",
										isProfileActive && "bg-accent text-accent-foreground",
									)}
									onClick={() => navigate("/settings/profile")}
								>
									<span className="text-sm">Profile</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroup>

					{isOwnerOrAdmin() && (
						<SidebarGroup className="p-2">
							<SidebarGroupLabel className="px-2 h-8 text-xs opacity-70">
								Admin
							</SidebarGroupLabel>

							<SidebarMenu>
								<Collapsible
									defaultOpen={isConnectionSourcesActive}
									className="group/collapsible"
								>
									<SidebarMenuItem>
										<CollapsibleTrigger asChild>
											<SidebarMenuButton
												className={cn(
													"p-2 h-8 rounded-md cursor-pointer justify-between",
													isConnectionSourcesActive && "text-accent-foreground",
												)}
											>
												<span className="text-sm">Connection Sources</span>
												<ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
											</SidebarMenuButton>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub>
												<SidebarMenuSubItem>
													<SidebarMenuSubButton
														className={cn(
															"cursor-pointer",
															isKnowledgeSourcesActive &&
																"bg-accent text-accent-foreground",
														)}
														onClick={() =>
															navigate("/settings/connections/knowledge")
														}
													>
														<span className="text-sm">Knowledge Sources</span>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
												{isServiceNowEnabled && (
													<SidebarMenuSubItem>
														<SidebarMenuSubButton
															className={cn(
																"cursor-pointer",
																isItsmSourcesActive &&
																	"bg-accent text-accent-foreground",
															)}
															onClick={() =>
																navigate("/settings/connections/itsm")
															}
														>
															<span className="text-sm">ITSM Sources</span>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												)}
											</SidebarMenuSub>
										</CollapsibleContent>
									</SidebarMenuItem>
								</Collapsible>
								<SidebarMenuItem>
									<SidebarMenuButton
										className={cn(
											"p-2 h-8 rounded-md cursor-pointer",
											isUsersActive && "bg-accent text-accent-foreground",
										)}
										onClick={() => navigate("/settings/users")}
									>
										<span className="text-sm">Users</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroup>
					)}
				</SidebarContent>
				<div className="p-2 border-t border-sidebar-border invisible w-[256px]" />
			</Sidebar>

			<SettingsContent>{children}</SettingsContent>
		</SidebarProvider>
	);
}
