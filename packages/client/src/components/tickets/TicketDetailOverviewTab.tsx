import { Info, WandSparkles, Sparkles, Zap, Network, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const recommendations = [
	{ title: "Auto-Respond", icon: Sparkles, enabled: false, color: "text-purple-500" },
	{ title: "Auto-Populate", icon: Zap, enabled: false, color: "text-green-500" },
	{ title: "Auto-Resolve", icon: Network, comingSoon: true, color: "text-blue-500" },
];

/**
 * TicketDetailOverviewTab - Overview tab content for ticket detail sidebar
 *
 * Displays metrics, validation confidence progress, and AutoPilot recommendations
 */
export function TicketDetailOverviewTab() {
	return (
		<div className="flex flex-col gap-4">
			{/* Metrics */}
			<div className="rounded-lg border p-3">
				<div className="grid grid-cols-3 gap-8 text-center">
					<div>
						<div className="text-2xl font-medium">0</div>
						<div className="text-xs text-muted-foreground">Automated</div>
					</div>
					<div>
						<div className="text-2xl font-medium">0</div>
						<div className="text-xs text-muted-foreground">Mins Saved</div>
					</div>
					<div>
						<div className="text-2xl font-medium">$0</div>
						<div className="text-xs text-muted-foreground">Savings</div>
					</div>
				</div>
			</div>

			{/* Validation Confidence */}
			<div className="rounded-lg border bg-background p-3">
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<h3 className="font-semibold">Validation Confidence</h3>
						<Info className="h-4 w-4" />
					</div>
					<p className="text-sm text-muted-foreground">
						Just getting started! Start validating towards automating
					</p>
					<Progress value={0} className="mt-2" />
					<p className="mt-2 text-sm">Validated 0/16</p>
				</div>
			</div>

			{/* AutoPilot Recommendations */}
			<div className="flex flex-col gap-4">
				<div className="flex items-center gap-2">
					<WandSparkles className="h-4 w-4" />
					<h3>AutoPilot Recommendations</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					Automate stages of a ticket resolution
				</p>

				<div className="flex flex-col gap-2">
					{recommendations.map((rec, index) => (
						<div
							key={index}
							className="flex items-center justify-between rounded-sm border p-2"
						>
							<div className="flex items-center gap-2">
								<rec.icon className={`h-4 w-4 ${rec.color}`} />
								<span>{rec.title}</span>
							</div>
							{rec.comingSoon ? (
								<Badge variant="outline" className="ml-2">
									<Crown className="mr-1 h-3 w-3 text-yellow-500" />
									coming soon
								</Badge>
							) : (
								<Button variant="ghost" size="sm">
									Enable
								</Button>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
