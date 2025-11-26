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
import ReviewAIResponseSheet, { type ReviewTicket } from "./ReviewAIResponseSheet";

interface TicketItem {
	id: string;
	name: string;
	status: string;
	source: string;
	date: string;
	description?: string;
	priority?: "low" | "medium" | "high" | "critical";
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
		id: "INC0000001",
		name: "Password Reset",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
		description: "User unable to access account. Password reset required.",
		priority: "high",
	},
	{
		id: "INC0000002",
		name: "VPN Connection Troubleshooting",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
		description: "VPN client fails to connect. Error code 800.",
		priority: "medium",
	},
	{
		id: "INC0000003",
		name: "Two-factor authentication setup",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
		description: "User needs help configuring 2FA for their account.",
		priority: "low",
	},
	{
		id: "INC0000004",
		name: "Phishing awareness guide",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
		description: "Request for phishing email identification training.",
		priority: "low",
	},
	{
		id: "INC0000005",
		name: "Email Configuration Setup",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
		description: "New employee needs email client configuration assistance.",
		priority: "medium",
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
	const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

	// Review sheet state
	const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
	const [reviewTickets, setReviewTickets] = useState<ReviewTicket[]>([]);
	const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

	// Selection handlers
	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedTickets(tickets.map((t) => t.id));
		} else {
			setSelectedTickets([]);
		}
	};

	const handleSelectTicket = (ticketId: string, checked: boolean) => {
		if (checked) {
			setSelectedTickets([...selectedTickets, ticketId]);
		} else {
			setSelectedTickets(selectedTickets.filter((id) => id !== ticketId));
		}
	};

	// Convert TicketItem to ReviewTicket format
	const convertToReviewTicket = (ticket: TicketItem): ReviewTicket => ({
		id: ticket.id,
		title: ticket.name,
		description: ticket.description || "No description provided.",
		priority: ticket.priority || "medium",
	});

	// Single ticket review
	const reviewAI = (ticketId: string) => {
		const ticket = tickets.find((t) => t.id === ticketId);
		if (ticket) {
			setReviewTickets([convertToReviewTicket(ticket)]);
			setCurrentReviewIndex(0);
			setReviewSheetOpen(true);
		}
	};

	// Bulk review handler
	const handleBulkReviewAI = async () => {
		const ticketsToReview = tickets.filter((t) =>
			selectedTickets.includes(t.id)
		).map(convertToReviewTicket);

		setReviewTickets(ticketsToReview);
		setCurrentReviewIndex(0);
		setReviewSheetOpen(true);
	};

	// Handle approve/reject actions
	const handleApprove = (ticketId: string) => {
		console.log(`Approved AI response for ticket: ${ticketId}`);
		// TODO: Implement API call to approve response
	};

	const handleReject = (ticketId: string) => {
		console.log(`Rejected AI response for ticket: ${ticketId}`);
		// TODO: Implement API call to reject response or open editor
	};

	const handleNavigate = (index: number) => {
		setCurrentReviewIndex(index);
	};

	const handleReviewSheetClose = (open: boolean) => {
		setReviewSheetOpen(open);
		if (!open) {
			// Clear selection after closing review sheet
			setSelectedTickets([]);
		}
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
							label: "Review AI Responses",
							variant: 'default',
							onClick: handleBulkReviewAI,
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

			{/* Review AI Response Sheet */}
			<ReviewAIResponseSheet
				open={reviewSheetOpen}
				onOpenChange={handleReviewSheetClose}
				tickets={reviewTickets}
				currentIndex={currentReviewIndex}
				onNavigate={handleNavigate}
				onApprove={handleApprove}
				onReject={handleReject}
			/>
		</div>
	);
}
