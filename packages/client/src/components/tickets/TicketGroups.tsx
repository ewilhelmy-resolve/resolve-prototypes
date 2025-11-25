import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { TicketGroupStat } from "./TicketGroupStat"

interface TicketGroup {
  id: string
  title: string
  count: number
  manualPercentage: number
  automatedPercentage: number
  knowledgeStatus: "found" | "gap"
}

interface TicketGroupsProps {
  totalCount?: number
  period?: string
}

const ticketGroups: TicketGroup[] = [
  {
    id: "email-signatures",
    title: "Email Signatures",
    count: 976,
    manualPercentage: 37,
    automatedPercentage: 0,
    knowledgeStatus: "found"
  },
  {
    id: "password-resets",
    title: "Password Resets",
    count: 743,
    manualPercentage: 21,
    automatedPercentage: 0,
    knowledgeStatus: "found"
  },
  {
    id: "network-connectivity",
    title: "Network Connectivity",
    count: 564,
    manualPercentage: 7,
    automatedPercentage: 5,
    knowledgeStatus: "found"
  },
  {
    id: "application-crashes",
    title: "Application Crashes",
    count: 121,
    manualPercentage: 27,
    automatedPercentage: 0,
    knowledgeStatus: "found"
  },
  {
    id: "vpn-issues",
    title: "VPN Issues",
    count: 45,
    manualPercentage: 39,
    automatedPercentage: 0,
    knowledgeStatus: "found"
  },
  {
    id: "system-overload",
    title: "System Overload",
    count: 32,
    manualPercentage: 17,
    automatedPercentage: 0,
    knowledgeStatus: "gap"
  },
  {
    id: "signature-preferences",
    title: "Signature Preferences",
    count: 21,
    manualPercentage: 57,
    automatedPercentage: 0,
    knowledgeStatus: "gap"
  },
  {
    id: "performance-optimization",
    title: "Performance Optimization",
    count: 11,
    manualPercentage: 12,
    automatedPercentage: 0,
    knowledgeStatus: "gap"
  },
  {
    id: "connection-troubleshooting",
    title: "Connection Troubleshooting",
    count: 4,
    manualPercentage: 57,
    automatedPercentage: 0,
    knowledgeStatus: "found"
  }
]

export default function TicketGroups({ totalCount = 12, period = "Last 90 days" }: TicketGroupsProps) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center">
      <div className="flex w-full items-start justify-center py-6">
        <div className="flex w-full flex-col gap-6 px-6">
          <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold text-card-foreground">Ticket Groups</h1>
                <Badge variant="outline">{totalCount}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Based on the last 90 days</p>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {period}
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Last 30 days</DropdownMenuItem>
                  <DropdownMenuItem>Last 90 days</DropdownMenuItem>
                  <DropdownMenuItem>Last 6 months</DropdownMenuItem>
                  <DropdownMenuItem>Last year</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Filter by
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>All</DropdownMenuItem>
                  <DropdownMenuItem>Knowledge found</DropdownMenuItem>
                  <DropdownMenuItem>Knowledge gap</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {ticketGroups.map((group) => (
              <TicketGroupStat
                key={group.id}
                id={group.id}
                title={group.title}
                count={group.count}
                manualPercentage={group.manualPercentage}
                automatedPercentage={group.automatedPercentage}
                knowledgeStatus={group.knowledgeStatus}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
