import { Grid3X3, ListFilter, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
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

export function ProHeader() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const { data: profile } = useProfile();

	const orgName = profile?.organization?.name ?? "None";
	const displayName =
		user?.firstName && user?.lastName
			? `${user.firstName} ${user.lastName}`
			: (user?.username ?? "User");

	return (
		<header className="flex h-12 items-center justify-between bg-slate-800 px-4">
			{/* Left: Logo + grid icon */}
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2">
					<img
						src="/logo-mark.svg"
						alt=""
						className="h-6 w-6 brightness-0 invert"
					/>
					<div className="flex items-baseline gap-1">
						<span className="text-[10px] font-medium uppercase tracking-widest text-slate-300">
							Resolve
						</span>
						<span className="text-[10px] font-medium uppercase tracking-widest text-slate-300">
							Actions
						</span>
						<span className="text-[10px] font-bold uppercase tracking-widest text-white">
							Pro
						</span>
					</div>
				</div>
				<ExperienceSwitcher variant="dark" />
				<Button
					variant="ghost"
					size="icon"
					className="size-8 text-slate-400 hover:bg-slate-700 hover:text-white"
				>
					<Grid3X3 className="size-4" />
				</Button>
			</div>

			{/* Center-right: Org + User */}
			<div className="flex items-center gap-4">
				<DropdownMenu>
					<DropdownMenuTrigger className="flex items-center gap-1 text-sm text-slate-300 outline-none hover:text-white">
						<span className="text-slate-400">{t("labels.organization")}:</span>
						<span className="font-medium">{orgName}</span>
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
						<ListFilter className="size-4" />
					</Button>
				</div>
			</div>
		</header>
	);
}
