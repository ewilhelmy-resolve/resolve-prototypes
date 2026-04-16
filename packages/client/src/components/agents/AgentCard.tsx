/**
 * AgentCard - Card component for displaying agent summary
 *
 * Displays agent name, description, status badge, and icon
 * Used in the "Recent agents" section of the Agents landing page
 */

import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/types/agent";

export interface AgentCardProps {
	/** Agent name */
	name: string;
	/** Agent description */
	description: string;
	/** Agent status */
	status: AgentStatus;
	/** Icon component to display */
	icon: LucideIcon;
	/** Background color for icon container */
	iconBgColor?: string;
	/** Agent skills */
	skills?: string[];
	/** Click handler */
	onClick?: () => void;
	/** Additional className */
	className?: string;
}

const statusConfig = {
	draft: { labelKey: "card.statusDraft", variant: "secondary" },
	published: { labelKey: "card.statusPublished", variant: "default" },
	disabled: { labelKey: "card.statusDisabled", variant: "outline" },
} as const satisfies Record<
	AgentStatus,
	{ labelKey: string; variant: "default" | "secondary" | "outline" }
>;

export function AgentCard({
	name,
	description,
	status,
	icon: Icon,
	iconBgColor = "bg-slate-100",
	skills,
	onClick,
	className,
}: AgentCardProps) {
	const { t } = useTranslation("agents");
	const statusInfo = statusConfig[status];
	const statusLabel = t(statusInfo.labelKey) as string;

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={t("card.ariaLabel", { name, status: statusLabel })}
			className={cn(
				"flex flex-col items-start p-6 rounded-xl border border-border bg-card",
				"hover:border-primary/20 hover:bg-muted/70 transition-colors cursor-pointer text-left w-full",
				className,
			)}
		>
			<div className="flex items-center justify-between w-full mb-1.5">
				<div className={cn("p-2 rounded-md", iconBgColor)}>
					<Icon className="size-5 text-foreground" />
				</div>
				<Badge variant={statusInfo.variant}>{statusLabel}</Badge>
			</div>
			<h3 className="font-semibold text-base text-card-foreground tracking-tight truncate w-full">
				{name}
			</h3>
			<p className="text-sm text-muted-foreground truncate w-full">
				{description}
			</p>
			{skills && skills.length > 0 && (
				<p className="text-xs text-muted-foreground truncate w-full mt-1">
					<span className="font-medium">{t("card.skillsLabel")}</span>{" "}
					{skills.slice(0, 2).join(", ")}
					{skills.length > 2 && ` +${skills.length - 2}`}
				</p>
			)}
		</button>
	);
}
