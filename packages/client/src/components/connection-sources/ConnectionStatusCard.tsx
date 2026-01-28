"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ConnectionSource } from "@/constants/connectionSources";
import {
	formatRelativeTime,
	SOURCES,
	STATUS,
} from "@/constants/connectionSources";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";

interface TicketSyncInfo {
	lastSyncAt: string | null;
	recordsProcessed: number;
	isTicketSyncing: boolean;
	totalEstimated?: number;
}

interface ConnectionStatusCardProps {
	source: ConnectionSource;
	onRetry?: () => void;
	ticketSyncInfo?: TicketSyncInfo;
	/** Hide the status message (e.g., when sync info is shown elsewhere) */
	hideStatusMessage?: boolean;
}

/**
 * Get display field configuration based on source type
 * Returns labels and values for URL, user identifier, and credential fields
 */
function getDisplayFields(source: ConnectionSource) {
	const isServiceNow =
		source.type === SOURCES.SERVICENOW ||
		source.type === SOURCES.SERVICENOW_ITSM;

	// URL field
	let urlValue = source.settings?.url || "—";
	if (isServiceNow) {
		urlValue = source.settings?.instanceUrl || "—";
	}

	// User identifier field (username vs email)
	const userLabelKey = isServiceNow
		? ("statusCard.labels.username" as const)
		: ("statusCard.labels.email" as const);
	const userValue = isServiceNow
		? source.settings?.username || "—"
		: source.settings?.email || "—";

	// Credential field label (password vs API token)
	const credentialLabelKey = isServiceNow
		? ("statusCard.labels.password" as const)
		: ("statusCard.labels.apiToken" as const);

	return {
		urlValue,
		userLabelKey,
		userValue,
		credentialLabelKey,
	};
}

/**
 * Displays connection status card with credentials and status badge
 * Supports states: Testing (Syncing), Connected, Error (Failed with retry logic), and Not connected
 * For failed connections, offers retry up to 3 times before showing "Get Help" option
 */
