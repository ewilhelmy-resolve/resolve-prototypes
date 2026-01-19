"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ConnectionSource } from "@/constants/connectionSources";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";

export interface SourceListCardProps {
	source: ConnectionSource;
	/** Whether card is clickable/interactive */
	isEnabled?: boolean;
	/** Placeholder sources hide the status badge */
	isPlaceholder?: boolean;
	/** Label for action button when enabled (e.g., "Configure" or "Manage") */
	actionLabel?: string;
	/** Label when disabled (e.g., "Coming Soon") */
	disabledLabel?: string;
	/** Custom icon override (for web search Globe icon) */
	icon?: ReactNode;
	/** Last sync label with interpolation (e.g., "Last synced {time}") */
	lastSyncLabel?: string;
}

/**
 * Reusable card for displaying data source entries in list views.
 * Used in ITSM Sources and Knowledge Sources pages.
 */
export function SourceListCard({
	source,
	isEnabled = true,
	isPlaceholder = false,
	actionLabel = "Manage",
	disabledLabel = "Coming Soon",
	icon,
	lastSyncLabel,
}: SourceListCardProps) {
	const renderIcon = () => {
		if (icon) {
			return icon;
		}
		// Use BASE_URL for production compatibility (handles subpath deployments)
		const baseUrl = import.meta.env.BASE_URL || "/";
		return (
			<img
				src={`${baseUrl}connections/icon_${source.type}.svg`}
				alt={`${source.title} icon`}
				className="w-5 h-5 flex-shrink-0"
			/>
		);
	};

	return (
		<Card
			className={`p-4 border border-border bg-popover transition-colors ${
				isEnabled
					? "hover:bg-accent cursor-pointer"
					: "cursor-default opacity-75"
			}`}
		>
			<div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
				<div className="flex flex-col gap-2">
					<div className="flex flex-col">
						<div className="flex items-center gap-2 flex-wrap">
							{renderIcon()}
							<p className="text-base font-bold text-foreground">
								{source.title}
							</p>
							{!isPlaceholder && (
								<ConnectionStatusBadge status={source.status} />
							)}
						</div>

						{source.lastSync && lastSyncLabel && (
							<p className="text-sm text-foreground mt-1">
								{lastSyncLabel.replace("{time}", source.lastSync)}
							</p>
						)}
						{source.description && (
							<p className="text-sm text-foreground mt-1">
								{source.description}
							</p>
						)}
					</div>
					{source.badges.length > 0 && (
						<div className="flex gap-2 flex-wrap">
							{source.badges.map((badge) => (
								<Badge key={badge} variant="secondary">
									{badge}
								</Badge>
							))}
						</div>
					)}
				</div>
				<Button
					variant="secondary"
					size="sm"
					className="w-full sm:w-auto shrink-0"
					disabled={!isEnabled}
				>
					{isEnabled ? (
						<span>{actionLabel}</span>
					) : (
						<span>{disabledLabel}</span>
					)}
				</Button>
			</div>
		</Card>
	);
}
