"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ConnectionSource } from "@/constants/connectionSources";
import { STATUS } from "@/constants/connectionSources";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";

interface ConnectionStatusCardProps {
	source: ConnectionSource;
	onRetry?: () => void;
	onGetHelp?: () => void;
}

/**
 * Displays connection status card with credentials and status badge
 * Supports states: Testing (Syncing), Connected, Error (Failed with retry logic), and Not connected
 * For failed connections, offers retry up to 3 times before showing "Get Help" option
 */
export function ConnectionStatusCard({
	source,
	onRetry,
	onGetHelp,
}: ConnectionStatusCardProps) {
	const [retryCount, setRetryCount] = useState(0);
	const [isRetrying, setIsRetrying] = useState(false);

	const maxRetries = 3;
	const showHelp = retryCount >= maxRetries;

	const handleRetry = () => {
		setIsRetrying(true);
		setRetryCount((prev) => prev + 1);

		// Call parent retry handler if provided
		if (onRetry) {
			onRetry();
		}

		// Simulate retry attempt
		setTimeout(() => {
			setIsRetrying(false);
		}, 2000);
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
							if (onGetHelp) {
								onGetHelp();
							}
						}}
					>
						Get Help
					</Button>
				</div>
			);
		}

		// Show retry option for failed connections
		if (source.status === STATUS.ERROR) {
			return (
				<div className="flex items-center gap-3">
					<p className="text-sm text-destructive whitespace-nowrap">
						Connection failed{" "}
						{retryCount > 0 && `(${retryCount}/${maxRetries})`}
					</p>
					<Button
						size="sm"
						variant="outline"
						onClick={handleRetry}
						disabled={isRetrying}
					>
						<RefreshCw
							className={`h-3 w-3 mr-1.5 ${isRetrying ? "animate-spin" : ""}`}
						/>
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
								<p className="text-sm text-muted-foreground w-10">URL</p>
								<p className="text-sm text-foreground truncate">
									{source.settings?.url || "—"}
								</p>
							</div>
							<div className="flex items-center gap-1">
								<p className="text-sm text-muted-foreground w-10">Email</p>
								<p className="text-sm text-foreground truncate">
									{source.settings?.email || "—"}
								</p>
							</div>
							<div className="flex items-center gap-1">
								<p className="text-sm text-muted-foreground w-10">API</p>
								<p className="text-sm text-foreground truncate">
									{source.settings?.token ? "••••••••••••••••••••" : "—"}
								</p>
							</div>
						</div>
						<div className="flex justify-center flex-1">
							<ConnectionStatusBadge
								status={source.status}
								isRetrying={isRetrying}
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
