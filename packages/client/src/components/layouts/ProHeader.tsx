import {
	ChevronDown,
	Grid3X3,
	LayoutDashboard,
	ListFilter,
	Play,
	Search,
	Settings2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/hooks/api/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { ExperienceSwitcher } from "./ExperienceSwitcher";

const MENU_ITEMS = [
	{ label: "Dashboard", path: "/pro", icon: LayoutDashboard },
	{ label: "Dynamic MCPs", path: "/pro/mcp", icon: Settings2 },
	{ label: "Runbooks", path: "/pro/runbooks", icon: Play },
] as const;

export function ProHeader() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const { data: profile } = useProfile();
	const navigate = useNavigate();
	const location = useLocation();

	const orgName = profile?.organization?.name ?? "None";
	const displayName =
		user?.firstName && user?.lastName
			? `${user.firstName} ${user.lastName}`
			: (user?.username ?? "User");

	return (
		<header className="flex h-12 items-center justify-between bg-slate-800 px-4">
			{/* Left: Logo + grid menu */}
			<div className="flex items-center gap-3">
				<img src="/logo-pro.png" alt="Resolve Actions Pro" className="h-8" />
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="size-8 text-slate-400 hover:bg-slate-700 hover:text-white"
							aria-label="Main menu"
						>
							<Grid3X3 className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-48">
						{MENU_ITEMS.map((item) => (
							<DropdownMenuItem
								key={item.path}
								onClick={() => navigate(item.path)}
								className={
									location.pathname === item.path ? "bg-accent font-medium" : ""
								}
							>
								<item.icon className="size-4" />
								{item.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Right: Org + User + Search + Actions */}
			<div className="flex items-center gap-4">
				<ExperienceSwitcher variant="dark" />
				<DropdownMenu>
					<DropdownMenuTrigger className="flex items-center gap-1 text-sm text-slate-300 outline-none hover:text-white">
						{orgName}
						<ChevronDown className="size-3" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem disabled>{orgName}</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<span className="text-sm font-medium text-slate-200">
					{displayName}
				</span>

				{/* Search */}
				<div className="flex items-center gap-1 rounded-md bg-slate-700 px-2.5 py-1.5">
					<Search className="size-3.5 text-slate-400" />
					<input
						type="text"
						placeholder={t("actions.search")}
						className="w-32 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none"
						aria-label="Search"
					/>
				</div>

				{/* Action icons */}
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-8 text-slate-400 hover:bg-slate-700 hover:text-white"
					>
						<Search className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8 text-slate-400 hover:bg-slate-700 hover:text-white"
					>
						<Play className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8 text-slate-400 hover:bg-slate-700 hover:text-white"
					>
						<ListFilter className="size-4" />
					</Button>
				</div>
			</div>
		</header>
	);
}
