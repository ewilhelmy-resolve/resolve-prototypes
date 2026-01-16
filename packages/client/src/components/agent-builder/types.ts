/**
 * Agentic Workflow Builder Types
 */

export type AgentType =
  | 'answer_formatter'
  | 'embedded_knowledge'
  | 'workflow_executor';

export type AgentStatus = 'draft' | 'published' | 'disabled';

export type BuilderPhase = 'setup' | 'build' | 'preview' | 'publish';

export type TriggerType = 'keyword' | 'intent' | 'scheduled' | 'api';

export type StepType = 'action' | 'condition' | 'prompt' | 'transform' | 'delay' | 'escalate';

export interface Trigger {
  type: TriggerType;
  value: string;
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  position: { x: number; y: number };
  connections: { targetStepId: string; label?: string }[];
}

export interface KnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'confluence' | 'sharepoint';
  priority: number;
}

export interface AgentPersona {
  name: string;
  tone: 'professional' | 'friendly' | 'concise';
  instructions: string;
}

export interface CompletionRule {
  type: 'user_confirmed' | 'goal_achieved' | 'max_turns' | 'timeout';
  enabled: boolean;
  value?: number;
}

export interface Guardrail {
  type: 'pii_redaction' | 'topic_restriction' | 'escalation_trigger' | 'max_turns';
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  status: AgentStatus;
  trigger?: Trigger;
  // Answer/RAG config
  knowledgeSources?: KnowledgeSource[];
  persona?: AgentPersona;
  // Workflow config
  steps?: WorkflowStep[];
  // Common
  completionRules?: CompletionRule[];
  guardrails?: Guardrail[];
}

export const AGENT_TYPE_META: Record<AgentType, { label: string; description: string; icon: string }> = {
  answer_formatter: {
    label: 'Answer Agent',
    description: 'Answers questions using knowledge base with custom formatting',
    icon: '💬',
  },
  embedded_knowledge: {
    label: 'Knowledge Agent',
    description: 'Uses pre-configured documents and attachments',
    icon: '📚',
  },
  workflow_executor: {
    label: 'Workflow Agent',
    description: 'Executes Resolve automations and explains results',
    icon: '⚡',
  },
};

export const STEP_TYPE_META: Record<StepType, { label: string; icon: string; color: string }> = {
  action: { label: 'Action', icon: '▶️', color: 'bg-blue-100 border-blue-300' },
  condition: { label: 'Condition', icon: '🔀', color: 'bg-yellow-100 border-yellow-300' },
  prompt: { label: 'User Prompt', icon: '💭', color: 'bg-purple-100 border-purple-300' },
  transform: { label: 'Transform', icon: '🔄', color: 'bg-green-100 border-green-300' },
  delay: { label: 'Delay', icon: '⏱️', color: 'bg-gray-100 border-gray-300' },
  escalate: { label: 'Escalate', icon: '🚨', color: 'bg-red-100 border-red-300' },
};
