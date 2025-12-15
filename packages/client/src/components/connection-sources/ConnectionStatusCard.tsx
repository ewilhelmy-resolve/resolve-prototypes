"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { ConnectionSource } from "@/constants/connectionSources";
import { SOURCES, STATUS } from "@/constants/connectionSources";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";

interface ConnectionStatusCardProps {
	source: ConnectionSource;
	onRetry?: () => void;
}

/**
 * Displays connection status card with credentials and status badge
 * Supports states: Testing (Syncing), Connected, Error (Failed with retry logic), and Not connected
 * For failed connections, offers retry up to 3 times before showing "Get Help" option
 */
export function ConnectionStatusCard({
	source,
	onRetry,
}: ConnectionStatusCardProps) {
	const [retryCount, setRetryCount] = useState(0);
	const navigate = useNavigate();

	const maxRetries = 3;
	const showHelp = retryCount >= maxRetries;

	// Show retrying state when syncing/verifying after a retry attempt
	const isRetrying = retryCount > 0 && (source.status === STATUS.SYNCING || source.status === STATUS.VERIFYING);

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
						Multiple attempts failed
					</p>
					<Button
						size="sm"
						variant="outline"
						onClick={() => {
							navigate('/help');
						}}
					>
						Get Help
					</Button>
				</div>
			);
		}

		// Show "Retrying..." when syncing/verifying after a retry attempt
		if (isRetrying) {
			return (
				<p className="text-sm text-foreground whitespace-nowrap">
					Retrying... ({retryCount}/{maxRetries})
				</p>
			);
		}

		// Show retry option for failed connections
		if (source.status === STATUS.ERROR) {
			return (
				<div className="flex items-center gap-3">
					<div className="text-sm text-destructive">
						<div>
							Connection failed
						</div>
						<div>{retryCount > 0 && `(${retryCount}/${maxRetries})`}</div>
					</div>
					<Button
						size="sm"
						variant="outline"
						onClick={handleRetry}
					>
						<RefreshCw className="h-3 w-3 mr-1.5" />
						Retry
					</Button>
				</div>
			);
		}

		switch (source.status) {
			case STATUS.SYNCING:
				return (
					<p className="text-sm text-foreground whitespace-nowrap">
						Syncing connection...
					</p>
				);
			case STATUS.VERIFYING:
				return (
					<p className="text-sm text-foreground whitespace-nowrap">
						Verifying connection...
					</p>
				);
			case STATUS.CANCELLED:
				return (
					<p className="text-sm text-muted-foreground whitespace-nowrap">
						Sync cancelled by user
					</p>
				);
			case STATUS.CONNECTED:
				return (
					<p className="text-sm text-foreground whitespace-nowrap">
						{source.lastSync
							? `Last synced ${source.lastSync}`
							: "Connected"}
					</p>
				);
			case STATUS.NOT_CONNECTED:
				return (
					<p className="text-sm text-muted-foreground whitespace-nowrap">
						Not configured
					</p>
				);
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col gap-1">
			<div className="border border-border bg-popover rounded-md p-4">
				<div className="rounded-lg">
					<div className="flex flex-col md:flex-row items-center justify-between gap-5">
						<div className="flex flex-col gap-2 max-w-xs">
							<div className="flex items-center gap-1">
								<p className="text-sm text-muted-foreground w-16">URL</p>
								<p className="text-sm text-foreground truncate">
									{source.type === SOURCES.SERVICENOW
										? source.settings?.instanceUrl || "—"
										: source.settings?.url || "—"}
								</p>
							</div>
							<div className="flex items-center gap-1">
								<p className="text-sm text-muted-foreground w-16">
									{source.type === SOURCES.SERVICENOW ? "Username" : "Email"}
								</p>
								<p className="text-sm text-foreground truncate">
									{source.type === SOURCES.SERVICENOW
										? source.settings?.username || "—"
										: source.settings?.email || "—"}
								</p>
							</div>
							<div className="flex items-center gap-1">
								<p className="text-sm text-muted-foreground w-16">
									{source.type === SOURCES.SERVICENOW ? "Password" : "API"}
								</p>
								<p className="text-sm text-foreground truncate">
									••••••••••••••••••••
								</p>
							</div>
						</div>
						<div className="flex justify-center flex-1">
							<ConnectionStatusBadge
								status={source.status}
								showHelp={showHelp}
							/>
						</div>
						<div className="flex items-center mr-6">{getStatusMessage()}</div>
					</div>
				</div>
			</div>
		</div>
	);
}
