"use client";

import { ArrowLeft, ChevronRight, PanelLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

interface HeaderBreadcrumbItem {
	label: string;
	href?: string;
}

interface HeaderProps {
	/** Breadcrumb items array (optional) */
	breadcrumbs?: HeaderBreadcrumbItem[];
	/** Page title */
	title: string;
	/** Optional icon to display before title */
	icon?: ReactNode;
	/** Optional description text below title */
	description?: string;
	/** Optional button to display on the right side of the header */
	action?: ReactNode;
}

/**
 * Page header component with breadcrumbs, title, icon, and description
 * Used for settings pages and detail views
 */
export default function SettingsHeader({
	breadcrumbs,
	title,
	icon,
	description,
	action,
}: HeaderProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { toggleSidebar } = useSidebar();

	const isProfilePage = location.pathname === "/settings/profile";

	const handleBackClick = () => {
		if (isProfilePage) {
			toggleSidebar();
		} else {
			navigate("/settings/profile");
		}
	};

	return (
		<div className="flex flex-col gap-8 w-full mt-4 px-4 md:px-0">
			{/* Breadcrumb navigation bar */}
			{(!breadcrumbs || breadcrumbs.length === 0) && (
				<div className="flex items-center gap-2 border-b border-border pb-2 -mx-4 px-4 md:-mx-0 md:px-0">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 shrink-0"
						onClick={toggleSidebar}
						aria-label="Toggle sidebar"
					>
						<PanelLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						className="h-8 px-2 gap-2 flex items-center"
						onClick={handleBackClick}
						aria-label={isProfilePage ? "Toggle sidebar" : "Back to Settings"}
					>
						<ArrowLeft className="h-4 w-4" />
						<span className="text-sm">Settings</span>
					</Button>
				</div>
			)}

			{breadcrumbs && breadcrumbs.length > 0 && (
				<div className="flex items-center gap-2 border-b border-border pb-2 -mx-4 px-4 md:-mx-0 md:px-0">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 shrink-0"
						onClick={toggleSidebar}
						aria-label="Toggle sidebar"
					>
						<PanelLeft className="h-4 w-4" />
					</Button>
					<Breadcrumb>
						<BreadcrumbList className="gap-2.5">
							{breadcrumbs.map((item, index) => {
								const isLast = index === breadcrumbs.length - 1;
								return (
									<div key={item.label} className="flex items-center gap-2.5">
										<BreadcrumbItem>
											{isLast ? (
												<BreadcrumbPage className="text-foreground text-sm">
													{item.label}
												</BreadcrumbPage>
											) : (
												<BreadcrumbLink asChild>
													<Link to={item.href || "#"}>{item.label}</Link>
												</BreadcrumbLink>
											)}
										</BreadcrumbItem>
										{!isLast && (
											<BreadcrumbSeparator>
												<ChevronRight className="h-4 w-4 text-muted-foreground" />
											</BreadcrumbSeparator>
										)}
									</div>
								);
							})}
						</BreadcrumbList>
					</Breadcrumb>
				</div>
			)}

			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						{icon && <div className="w-5 h-5 flex-shrink-0">{icon}</div>}
						<h3 className="text-2xl font-medium text-foreground leading-8">
							{title}
						</h3>
					</div>
					{action && <div className="flex-shrink-0 pr-[2em]">{action}</div>}
				</div>

				{description && (
					<p className="text-sm text-muted-foreground leading-5">
						{description}
					</p>
				)}
			</div>
		</div>
	);
}
