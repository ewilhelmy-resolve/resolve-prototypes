/**
 * AgentsPage - Landing page for the Agentic Builder feature
 *
 * Displays:
 * - Page header with "Create agent" button
 * - Recent agents cards section
 * - Filterable and sortable agents data table
 */

import { BookOpen, ChevronDown, Loader2, Plus, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AgentsTable } from "@/components/agents/AgentsTable";
import { DeleteAgentModal } from "@/components/agents/DeleteAgentModal";
import { InfiniteScrollContainer } from "@/components/custom/infinite-scroll-container";
import RitaLayout from "@/components/layouts/RitaLayout";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDeleteAgent, useInfiniteAgents } from "@/hooks/api/useAgents";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import type { AgentTableRow } from "@/types/agent";

type FilterStatus = "all" | "published" | "draft";
type FilterOwner = "all" | "me" | "others";

interface PublishedAgentState {
	id: string;
	name: string;
	description: string;
	agentType: "answer" | "knowledge" | "workflow" | null;
	iconId: string;
	iconColorId: string;
	skills?: string[];
}

export default function AgentsPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const { getUserEmail } = useAuth();
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const [ownerFilter, setOwnerFilter] = useState<FilterOwner>("all");
	const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [agentToDelete, setAgentToDelete] = useState<AgentTableRow | null>(
		null,
	);
	const [showEducationBanner, setShowEducationBanner] = useState(true);

	// Fetch agents from API with infinite scroll
	const agentsFilters: Record<string, string> = {};
	if (statusFilter !== "all") {
		agentsFilters.active = statusFilter === "published" ? "true" : "false";
	}
	if (debouncedSearch) {
		agentsFilters.search = debouncedSearch;
	}
	const {
		data: agentsData,
		isLoading,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		error: agentsError,
	} = useInfiniteAgents(
		Object.keys(agentsFilters).length > 0 ? agentsFilters : undefined,
	);
	const deleteAgent = useDeleteAgent();

	const agents = agentsData?.pages.flatMap((p) => p.agents) ?? [];

	// Handle newly published or unpublished agent from navigation state
	useEffect(() => {
		const state = location.state as {
			publishedAgent?: PublishedAgentState;
			unpublishedAgent?: { id: string; name: string };
		} | null;
		if (state?.publishedAgent) {
			toast.success(`${state.publishedAgent.name} published`, {
				description: "Agent is now live and available to users.",
			});
			window.history.replaceState({}, document.title);
		}

		if (state?.unpublishedAgent) {
			toast.info(`${state.unpublishedAgent.name} moved to draft`, {
				description: "Agent is no longer available to users.",
			});
			window.history.replaceState({}, document.title);
		}
	}, [location.state]);

	// TODO: owner filter is client-side — pages may appear empty while hasMore=true.
	// Move to server-side filter when LLM Service supports owner param.
	const currentEmail = getUserEmail();
	const filteredAgents = agents.filter((agent) => {
		// Owner filter (client-side — LLM Service doesn't support owner param)
		if (ownerFilter === "me" && agent.owner !== currentEmail) {
			return false;
		}
		if (ownerFilter === "others" && agent.owner === currentEmail) {
			return false;
		}
		return true;
	});

	const handleAgentClick = (agent: AgentTableRow) => {
		navigate(`/agents/${agent.id}`);
	};

	const handleDeleteClick = (agent: AgentTableRow) => {
		setAgentToDelete(agent);
		setDeleteModalOpen(true);
	};

	const handleConfirmDelete = () => {
		if (!agentToDelete) return;

		deleteAgent.mutate(agentToDelete.id, {
			onSuccess: () => {
				toast.success(`${agentToDelete.name} deleted`);
				setAgentToDelete(null);
				setDeleteModalOpen(false);
			},
			onError: () => {
				toast.error("Failed to delete agent");
			},
		});
	};

	return (
		<RitaLayout activePage="automations">
			<div className="flex flex-col gap-6 p-4">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h1 className="text-xl font-serif text-card-foreground">Agents</h1>
					<Button className="gap-2" onClick={() => navigate("/agents/create")}>
						<Plus className="size-4" />
						Create agent
					</Button>
				</div>

				{/* Education banner */}
				{showEducationBanner && (
					<div className="bg-neutral-50 rounded-lg p-4 relative">
						{/* Close button - top right */}
						<button
							onClick={() => setShowEducationBanner(false)}
							className="absolute top-0 right-0 p-2 rounded-md hover:bg-muted transition-colors"
							aria-label="Dismiss"
						>
							<X className="size-4" />
						</button>

						<div className="flex gap-6 items-start">
							{/* Left content */}
							<div className="flex-1 flex flex-col gap-2.5 p-5">
								<h2 className="text-4xl font-serif">
									Build intelligent agents
								</h2>
								<p className="text-base text-foreground leading-relaxed">
									Create AI-powered agents that answer questions from your
									knowledge base, automate workflows, and help your team be more
									productive. Connect to your existing tools and let agents
									handle repetitive tasks.
								</p>

								{/* Action links */}
								<div className="flex gap-28 mt-2">
									<button
										onClick={() => {
											/* TODO: link to docs */
										}}
										className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
									>
										<BookOpen className="size-4" />
										How to create an agent
									</button>
									<button
										onClick={() => {
											/* TODO: link to docs */
										}}
										className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
									>
										<Zap className="size-4" />
										Adding skills to your agent
									</button>
								</div>
							</div>

							{/* Right illustration */}
							<img
								src="/images/agents-banner-illustration.svg"
								alt="Agent examples"
								className="hidden lg:block w-[350px] h-[204px] rounded-lg flex-shrink-0"
							/>
						</div>
					</div>
				)}

				{/* Main content card */}
				<div className="bg-white border border-neutral-100 rounded-lg p-5 flex flex-col gap-8">
					{/* Filters and table */}
					<div className="flex flex-col gap-2">
						{/* Filter row */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								{/* Owner filter */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="secondary" className="gap-2">
											Owner: {ownerFilter}
											<ChevronDown className="size-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuCheckboxItem
											checked={ownerFilter === "all"}
											onCheckedChange={() => setOwnerFilter("all")}
										>
											All
										</DropdownMenuCheckboxItem>
										<DropdownMenuCheckboxItem
											checked={ownerFilter === "me"}
											onCheckedChange={() => setOwnerFilter("me")}
										>
											Me
										</DropdownMenuCheckboxItem>
										<DropdownMenuCheckboxItem
											checked={ownerFilter === "others"}
											onCheckedChange={() => setOwnerFilter("others")}
										>
											Others
										</DropdownMenuCheckboxItem>
									</DropdownMenuContent>
								</DropdownMenu>

								{/* Status filter */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="secondary" className="gap-2">
											Status: {statusFilter}
											<ChevronDown className="size-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuCheckboxItem
											checked={statusFilter === "all"}
											onCheckedChange={() => setStatusFilter("all")}
										>
											All
										</DropdownMenuCheckboxItem>
										<DropdownMenuCheckboxItem
											checked={statusFilter === "published"}
											onCheckedChange={() => setStatusFilter("published")}
										>
											Published
										</DropdownMenuCheckboxItem>
										<DropdownMenuCheckboxItem
											checked={statusFilter === "draft"}
											onCheckedChange={() => setStatusFilter("draft")}
										>
											Draft
										</DropdownMenuCheckboxItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>

							{/* Search */}
							<Input
								placeholder="Search agents..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="max-w-[384px]"
							/>
						</div>

						{/* Agents table */}
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="size-6 animate-spin text-muted-foreground" />
							</div>
						) : agentsError ? (
							<div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
								{agentsError instanceof Error
									? agentsError.message
									: "Failed to load agents. Please try again."}
							</div>
						) : (
							<InfiniteScrollContainer
								hasMore={hasNextPage ?? false}
								isLoading={isFetchingNextPage}
								onLoadMore={() => fetchNextPage()}
							>
								<AgentsTable
									agents={filteredAgents}
									onAgentClick={handleAgentClick}
									onEdit={(agent) => navigate(`/agents/${agent.id}`)}
									onDelete={handleDeleteClick}
								/>
							</InfiniteScrollContainer>
						)}
					</div>
				</div>
			</div>

			{agentToDelete && (
				<DeleteAgentModal
					open={deleteModalOpen}
					onOpenChange={setDeleteModalOpen}
					agentName={agentToDelete.name}
					agentStatus={agentToDelete.status}
					impact={{
						skills: agentToDelete.skills?.length ?? 0,
						conversationStarters: 0, // TODO: populate from API when available
						usersThisWeek: 0, // TODO: populate from usage analytics API
						linkedWorkflows: [], // TODO: populate from workflow associations API
					}}
					onConfirmDelete={handleConfirmDelete}
				/>
			)}
		</RitaLayout>
	);
}
