/**
 * AgentsPage - Landing page for the Agentic Builder feature
 *
 * Displays:
 * - Page header with "Create agent" button
 * - Recent agents cards section
 * - Filterable and sortable agents data table
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import RitaLayout from "@/components/layouts/RitaLayout";
import { AgentsTable, type Agent } from "@/components/agents/AgentsTable";
import { CreateAgentDialog } from "@/components/agents/CreateAgentDialog";
import { AgentTemplateModal, type AgentTemplate } from "@/components/agents/AgentTemplateModal";
import { DeleteAgentModal } from "@/components/agents/DeleteAgentModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  ChevronDown,
  FileText,
  Sparkles,
  BookOpen,
  Zap,
  X,
} from "lucide-react";


// Mock data for agents table
const mockAgents: Agent[] = [
  {
    id: "1",
    name: "HelpDesk Advisor",
    description: "Answers IT support questions",
    status: "published",
    skills: ["Reset password", "Unlock account", "Request system access"],
    updatedBy: { initials: "CN", color: "teal" },
    owner: { initials: "CN", color: "teal" },
    lastUpdated: "16 Dec, 2025 11:44",
  },
  {
    id: "2",
    name: "Onboarding Compliance Checker",
    description: "Answers from compliance docs",
    status: "published",
    skills: ["Verify I-9 forms", "Check background status", "Review tax docs"],
    updatedBy: { initials: "KL", color: "purple" },
    owner: { initials: "KL", color: "purple" },
    lastUpdated: "06 Dec, 2025 12:03",
  },
  {
    id: "3",
    name: "Password Reset Bot",
    description: "Automates password resets",
    status: "draft",
    skills: ["Password Reset"],
    updatedBy: { initials: "AJ", color: "sky" },
    owner: null,
    lastUpdated: "03 Dec, 2025 13:27",
  },
  {
    id: "4",
    name: "PTO Balance Checker",
    description: "Checks employee time off balances",
    status: "published",
    skills: ["Check PTO balance", "Request time off"],
    updatedBy: { initials: "JS", color: "indigo" },
    owner: { initials: "JS", color: "indigo" },
    lastUpdated: "23 Nov, 2025 12:07",
  },
  {
    id: "5",
    name: "Employee Directory Bot",
    description: "Looks up employee information",
    status: "published",
    skills: ["Lookup employee", "Find department", "Get contact info"],
    updatedBy: { initials: "MM", color: "emerald" },
    owner: { initials: "MM", color: "emerald" },
    lastUpdated: "03 Nov, 2025 18:07",
  },
];

type FilterStatus = "all" | "published" | "draft";
type FilterOwner = "all" | "me" | "others";

interface PublishedAgentState {
  id: string;
  name: string;
  description: string;
  agentType: "answer" | "knowledge" | "workflow" | null;
  iconId: string;
  iconColorId: string;
}


export default function AgentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<FilterOwner>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [showEducationBanner, setShowEducationBanner] = useState(true);

  // Dynamic agents list (includes newly published agents)
  const [agents, setAgents] = useState<Agent[]>(mockAgents);

  // Handle newly published agent from navigation state
  useEffect(() => {
    const state = location.state as { publishedAgent?: PublishedAgentState } | null;
    if (state?.publishedAgent) {
      const published = state.publishedAgent;

      // Add to agents table (or update if exists)
      setAgents((prev) => {
        const exists = prev.find((a) => a.id === published.id);
        if (exists) {
          // Update existing agent
          return prev.map((a) =>
            a.id === published.id
              ? { ...a, name: published.name, description: published.description, status: "published" as const }
              : a
          );
        }
        // Add new agent at the top
        const newAgent: Agent = {
          id: published.id,
          name: published.name,
          description: published.description,
          status: "published",
          updatedBy: { initials: "You", color: "blue" },
          owner: { initials: "You", color: "blue" },
          lastUpdated: new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        return [newAgent, ...prev];
      });

      // Clear the state to prevent re-adding on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Filter agents based on search and filters
  const filteredAgents = agents.filter((agent) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !agent.name.toLowerCase().includes(query) &&
        !agent.description.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== "all" && agent.status !== statusFilter) {
      return false;
    }

    return true;
  });

  const handleCreateAgent = (name: string) => {
    // Navigate to agent builder with the new agent name
    navigate("/agents/create", { state: { agentName: name } });
    setCreateDialogOpen(false);
  };

  const handleSelectTemplate = (template: AgentTemplate) => {
    // Navigate to agent builder with template data pre-populated
    navigate("/agents/create", {
      state: {
        agentName: template.name,
        template: template,
      }
    });
  };

  const handleAgentClick = (agent: Agent) => {
    // Navigate to chat (view) page for published, builder for draft
    if (agent.status === "published") {
      navigate(`/agents/${agent.id}/chat`);
    } else {
      navigate(`/agents/${agent.id}`);
    }
  };

  const handleDeleteClick = (agent: Agent) => {
    setAgentToDelete(agent);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!agentToDelete) return;

    // Remove from agents list
    setAgents((prev) => prev.filter((a) => a.id !== agentToDelete.id));

    // Reset state
    setAgentToDelete(null);
    setDeleteModalOpen(false);
  };

  return (
    <RitaLayout activePage="automations">
      <div className="flex flex-col gap-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-serif text-card-foreground">Agents</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                Create agent
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <FileText className="size-4" />
                <div>
                  <div className="font-medium">From scratch</div>
                  <div className="text-xs text-muted-foreground">Start with a blank agent</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTemplateModalOpen(true)} className="gap-2">
                <Sparkles className="size-4" />
                <div>
                  <div className="font-medium">From template</div>
                  <div className="text-xs text-muted-foreground">Use a pre-built template</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  Create AI-powered agents that answer questions from your knowledge base,
                  automate workflows, and help your team be more productive. Connect to your
                  existing tools and let agents handle repetitive tasks.
                </p>

                {/* Action links */}
                <div className="flex gap-28 mt-2">
                  <button
                    onClick={() => {/* TODO: link to docs */}}
                    className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    <BookOpen className="size-4" />
                    How to create an agent
                  </button>
                  <button
                    onClick={() => {/* TODO: link to docs */}}
                    className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    <Zap className="size-4" />
                    Adding skills to your agent
                  </button>
                </div>
              </div>

              {/* Right illustration */}
              <img
                src="/src/assets/images/agents-banner-illustration.svg"
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
            <AgentsTable
              agents={filteredAgents}
              onAgentClick={handleAgentClick}
              onEdit={(agent) => navigate(`/agents/${agent.id}`)}
              onDelete={handleDeleteClick}
            />
          </div>
        </div>
      </div>

      <CreateAgentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateAgent={handleCreateAgent}
      />

      <AgentTemplateModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        onSelectTemplate={handleSelectTemplate}
      />

      {agentToDelete && (
        <DeleteAgentModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          agentName={agentToDelete.name}
          agentStatus={agentToDelete.status}
          impact={{
            skills: agentToDelete.skills?.length || 0,
            conversationStarters: 3, // Mock data
            usersThisWeek: agentToDelete.status === "published" ? 24 : 0,
            linkedWorkflows: agentToDelete.status === "published" ? ["Password Reset"] : [],
          }}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </RitaLayout>
  );
}
