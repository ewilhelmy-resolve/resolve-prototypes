/**
 * AgentsTable - Data table for displaying agents list
 *
 * Features:
 * - Sortable columns (status, updated by, owner, last updated)
 * - Avatar display for updated by / owner
 * - Status badges
 * - Action menu
 */

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentStatus } from "./AgentCard";

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  skills?: string[];
  updatedBy: {
    initials: string;
    color: string;
  } | null;
  owner: {
    initials: string;
    color: string;
  } | null;
  lastUpdated: string;
}

interface AgentsTableProps {
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
}

type SortField = "status" | "updatedBy" | "lastUpdated";
type SortDirection = "asc" | "desc";

const avatarColors: Record<string, string> = {
  teal: "bg-teal-200",
  purple: "bg-purple-100",
  sky: "bg-sky-200",
  indigo: "bg-indigo-100",
  emerald: "bg-emerald-100",
};

export function AgentsTable({
  agents,
  onAgentClick,
  onEdit,
  onDelete,
}: AgentsTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedAgents = [...agents].sort((a, b) => {
    if (!sortField) return 0;

    let comparison = 0;
    switch (sortField) {
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "updatedBy":
        comparison = (a.updatedBy?.initials || "").localeCompare(
          b.updatedBy?.initials || ""
        );
        break;
      case "lastUpdated":
        comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const SortableHeader = ({
    field,
    children,
    align = "left",
  }: {
    field: SortField;
    children: React.ReactNode;
    align?: "left" | "center" | "right";
  }) => (
    <Button
      variant="ghost"
      className={cn(
        "h-9 px-4 gap-2 font-normal text-muted-foreground hover:text-foreground",
        align === "right" && "ml-auto",
        align === "center" && "mx-auto"
      )}
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="size-4" />
    </Button>
  );

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[250px] pl-4">Name</TableHead>
            <TableHead className="w-[200px]">Skills</TableHead>
            <TableHead className="w-[127px]">
              <SortableHeader field="status">Status</SortableHeader>
            </TableHead>
            <TableHead className="w-[136px]">
              <SortableHeader field="updatedBy" align="center">
                Updated by
              </SortableHeader>
            </TableHead>
            <TableHead className="w-[162px]">
              <SortableHeader field="lastUpdated" align="right">
                Last updated
              </SortableHeader>
            </TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAgents.map((agent) => (
            <TableRow
              key={agent.id}
              className="h-[84px] cursor-pointer"
              onClick={() => onAgentClick?.(agent)}
            >
              <TableCell className="pl-4">
                <div className="flex flex-col">
                  <span className="text-primary font-medium truncate">
                    {agent.name}
                  </span>
                  <span className="text-muted-foreground text-sm truncate">
                    {agent.description}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {agent.skills && agent.skills.length > 0 ? (
                  <div className="flex items-center gap-1 max-w-[180px]">
                    <span className="text-sm text-muted-foreground truncate">
                      {agent.skills.slice(0, 2).join(", ")}
                    </span>
                    {agent.skills.length > 2 && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        +{agent.skills.length - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">--</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={agent.status === "published" ? "default" : "outline"}
                >
                  {agent.status === "published" ? "Published" : "Draft"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-center">
                  {agent.updatedBy ? (
                    <Avatar className="size-10">
                      <AvatarFallback
                        className={cn(
                          avatarColors[agent.updatedBy.color] || "bg-muted"
                        )}
                      >
                        {agent.updatedBy.initials}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right text-sm">
                {agent.lastUpdated}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="Agent actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(agent)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete?.(agent)}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
