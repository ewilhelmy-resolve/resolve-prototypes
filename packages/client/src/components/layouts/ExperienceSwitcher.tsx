import { Check, ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Experience = "ritaGo" | "actionsPro";

interface ExperienceOption {
	id: Experience;
	label: string;
	path: string;
}

const EXPERIENCES: ExperienceOption[] = [
	{ id: "ritaGo", label: "Rita Go", path: "/chat" },
	{ id: "actionsPro", label: "Actions Pro", path: "/pro" },
];

function resolveCurrentExperience(pathname: string): Experience {
	if (pathname.startsWith("/pro")) return "actionsPro";
	return "ritaGo";
}

interface ExperienceSwitcherProps {
	variant?: "light" | "dark";
}

export function ExperienceSwitcher({
	variant = "light",
}: ExperienceSwitcherProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const current = resolveCurrentExperience(location.pathname);
	const currentLabel =
		EXPERIENCES.find((e) => e.id === current)?.label ?? "Rita Go";

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
						onClick={() => {
							if (exp.id !== current) navigate(exp.path);
						}}
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
