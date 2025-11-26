import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ArrowUpDown, MoreHorizontal } from "lucide-react";
import { BulkActions } from "@/components/BulkActions";

interface TicketItem {
	id: number;
	name: string;
	status: string;
	source: string;
	date: string;
}

interface TicketDetailTableProps {
	/** Array of ticket items to display */
	tickets?: TicketItem[];
	/** Number of knowledge articles (for footer display) */
	knowledgeArticleCount?: number;
}

// Map source names to icon paths
const getSourceIcon = (source: string): string => {
	const sourceMap: Record<string, string> = {
		ServiceNow: "/connections/icon_servicenow.svg",
		Confluence: "/connections/icon_confluence.svg",
		SharePoint: "/connections/icon_sharepoint.svg",
	};
	return sourceMap[source] || "/connections/icon_servicenow.svg";
};

const defaultTickets: TicketItem[] = [
	{
		id: 1,
		name: "Password Reset",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
	},
	{
		id: 2,
		name: "VPN Connection Troubleshooting",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
	},
	{
		id: 3,
		name: "Two-factor authentication setup",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
	},
	{
		id: 4,
		name: "Phishing awareness guide",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
	},
	{
		id: 5,
		name: "Email Configuration Setup",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
	},
];

/**
 * TicketDetailTable - Table displaying tickets with filters and pagination
 *
 * Shows a filterable, searchable table of tickets with status tabs,
 * source filtering, and pagination controls
 *
 * @param tickets - Array of ticket items (defaults to sample data)
 * @param knowledgeArticleCount - Number of knowledge articles for footer (defaults to 12)
 *
 * @example
 * ```tsx
 * // With custom data
 * <TicketDetailTable tickets={ticketData} knowledgeArticleCount={15} />
 *
 * // With defaults
 * <TicketDetailTable />
 * ```
 */
export function TicketDetailTable({
	tickets = defaultTickets,
	knowledgeArticleCount = 12,
}: TicketDetailTableProps) {
	// Bulk selection state
	const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);

	// Selection handlers
	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedTickets(tickets.map((t) => t.id));
		} else {
			setSelectedTickets([]);
		}
	};

	const handleSelectTicket = (ticketId: number, checked: boolean) => {
		if (checked) {
			setSelectedTickets([...selectedTickets, ticketId]);
		} else {
			setSelectedTickets(selectedTickets.filter((id) => id !== ticketId));
		}
	};

	// Single ticket review
	const reviewAI = (ticketId: number) => {
		console.log(`Review AI response for ticket ID: ${ticketId}`);
	};

	// Bulk review handler with simulated delay
	const handleBulkReviewAI = async () => {
		setIsProcessing(true);

		// Process each selected ticket with delay
		for (const ticketId of selectedTickets) {
			console.log(`Processing Review AI response for ticket ID: ${ticketId}`);
			// Simulate API call delay
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		setIsProcessing(false);
		setSelectedTickets([]);
		console.log(`Completed bulk review for ${selectedTickets.length} tickets`);
	};

	return (
		<div className="flex flex-col gap-3">
			{/* Filters or Bulk Actions */}
			{selectedTickets.length === 0 ? (
				<div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
				<Tabs defaultValue="needs-response" className="w-fit">
					<TabsList>
						<TabsTrigger value="needs-response">
							Needs Response
						</TabsTrigger>
						<TabsTrigger value="completed">Completed</TabsTrigger>
					</TabsList>
				</Tabs>

				<div className="flex gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="secondary">
								Source: All
								<ChevronDown className="ml-2 h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem>All Sources</DropdownMenuItem>
							<DropdownMenuItem>ServiceNow</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<Input placeholder="Search tickets....." className="w-40" />
				</div>
			</div>
			) : (
				<BulkActions
					selectedItems={selectedTickets.map(String)}
					actions={[
						{
							key: 'review',
							label: isProcessing ? "Processing..." : "Review AI Responses",
							variant: 'default',
							onClick: handleBulkReviewAI,
							disabled: isProcessing,
						},
					]}
					onClose={() => setSelectedTickets([])}
					itemLabel="tickets"
				/>
			)}

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-8">
								<Checkbox
									checked={selectedTickets.length === tickets.length}
									onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
								/>
							</TableHead>
							<TableHead>Name</TableHead>
							<TableHead>
								<Button variant="ghost" className="h-auto p-0">
									Status
									<ArrowUpDown className="ml-2 h-4 w-4" />
								</Button>
							</TableHead>
							<TableHead>
								<Button variant="ghost" className="h-auto p-0">
									Source
									<ArrowUpDown className="ml-2 h-4 w-4" />
								</Button>
							</TableHead>
							<TableHead className="text-right">
								Created Modified
							</TableHead>
							<TableHead className="w-16" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{tickets.map((row) => (
							<TableRow key={row.id}>
								<TableCell>
									<Checkbox
										checked={selectedTickets.includes(row.id)}
										onCheckedChange={(checked) => handleSelectTicket(row.id, checked as boolean)}
									/>
								</TableCell>
								<TableCell className="font-medium text-primary">
									{row.name}
								</TableCell>
								<TableCell>
									<Badge variant="outline">{row.status}</Badge>
								</TableCell>
								<TableCell className="text-center">
									<div className="flex justify-center">
										<img
											src={getSourceIcon(row.source)}
											alt={row.source}
											className="h-4 w-4"
										/>
									</div>
								</TableCell>
								<TableCell className="text-right text-sm">
									{row.date}
								</TableCell>
								<TableCell>
								<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreHorizontal />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => reviewAI(row.id)}> 
													Review AI response
												</DropdownMenuItem>
										</DropdownMenuContent>
										</DropdownMenu>		
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Table Footer */}
			<div className="flex items-center justify-between py-4">
				<p className="text-sm text-muted-foreground">
					{knowledgeArticleCount} Knowledge articles
				</p>
				<div className="flex gap-2">
					<Button variant="outline" disabled>
						Previous
					</Button>
					<Button variant="outline" disabled>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
