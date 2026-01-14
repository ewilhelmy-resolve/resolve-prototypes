import { useTranslation } from "react-i18next";
import { Crown, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllAIResponseTypes, type AIResponseType } from "@/lib/tickets/utils";

export interface AutoPilotRecommendationItem {
	type: AIResponseType;
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	color: string;
	comingSoon?: boolean;
}

interface AutoPilotRecommendationsProps {
	/** Optional custom list of recommendations (defaults to all AI response types) */
	items?: AutoPilotRecommendationItem[];
	/** Callback when Enable button is clicked */
	onEnableClick?: (type: AIResponseType) => void;
	/** Optional className for the container */
	className?: string;
	/** Hide header and description */
	hideHeader?: boolean;
}

/**
 * AutoPilotRecommendations - List of automation recommendations
 *
 * Displays available ticket automation options with:
 * - Header with icon and title
 * - Description text
 * - List of automation options with Enable buttons
 * - "Coming soon" badge for future features
 *
 * @component
 */
export function AutoPilotRecommendations({
	items,
	onEnableClick,
	className,
	hideHeader = false,
}: AutoPilotRecommendationsProps) {
	const { t } = useTranslation("tickets");
	const recommendations = items ?? getAllAIResponseTypes();

	return (
		<div className={className}>
			<div className="flex flex-col gap-4">
				{!hideHeader && (
					<>
						<div className="flex items-center gap-2">
							<WandSparkles className="h-4 w-4" />
							<h3>{t("automation.autopilot.title")}</h3>
						</div>
						<p className="text-sm text-muted-foreground">
							{t("automation.autopilot.description")}
						</p>
					</>
				)}

				<div className="flex flex-col gap-2">
					{recommendations.map((config) => {
						const Icon = config.icon;
						return (
							<div
								key={config.type}
								className="flex items-center justify-between rounded-sm border p-2"
							>
								<div className="flex items-center gap-2">
									<Icon className={`h-4 w-4 ${config.color}`} />
									<span>{config.title}</span>
								</div>
								{config.comingSoon ? (
									<Badge variant="outline" className="ml-2">
										<Crown className="mr-1 h-3 w-3 text-yellow-500" />
										{t("automation.autopilot.comingSoon")}
									</Badge>
								) : (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onEnableClick?.(config.type)}
									>
										{t("automation.autopilot.enable")}
									</Button>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
