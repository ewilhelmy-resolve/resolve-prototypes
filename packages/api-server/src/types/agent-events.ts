/**
 * Agent Events (RabbitMQ consumer messages)
 *
 * Messages published to the `agent.events` queue by the external platform
 * during the AI-powered agent creation workflow.
 *
 * @see docs/features/agents/agent-developer-workflow-integration.md section 4
 */

export interface AgentCreationProgressMessage {
	type: "agent_creation_progress";
	tenant_id: string;
	user_id: string;
	creation_id: string;
	step_type: string;
	step_label: string;
	step_detail: string;
	step_index?: number;
	total_steps?: number;
	final_response?: {
		success: boolean;
		need_inputs: string[];
		terminate: boolean;
		error_message: string;
	};
}

export interface AgentCreationInputRequiredMessage {
	type: "agent_creation_input_required";
	tenant_id: string;
	user_id: string;
	creation_id: string;
	execution_id: string;
	message: string;
	need_inputs: string[];
}

export interface AgentCreationCompletedMessage {
	type: "agent_creation_completed";
	tenant_id: string;
	user_id: string;
	creation_id: string;
	status: "success";
	agent_id: string;
	agent_name: string;
	/**
	 * Discriminates create vs update flows. Absent = "create" for backward
	 * compat with existing workflow-mode publishers.
	 */
	mode?: "create" | "update";
}

export interface AgentCreationFailedMessage {
	type: "agent_creation_failed";
	tenant_id: string;
	user_id: string;
	creation_id: string;
	status: "failed";
	error_message: string;
}

/**
 * Discriminated union for agent.events queue messages.
 * Add new event types here as the agent domain grows.
 */
export type AgentEventMessage =
	| AgentCreationProgressMessage
	| AgentCreationInputRequiredMessage
	| AgentCreationCompletedMessage
	| AgentCreationFailedMessage;
