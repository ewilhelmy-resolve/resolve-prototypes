/**
 * Scheduler Dashboard Types
 * Types for scheduled workflow monitoring
 */

export type WorkflowStatus = 'enabled' | 'disabled';

export type ExecutionStatus = 'success' | 'failed';

export type FailureCategory =
  | 'timeout'
  | 'auth_permission'
  | 'rate_limit'
  | 'validation'
  | 'downstream_5xx'
  | 'unknown';

export interface ScheduledWorkflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  schedule: string; // cron expression or human-readable
  nextRunTime: string; // ISO timestamp
  lastRunTime: string | null; // ISO timestamp
  createdAt: string;
  updatedAt: string;
  // Execution metrics (all-time)
  totalRuns: number;
  successCount: number;
  failureCount: number;
  // Recent execution trend (last N runs for sparkline)
  recentExecutions: ExecutionStatus[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  timestamp: string; // ISO timestamp
  status: ExecutionStatus;
  durationMs: number;
  failureReason?: string;
  failureCategory?: FailureCategory;
  logsUrl?: string;
}

export interface WorkflowDetail extends ScheduledWorkflow {
  executions: WorkflowExecution[];
  failureBreakdown: Record<FailureCategory, number>;
}

// Helper to calculate success rate
export function calculateSuccessRate(workflow: ScheduledWorkflow): number {
  if (workflow.totalRuns === 0) return 100;
  return Math.round((workflow.successCount / workflow.totalRuns) * 100);
}

// Helper to format failure category for display
export const FAILURE_CATEGORY_LABELS: Record<FailureCategory, string> = {
  timeout: 'Timeout',
  auth_permission: 'Auth/Permission',
  rate_limit: 'Rate Limiting',
  validation: 'Validation/Data Format',
  downstream_5xx: 'Downstream 5xx',
  unknown: 'Unknown/Unhandled',
};
