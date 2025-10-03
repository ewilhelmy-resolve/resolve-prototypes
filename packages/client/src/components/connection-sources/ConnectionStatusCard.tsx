"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	CircleCheck,
	CircleX,
	Loader2,
	RefreshCw,
	HelpCircle,
} from "lucide-react";
import type { ConnectionSource } from "@/constants/connectionSources";
import { STATUS } from "@/constants/connectionSources";
import { useState } from "react";

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
	const getStatusBadge = () => {
		// Show retrying state when actively retrying
		if (isRetrying && source.status === STATUS.ERROR) {
			return (
				<Badge
					variant="outline"
					className="bg-background border-blue-500 gap-1.5 px-3 py-1"
				>
					<Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
					Retrying...
				</Badge>
			);
		}

		// Show help needed state after max retries
		if (showHelp && source.status === STATUS.ERROR) {
			return (
				<Badge
					variant="outline"
					className="bg-background border-orange-500 gap-1.5 px-3 py-1"
				>
					<HelpCircle className="h-3 w-3 text-orange-500" />
					Need Help
				</Badge>
			);
		}

		switch (source.status) {
			case STATUS.SYNCING:
				return (
					<Badge
						variant="outline"
						className="bg-background border-blue-500 gap-1.5 px-3 py-1"
					>
						<Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
						Testing...
					</Badge>
				);
			case STATUS.ERROR:
				return (
					<Badge
						variant="outline"
						className="bg-background border-red-500 gap-1.5 px-3 py-1"
					>
						<CircleX className="h-3 w-3 text-red-500" />
						Failed
					</Badge>
				);
			case STATUS.CONNECTED:
				return (
					<Badge
						variant="outline"
						className="bg-background border-green-500 gap-1.5 px-3 py-1"
					>
						<CircleCheck className="h-3 w-3 text-green-500" />
						Connected
					</Badge>
				);
			case STATUS.NOT_CONNECTED:
				return (
					<Badge
						variant="outline"
						className="bg-background border-muted-foreground gap-1.5 px-3 py-1"
					>
						<CircleX className="h-3 w-3 text-muted-foreground" />
						Not connected
					</Badge>
				);
			default:
				return null;
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
						Verifying connection...
					</p>
				);
			case STATUS.CONNECTED:
				return (
					<p className="text-sm text-foreground whitespace-nowrap">
						{source.config?.updatedAt
							? `Updated at ${source.config.updatedAt}`
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
					<div className="flex items-center justify-between gap-8">
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-3">
								<p className="text-sm text-muted-foreground w-12">URL</p>
								<p className="text-sm text-foreground">
									{source.config?.url || "—"}
								</p>
							</div>
							<div className="flex items-center gap-3">
								<p className="text-sm text-muted-foreground w-12">Email</p>
								<p className="text-sm text-foreground">
									{source.config?.email || "—"}
								</p>
							</div>
							<div className="flex items-center gap-3">
								<p className="text-sm text-muted-foreground w-12">API</p>
								<p className="text-sm text-foreground">
									{source.config?.token ? "••••••••••••••••••••" : "—"}
								</p>
							</div>
						</div>
						<div className="flex justify-center flex-1">{getStatusBadge()}</div>
						<div className="flex items-center">{getStatusMessage()}</div>
					</div>
				</div>
			</div>
		</div>
	);
}
