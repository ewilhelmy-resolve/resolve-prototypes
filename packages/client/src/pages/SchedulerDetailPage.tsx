/**
 * SchedulerDetailPage - Workflow execution detail view
 *
 * Shows detailed execution history, failure breakdown, and links to logs
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import RitaLayout from '@/components/layouts/RitaLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getMockWorkflowDetail } from '@/data/mock-scheduler';
import { calculateSuccessRate, FAILURE_CATEGORY_LABELS } from '@/types/scheduler';
import type { FailureCategory, WorkflowExecution } from '@/types/scheduler';

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format duration in human-readable form
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Failure breakdown chart component
 */
function FailureBreakdownChart({ breakdown }: { breakdown: Record<FailureCategory, number> }) {
  const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
  if (total === 0) return null;

  const categories = (Object.entries(breakdown) as [FailureCategory, number][])
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const colors: Record<FailureCategory, string> = {
    timeout: 'bg-orange-500',
    auth_permission: 'bg-red-500',
    rate_limit: 'bg-amber-500',
    validation: 'bg-purple-500',
    downstream_5xx: 'bg-rose-500',
    unknown: 'bg-slate-500',
  };

  return (
    <div className="space-y-3">
      {categories.map(([category, count]) => {
        const percentage = Math.round((count / total) * 100);
        return (
          <div key={category} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{FAILURE_CATEGORY_LABELS[category]}</span>
              <span className="text-muted-foreground">{count} ({percentage}%)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', colors[category])}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Execution history table row
 */
function ExecutionRow({ execution }: { execution: WorkflowExecution }) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {formatTimestamp(execution.timestamp)}
      </TableCell>
      <TableCell>
        <Badge
          variant={execution.status === 'success' ? 'outline' : 'destructive'}
          className={cn(
            'gap-1',
            execution.status === 'success' && 'text-emerald-700 border-emerald-200 bg-emerald-50'
          )}
        >
          {execution.status === 'success' ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <XCircle className="size-3" />
          )}
          {execution.status === 'success' ? 'Success' : 'Failed'}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDuration(execution.durationMs)}
      </TableCell>
      <TableCell>
        {execution.failureCategory ? (
          <Badge variant="secondary" className="text-xs">
            {FAILURE_CATEGORY_LABELS[execution.failureCategory]}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {execution.logsUrl ? (
          <Button variant="ghost" size="sm" className="gap-1 h-7" asChild>
            <a href={execution.logsUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3" />
              View Logs
            </a>
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function SchedulerDetailPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();

  const workflowDetail = useMemo(() => {
    if (!workflowId) return null;
    return getMockWorkflowDetail(workflowId);
  }, [workflowId]);

  if (!workflowDetail) {
    return (
      <RitaLayout activePage="scheduler">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <AlertTriangle className="size-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">Workflow not found</h2>
          <p className="text-muted-foreground mb-4">
            The workflow you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate('/scheduler')}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </RitaLayout>
    );
  }

  const successRate = calculateSuccessRate(workflowDetail);

  return (
    <RitaLayout activePage="scheduler">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 mb-4 -ml-2"
            onClick={() => navigate('/scheduler')}
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-heading">{workflowDetail.name}</h1>
                <Badge
                  variant={workflowDetail.status === 'enabled' ? 'default' : 'secondary'}
                  className={cn(
                    workflowDetail.status === 'enabled' && 'bg-emerald-100 text-emerald-700'
                  )}
                >
                  {workflowDetail.status === 'enabled' ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              {workflowDetail.description && (
                <p className="text-muted-foreground">{workflowDetail.description}</p>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Next Run</p>
                  <p className="font-medium">{formatTimestamp(workflowDetail.nextRunTime)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Run</p>
                  <p className="font-medium">
                    {workflowDetail.lastRunTime
                      ? formatTimestamp(workflowDetail.lastRunTime)
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Activity className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{workflowDetail.totalRuns.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Executions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{workflowDetail.successCount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Successful</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <XCircle className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{workflowDetail.failureCount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  successRate >= 90 ? 'bg-emerald-100' : successRate >= 70 ? 'bg-amber-100' : 'bg-red-100'
                )}>
                  <TrendingUp className={cn(
                    'size-5',
                    successRate >= 90 ? 'text-emerald-600' : successRate >= 70 ? 'text-amber-600' : 'text-red-600'
                  )} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{successRate}%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Failure Breakdown */}
        {workflowDetail.failureCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                Failure Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FailureBreakdownChart breakdown={workflowDetail.failureBreakdown} />
            </CardContent>
          </Card>
        )}

        {/* Execution History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Failure Reason</TableHead>
                  <TableHead>Logs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflowDetail.executions.slice(0, 50).map(execution => (
                  <ExecutionRow key={execution.id} execution={execution} />
                ))}
              </TableBody>
            </Table>
            {workflowDetail.executions.length > 50 && (
              <div className="p-4 text-center border-t">
                <p className="text-sm text-muted-foreground">
                  Showing 50 of {workflowDetail.executions.length} executions
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RitaLayout>
  );
}
