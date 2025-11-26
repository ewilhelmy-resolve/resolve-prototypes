import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TicketDetailOverviewTab } from "./TicketDetailOverviewTab";
import KnowledgeTab from "./KnowledgeTab";

interface TicketDetailSidebarProps {
	/** Number of knowledge articles (fetched from API) */
	knowledgeCount?: number;
}

/**
 * TicketDetailSidebar - Right sidebar for ticket detail page with tabbed content
 *
 * Displays Overview and Knowledge tabs with switchable content
 *
 * @param knowledgeCount - Number of knowledge articles to display in tab label (defaults to 0)
 *
 * @example
 * ```tsx
 * // With API data
 * <TicketDetailSidebar knowledgeCount={knowledgeArticles.length} />
 *
 * // Without API (shows 0)
 * <TicketDetailSidebar />
 * ```
 */
export function TicketDetailSidebar({ knowledgeCount = 0 }: TicketDetailSidebarProps) {
	const [activeTab, setActiveTab] = useState("overview");

	return (
		<div className="w-full border-t p-4 lg:w-80 lg:border-l lg:border-t-0">
			<div className="flex flex-col gap-4">
				{/* Tabs */}
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList className="w-full">
						<TabsTrigger value="overview" className="flex-1">
							Overview
						</TabsTrigger>
						<TabsTrigger value="knowledge" className="flex-1">
							Knowledge ({knowledgeCount})
						</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="mt-4">
						<TicketDetailOverviewTab />
					</TabsContent>

					<TabsContent value="knowledge" className="mt-4">
						<KnowledgeTab />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
