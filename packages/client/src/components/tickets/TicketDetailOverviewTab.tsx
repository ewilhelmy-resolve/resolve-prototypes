import { useState } from "react";
import { Info, WandSparkles, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
	AI_RESPONSE_TYPE,
	getAllAIResponseTypes,
	getTicketGroup,
	type AIResponseType,
} from "@/lib/tickets/utils";
import { EnableAutoRespondModal } from "./EnableAutoRespondModal";
import { EnableAutoPopulateSheet } from "./EnableAutoPopulateSheet";
import { CreateKnowledgeArticleSheet } from "./CreateKnowledgeArticleSheet";

interface TicketDetailOverviewTabProps {
	/** Ticket group ID to fetch AI response data */
	ticketGroupId?: string;
	/** Ticket group display name */
	ticketGroupName?: string;
	/** Number of open tickets in this group */
	openTicketsCount?: number;
}

/**
 * TicketDetailOverviewTab - Overview tab content for ticket detail sidebar
 *
 * Displays metrics, validation confidence progress, and AutoPilot recommendations
 */
export function TicketDetailOverviewTab({
	ticketGroupId,
	ticketGroupName = "Ticket Group",
	openTicketsCount = 0,
}: TicketDetailOverviewTabProps) {
	const ticketGroup = ticketGroupId ? getTicketGroup(ticketGroupId) : undefined;
	const aiResponse = ticketGroup?.aiResponse;
	const [enableModalOpen, setEnableModalOpen] = useState(false);
	const [autoPopulateSheetOpen, setAutoPopulateSheetOpen] = useState(false);
	const [selectedType, setSelectedType] = useState<AIResponseType | null>(null);
	const [createKnowledgeSheetOpen, setCreateKnowledgeSheetOpen] = useState(false);

	const handleEnableClick = (type: AIResponseType) => {
		setSelectedType(type);
		if (type === AI_RESPONSE_TYPE.AUTO_POPULATE) {
			setAutoPopulateSheetOpen(true);
		} else {
			setEnableModalOpen(true);
		}
	};

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
					{getAllAIResponseTypes().map((config) => {
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
										coming soon
									</Badge>
								) : (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleEnableClick(config.type)}
									>
										Enable
									</Button>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Knowledge Gap Detected Card */}
			{ticketGroup?.knowledgeStatus === "gap" && (
				<div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
					<div className="flex flex-col gap-3">
						<span className="p-2  bg-yellow-200 w-fit rounded-md">
							<WandSparkles className="h-5 w-5 text-yellow-600" />
						</span>
						<div className="flex flex-col gap-1">
							<h4 className="font-semibold">Knowledge Gap Detected</h4>
							<p className="text-sm">
								No knowledge articles found for this cluster. Rita recommends creating one to enable Auto-Answer.
							</p>
						</div>
						<Button
							variant="outline"
							className="w-full border-yellow-400 bg-yellow-100 hover:bg-yellow-200"
							onClick={() => setCreateKnowledgeSheetOpen(true)}
						>
							Create Knowledge Article
						</Button>
					</div>
				</div>
			)}

			{/* Enable Auto-Respond Modal */}
			{selectedType === AI_RESPONSE_TYPE.AUTO_RESPOND && aiResponse && (
				<EnableAutoRespondModal
					open={enableModalOpen}
					onOpenChange={setEnableModalOpen}
					ticketGroupName={ticketGroupName}
					openTicketsCount={openTicketsCount}
					aiResponse={aiResponse}
				/>
			)}

			{/* Create Knowledge Article Sheet */}
			<CreateKnowledgeArticleSheet
				open={createKnowledgeSheetOpen}
				onOpenChange={setCreateKnowledgeSheetOpen}
				ticketGroupName={ticketGroupName}
			/>

			{/* Enable Auto-Populate Sheet */}
			<EnableAutoPopulateSheet
				open={autoPopulateSheetOpen}
				onOpenChange={setAutoPopulateSheetOpen}
			/>
		</div>
	);
}
