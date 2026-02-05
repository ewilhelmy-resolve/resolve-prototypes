/**
 * WorkflowCard - Clean card component for scheduled workflow display
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ScheduledWorkflow } from '@/types/scheduler';
import { calculateSuccessRate } from '@/types/scheduler';

interface WorkflowCardProps {
  workflow: ScheduledWorkflow;
}

/**
 * Sparkline - minimal bar chart of recent executions
 */
function Sparkline({ executions }: { executions: ('success' | 'failed')[] }) {
  return (
    <div className="flex items-end gap-px h-4">
      {executions.slice(-15).map((status, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-sm h-full',
            status === 'success' ? 'bg-emerald-500' : 'bg-red-400'
          )}
        />
      ))}
    </div>
  );
}

/**
 * HealthBar - success/failure percentage bar
 */
function HealthBar({ successRate }: { successRate: number }) {
  return (
    <div className="h-1.5 bg-red-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-emerald-500 transition-all"
        style={{ width: `${successRate}%` }}
      />
    </div>
  );
}

/**
 * Format relative time
 */
function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'Never';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const absDiffMins = Math.abs(diffMins);
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);

    if (absDiffMins < 60) return `${absDiffMins}m ago`;
    if (absDiffHours < 24) return `${absDiffHours}h ago`;
    return `${absDiffDays}d ago`;
  } else {
    if (diffMins < 60) return `in ${diffMins}m`;
    if (diffHours < 24) return `in ${diffHours}h`;
    return `in ${diffDays}d`;
  }
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const navigate = useNavigate();
  const successRate = calculateSuccessRate(workflow);

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-sm transition-all hover:border-border/80',
        workflow.status === 'disabled' && 'opacity-50'
      )}
      onClick={() => navigate(`/scheduler/${workflow.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{workflow.name}</h3>
            {workflow.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {workflow.description}
              </p>
            )}
          </div>
          <Badge
            variant="secondary"
            className={cn(
              'text-[10px] font-normal px-1.5 py-0',
              workflow.status === 'enabled'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {workflow.status === 'enabled' ? 'Active' : 'Paused'}
          </Badge>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Next</span>
            <span className="ml-1 font-medium">{formatRelativeTime(workflow.nextRunTime)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Last</span>
            <span className="ml-1 font-medium">{formatRelativeTime(workflow.lastRunTime)}</span>
          </div>
        </div>

        {/* Sparkline + Success Rate */}
        <div className="flex items-center justify-between">
          <Sparkline executions={workflow.recentExecutions} />
          <span className={cn(
            'text-xs font-medium tabular-nums',
            successRate >= 90 ? 'text-emerald-600' :
            successRate >= 70 ? 'text-amber-600' : 'text-red-600'
          )}>
            {successRate}%
          </span>
        </div>

        {/* Health Bar */}
        <HealthBar successRate={successRate} />
      </CardContent>
    </Card>
  );
}