export function ConnectionStatusCard({
	source,
	onRetry,
	ticketSyncInfo,
	hideStatusMessage,
}: ConnectionStatusCardProps) {
	const { t } = useTranslation("connections");
	const [retryCount, setRetryCount] = useState(0);
	const navigate = useNavigate();

	const maxRetries = 3;
	const showHelp = retryCount >= maxRetries;

	// Show retrying state when syncing/verifying after a retry attempt
	const isRetrying =
		retryCount > 0 &&
		(source.status === STATUS.SYNCING || source.status === STATUS.VERIFYING);

	const handleRetry = () => {
		setRetryCount((prev) => prev + 1);

		// Call parent retry handler if provided
		if (onRetry) {
			onRetry();
		}
	};

	const getStatusMessage = () => {
		// Show help option after max retries
		if (showHelp && source.status === STATUS.ERROR) {
			return (
				<div className="flex items-center gap-3">
					<p className="text-sm text-muted-foreground whitespace-nowrap">
						{t("statusCard.multipleAttemptsFailed")}
					</p>
					<Button
						size="sm"
						variant="outline"
						onClick={() => {
							navigate("/help");
						}}
					>
						{t("statusCard.getHelp")}
					</Button>
				</div>
			);
		}

		// Show "Retrying..." when syncing/verifying after a retry attempt
		if (isRetrying) {
			return (
				<p className="text-sm text-foreground whitespace-nowrap">
					{t("statusCard.retrying", { current: retryCount, max: maxRetries })}
				</p>
			);
		}

		// Show retry option for failed connections
		if (source.status === STATUS.ERROR) {
			return (
				<div className="flex items-center gap-3">
					<div className="text-sm text-destructive">
						<div>{t("statusCard.connectionFailed")}</div>
						<div>{retryCount > 0 && `(${retryCount}/${maxRetries})`}</div>
					</div>
					<Button size="sm" variant="outline" onClick={handleRetry}>
						<RefreshCw className="h-3 w-3 mr-1.5" />
						{t("statusCard.retry")}
					</Button>
				</div>
			);
		}

		// Show ticket import progress when syncing (ITSM)
		if (ticketSyncInfo?.isTicketSyncing) {
			// Show progress bar if we have total_estimated
			if (ticketSyncInfo.totalEstimated && ticketSyncInfo.totalEstimated > 0) {
				const progress =
					(ticketSyncInfo.recordsProcessed / ticketSyncInfo.totalEstimated) *
					100;
				return (
					<div className="flex items-center gap-2">
						<Progress value={progress} className="w-24" />
						<span className="text-sm text-muted-foreground whitespace-nowrap">
							{t("statusCard.ticketsProgress", {
								processed: ticketSyncInfo.recordsProcessed,
								total: ticketSyncInfo.totalEstimated,
							})}
						</span>
					</div>
				);
			}
			// Fallback to spinner if no total_estimated
			return (
				<p className="text-sm text-foreground whitespace-nowrap flex items-center gap-2">
					<Loader2 className="h-3 w-3 animate-spin" />
					{t("statusCard.importingTickets")}
				</p>
			);
		}

		switch (source.status) {
			case STATUS.SYNCING:
				return (
					<p className="text-sm text-foreground whitespace-nowrap">
						{t("statusCard.syncingConnection")}
					</p>
				);
			case STATUS.VERIFYING:
				return (
					<p className="text-sm text-foreground whitespace-nowrap">
						{t("statusCard.verifyingConnection")}
					</p>
				);
			case STATUS.CANCELLED:
				return (
					<p className="text-sm text-muted-foreground whitespace-nowrap">
						{t("statusCard.syncCancelled")}
					</p>
				);
			case STATUS.CONNECTED:
				// Hide status message when shown elsewhere (e.g., ITSM configuration)
				if (hideStatusMessage) {
					return null;
				}
				// For ITSM: show last ticket sync info if available
				if (ticketSyncInfo?.lastSyncAt) {
					return (
						<p className="text-sm text-foreground whitespace-nowrap">
							{t("statusCard.lastSynced", {
								time: formatRelativeTime(ticketSyncInfo.lastSyncAt),
							})}
							{ticketSyncInfo.recordsProcessed > 0 && (
								<span>
									{" "}
									·{" "}
									{t("statusCard.ticketsCount", {
										count: ticketSyncInfo.recordsProcessed,
									})}
								</span>
							)}
						</p>
					);
				}
				return (
					<p className="text-sm text-foreground whitespace-nowrap">
						{source.lastSync
							? t("statusCard.lastSynced", { time: source.lastSync })
							: t("statusCard.connected")}
					</p>
				);
			case STATUS.NOT_CONNECTED:
				return (
					<p className="text-sm text-muted-foreground whitespace-nowrap">
						{t("statusCard.notConfigured")}
					</p>
				);
			default:
				return null;
		}
	};

	const displayFields = getDisplayFields(source);
	const statusMessage = getStatusMessage();

	return (
		<div className="flex flex-col gap-1">
			<div className="border border-border bg-popover rounded-md p-4">
				<div className="rounded-lg">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
						{/* Credentials section */}
						<div className="flex flex-col gap-2 w-full md:w-auto md:max-w-xs">
							<div className="flex items-center gap-2">
								<p className="text-sm text-muted-foreground w-20 shrink-0">
									{t("statusCard.labels.url")}
								</p>
								<p className="text-sm text-foreground truncate">
									{displayFields.urlValue}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<p className="text-sm text-muted-foreground w-20 shrink-0">
									{t(displayFields.userLabelKey)}
								</p>
								<p className="text-sm text-foreground truncate">
									{displayFields.userValue}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<p className="text-sm text-muted-foreground w-20 shrink-0">
									{t(displayFields.credentialLabelKey)}
								</p>
								<p className="text-sm text-foreground truncate">
									••••••••••••••••••••
								</p>
							</div>
						</div>
						{/* Status badge - right-aligned on both mobile and desktop */}
						<div className="flex justify-end">
							<ConnectionStatusBadge
								status={source.status}
								showHelp={showHelp}
							/>
						</div>
					</div>
					{/* Status message - separate row for cleaner layout */}
					{statusMessage && (
						<div className="mt-3 pt-3 border-t border-border">
							{statusMessage}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
