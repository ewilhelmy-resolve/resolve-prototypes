"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarSeparator,
} from "@/components/ui/sidebar";
import { useProfilePermissions } from "@/hooks/api/useProfile";
import { cn } from "@/lib/utils";

interface RitaSettingsLayoutProps {
	children?: ReactNode;
}

export default function RitaSettingsLayout({
	children,
}: RitaSettingsLayoutProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { isOwnerOrAdmin } = useProfilePermissions();

	const handleBackToApp = () => {
		// Navigate to root, which will redirect to the default app route
		navigate("/");
	};

	// Check if current path matches route (including sub-routes)
	const isConnectionSourcesActive = location.pathname.startsWith(
		"/settings/connections",
	);
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
								<span className="text-sm">Settings</span>
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
						<>
							<SidebarSeparator />

							<SidebarGroup className="p-2">
								<SidebarGroupLabel className="px-2 h-8 text-xs opacity-70">
									Admin
								</SidebarGroupLabel>

								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton
											className={cn(
												"p-2 h-8 rounded-md cursor-pointer",
												isConnectionSourcesActive &&
													"bg-accent text-accent-foreground",
											)}
											onClick={() => navigate("/settings/connections")}
										>
											<span className="text-sm">Connection Sources</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
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
						</>
					)}
				</SidebarContent>
			</Sidebar>

			<SidebarInset className="flex flex-col items-start w-full md:ml-[calc(var(--sidebar-width)-6rem)]">
				<main className="w-full p-6">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
