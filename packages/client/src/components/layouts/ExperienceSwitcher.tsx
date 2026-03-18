import { Check, ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

type Experience = "ritaGo" | "actionsPro" | "resolveActions";

interface ExperienceOption {
	id: Experience;
	label: string;
}

const EXPERIENCES: ExperienceOption[] = [
	{ id: "ritaGo", label: "Rita Go" },
	{ id: "actionsPro", label: "Actions Pro" },
	{ id: "resolveActions", label: "Resolve Actions" },
];

interface ExperienceSwitcherProps {
	variant?: "light" | "dark";
}

export function ExperienceSwitcher({
	variant = "light",
}: ExperienceSwitcherProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const headerStyle = useUIStore((state) => state.headerStyle);
	const setHeaderStyle = useUIStore((state) => state.setHeaderStyle);

	const current: Experience = location.pathname.startsWith("/pro")
		? "actionsPro"
		: headerStyle === "resolve"
			? "resolveActions"
			: "ritaGo";

	const currentLabel =
		EXPERIENCES.find((e) => e.id === current)?.label ?? "Rita Go";

	const handleSelect = (exp: ExperienceOption) => {
		if (exp.id === current) return;

		if (exp.id === "actionsPro") {
			// Ensure RITA header before navigating to Pro
			if (headerStyle === "resolve") setHeaderStyle("rita");
			navigate("/pro");
		} else if (exp.id === "resolveActions") {
			// If on /pro, navigate back first
			if (location.pathname.startsWith("/pro")) navigate("/chat");
			setHeaderStyle("resolve");
		} else {
			// Rita Go
			if (headerStyle === "resolve") setHeaderStyle("rita");
			if (location.pathname.startsWith("/pro")) navigate("/chat");
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"flex items-center gap-1 text-sm font-medium outline-none cursor-pointer",
					variant === "dark"
						? "text-slate-200 hover:text-white"
						: "text-foreground hover:text-foreground/80",
				)}
			>
				{currentLabel}
				<ChevronDown className="size-3.5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" sideOffset={8}>
				{EXPERIENCES.map((exp) => (
					<DropdownMenuItem
						key={exp.id}
						onClick={() => handleSelect(exp)}
						className="flex items-center gap-2"
					>
						<Check
							className={cn(
								"size-3.5",
								exp.id === current ? "opacity-100" : "opacity-0",
							)}
						/>
						{exp.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
