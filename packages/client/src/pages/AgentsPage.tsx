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
import { useTranslation } from "react-i18next";
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
import type { AgentState, AgentTableRow } from "@/types/agent";

type FilterState = "all" | AgentState;
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
	const { t } = useTranslation("agents");
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
	const [stateFilter, setStateFilter] = useState<FilterState>("all");
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [agentToDelete, setAgentToDelete] = useState<AgentTableRow | null>(
		null,
	);
	const [showEducationBanner, setShowEducationBanner] = useState(true);

	// Fetch agents from API with infinite scroll
	const agentsFilters: {
		state?: AgentState;
		search?: string;
	} = {};
	if (stateFilter !== "all") {
		agentsFilters.state = stateFilter;
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
			toast.success(
				t("list.toasts.published", { name: state.publishedAgent.name }),
				{
					description: t("list.toasts.publishedDescription"),
				},
			);
			window.history.replaceState({}, document.title);
		}

		if (state?.unpublishedAgent) {
			toast.info(
				t("list.toasts.unpublished", { name: state.unpublishedAgent.name }),
				{
					description: t("list.toasts.unpublishedDescription"),
				},
			);
			window.history.replaceState({}, document.title);
		}
	}, [location.state, t]);

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
				toast.success(t("list.toasts.deleted", { name: agentToDelete.name }));
				setAgentToDelete(null);
				setDeleteModalOpen(false);
			},
			onError: () => {
				toast.error(t("list.toasts.deleteFailed"));
			},
		});
	};

	return (
		<RitaLayout activePage="automations">
			<div className="flex flex-col gap-6 p-4">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h1 className="text-xl font-serif text-card-foreground">
						{t("list.title")}
					</h1>
					<Button className="gap-2" onClick={() => navigate("/agents/create")}>
						<Plus className="size-4" />
						{t("list.createAgent")}
					</Button>
				</div>

				{/* Education banner */}
				{showEducationBanner && (
					<div className="bg-neutral-50 rounded-lg p-4 relative">
						{/* Close button - top right */}
						<button
							onClick={() => setShowEducationBanner(false)}
							className="absolute top-0 right-0 p-2 rounded-md hover:bg-muted transition-colors"
							aria-label={t("list.banner.dismiss")}
						>
							<X className="size-4" />
						</button>

						<div className="flex gap-6 items-start">
							{/* Left content */}
							<div className="flex-1 flex flex-col gap-2.5 p-5">
								<h2 className="text-4xl font-serif">
									{t("list.banner.heading")}
								</h2>
								<p className="text-base text-foreground leading-relaxed">
									{t("list.banner.description")}
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
										{t("list.banner.howToCreate")}
									</button>
									<button
										onClick={() => {
											/* TODO: link to docs */
										}}
										className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
									>
										<Zap className="size-4" />
										{t("list.banner.addingSkills")}
									</button>
								</div>
							</div>

							{/* Right illustration */}
							<img
								src="/images/agents-banner-illustration.svg"
								alt={t("list.banner.illustrationAlt")}
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
											{t("list.filters.ownerLabel", {
												value: t(`list.filters.${ownerFilter}`),
											})}
											<ChevronDown className="size-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuCheckboxItem
											checked={ownerFilter === "all"}
											onCheckedChange={() => setOwnerFilter("all")}
										>
											{t("list.filters.all")}
										</DropdownMenuCheckboxItem>
										<DropdownMenuCheckboxItem
											checked={ownerFilter === "me"}
											onCheckedChange={() => setOwnerFilter("me")}
										>
											{t("list.filters.me")}
										</DropdownMenuCheckboxItem>
										<DropdownMenuCheckboxItem
											checked={ownerFilter === "others"}
											onCheckedChange={() => setOwnerFilter("others")}
										>
											{t("list.filters.others")}
										</DropdownMenuCheckboxItem>
									</DropdownMenuContent>
								</DropdownMenu>

								{/* State filter */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="secondary" className="gap-2">
											{t("list.filters.stateLabel", {
												value:
													stateFilter === "all"
														? t("list.filters.all")
														: stateFilter === "DRAFT"
															? t("list.filters.draft")
															: stateFilter === "PUBLISHED"
																? t("list.filters.published")
																: stateFilter === "RETIRED"
																	? t("list.filters.retired")
																	: t("list.filters.testing"),
											})}
											<ChevronDown className="size-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuCheckboxItem
											checked={stateFilter === "all"}
											onCheckedChange={() => setStateFilter("all")}
										>
											{t("list.filters.all")}
										</DropdownMenuCheckboxItem>
										<DropdownMenuCheckboxItem
											checked={stateFilter === "PUBLISHED"}
											onCheckedChange={() => setStateFilter("PUBLISHED")}
										>
											{t("list.filters.published")}
										</DropdownMenuCheckboxItem>
										<DropdownMenuCheckboxItem
											checked={stateFilter === "DRAFT"}
											onCheckedChange={() => setStateFilter("DRAFT")}
										>
											{t("list.filters.draft")}
										</DropdownMenuCheckboxItem>
										<DropdownMenuCheckboxItem
											checked={stateFilter === "TESTING"}
											onCheckedChange={() => setStateFilter("TESTING")}
										>
											{t("list.filters.testing")}
										</DropdownMenuCheckboxItem>
										<DropdownMenuCheckboxItem
											checked={stateFilter === "RETIRED"}
											onCheckedChange={() => setStateFilter("RETIRED")}
										>
											{t("list.filters.retired")}
										</DropdownMenuCheckboxItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>

							{/* Search */}
							<Input
								placeholder={t("list.filters.searchPlaceholder")}
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
									: t("list.error")}
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
					agentState={agentToDelete.state}
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
