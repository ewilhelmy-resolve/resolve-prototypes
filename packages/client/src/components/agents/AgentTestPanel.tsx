/**
 * AgentTestPanel - Preview panel for agent configuration
 *
 * Shows agent preview with starters. Full testing happens on AgentTestPage.
 */

import { ExternalLink, MessageSquare, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentTestPanelConfig } from "@/types/agent";

interface AgentTestPanelProps {
	config: AgentTestPanelConfig;
	onClose: () => void;
	onTest?: () => void;
	iconComponent: React.ReactNode;
	className?: string;
}

export function AgentTestPanel({
	config,
	onClose,
	onTest,
	iconComponent,
	className,
}: AgentTestPanelProps) {
	const { t } = useTranslation("agents");
	const starters = config.conversationStarters
		.filter((s) => s.trim())
		.slice(0, 4);

	// Check if agent is ready to test
	const isReady = !!(
		config.name &&
		(config.instructions ||
			config.tools.length > 0 ||
			config.knowledgeSources.length > 0)
	);
	const hasStarters = starters.length > 0;

	return (
		<div
			className={cn(
				"flex flex-col bg-gradient-to-b from-slate-50 to-white rounded-xl border border-border shadow-sm",
				className,
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b bg-white/80 backdrop-blur-sm rounded-t-xl">
				<h2 className="text-sm font-medium">{t("testPanel.preview")}</h2>
				<div className="flex items-center gap-0.5">
					{isReady && onTest && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 text-xs gap-1.5"
							onClick={onTest}
						>
							<ExternalLink className="size-3" aria-hidden="true" />
							{t("testPanel.test")}
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon"
						className="size-7"
						onClick={onClose}
						aria-label={t("testPanel.close")}
					>
						<X className="size-4" aria-hidden="true" />
					</Button>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4">
				{!isReady ? (
					/* Not ready - show chat mockup placeholder */
					<div className="h-full flex flex-col">
						{/* Mock chat header */}
						<div className="flex items-center gap-3 pb-4 border-b border-dashed border-muted-foreground/20">
							<div className="size-10 rounded-lg bg-muted/50 flex items-center justify-center">
								<MessageSquare className="size-5 text-muted-foreground/30" />
							</div>
							<div className="flex-1">
								<div className="h-4 w-24 bg-muted/50 rounded" />
								<div className="h-3 w-32 bg-muted/30 rounded mt-1.5" />
							</div>
						</div>

						{/* Mock empty state */}
						<div className="flex-1 flex flex-col items-center justify-center text-center px-6">
							<p className="text-sm text-muted-foreground/60">
								{t("testPanel.configure")}
							</p>
							<p className="text-xs text-muted-foreground/40 mt-1">
								{t("testPanel.configureHint")}
							</p>
						</div>

						{/* Mock input */}
						<div className="pt-4 border-t border-dashed border-muted-foreground/20">
							<div className="h-10 bg-muted/30 rounded-lg" />
						</div>
					</div>
				) : (
					/* Ready - show real preview */
					<div className="flex flex-col h-full">
						{/* Agent header */}
						<div className="flex items-center gap-3 pb-4 mb-4 border-b">
							{iconComponent}
							<div className="flex-1 min-w-0">
								<h3 className="font-medium truncate">{config.name}</h3>
								<p className="text-xs text-muted-foreground line-clamp-1">
									{config.description || t("testPanel.noDescription")}
								</p>
							</div>
						</div>

						{/* Starters */}
						{hasStarters ? (
							<div className="space-y-2 flex-1">
								<p className="text-xs text-muted-foreground">
									{t("testPanel.conversationStarters")}
								</p>
								{starters.map((starter, i) => (
									<div
										key={i}
										className="w-full text-left px-3 py-2.5 text-sm rounded-xl border border-border bg-white"
									>
										{starter}
									</div>
								))}
							</div>
						) : (
							<div className="flex-1 flex flex-col items-center justify-center text-center">
								<p className="text-sm text-muted-foreground">
									{t("testPanel.readyToTest")}
								</p>
								<p className="text-xs text-muted-foreground/60 mt-1">
									{t("testPanel.readyToTestHint")}
								</p>
							</div>
						)}

						{/* Skills/Sources summary */}
						{(config.tools.length > 0 ||
							config.knowledgeSources.length > 0) && (
							<div className="pt-4 mt-4 border-t space-y-2">
								{config.tools.length > 0 && (
									<div className="text-xs text-muted-foreground">
										{t("testPanel.skillConfigured", {
											count: config.tools.length,
										})}
									</div>
								)}
								{config.knowledgeSources.length > 0 && (
									<div className="text-xs text-muted-foreground">
										{t("testPanel.knowledgeSource", {
											count: config.knowledgeSources.length,
										})}
									</div>
								)}
							</div>
						)}

						{/* Test button at bottom when ready */}
						{onTest && (
							<div className="pt-4 mt-auto">
								<Button
									onClick={onTest}
									className="w-full gap-2"
									variant="default"
								>
									<ExternalLink className="size-4" />
									{t("testPanel.openTestExperience")}
								</Button>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
