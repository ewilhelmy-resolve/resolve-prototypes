import axios, { type AxiosInstance } from "axios";
import { logger } from "../config/logger.js";

interface AgentMetadataApiData {
	id: number | null;
	eid: string | null;
	name: string | null;
	description: string | null;
	default_parameters: Record<string, unknown> | null;
	configs: Record<string, unknown> | null;
	active: boolean | null;
	markdown_text: string | null;
	tags: Record<string, unknown> | null;
	parameters: Record<string, unknown> | null;
	tenant: string | null;
	conversation_starters: string[] | null;
	guardrails: string[] | null;
	prompt_name: string | null;
	llm_parameters: Record<string, unknown> | null;
	sys_date_created: string | null;
	sys_date_updated: string | null;
	sys_created_by: string | null;
	sys_updated_by: string | null;
}

export interface ToolApiData {
	id: number;
	eid: string;
	name: string;
	description: string;
	active: boolean;
	type: string;
}

export interface ToolListFilters {
	name?: string;
	active?: boolean;
	type?: string;
	limit?: number;
	offset?: number;
}

interface AgentTaskApiData {
	id: number | null;
	eid: string | null;
	name: string | null;
	agent_metadata_id: string | null;
	role: string | null;
	description: string | null;
	goal: string | null;
	backstory: string | null;
	task: string | null;
	expected_output: string | null;
	tools: string[] | null;
	depends_on_tasks: string[] | null;
	configs: Record<string, unknown> | null;
	order: number | null;
	active: boolean | null;
	tenant: string | null;
	sys_date_created: string | null;
	sys_date_updated: string | null;
	sys_created_by: string | null;
	sys_updated_by: string | null;
}

export interface AgentListFilters {
	name?: string;
	active?: boolean;
	limit?: number;
	offset?: number;
}

export class AgenticService {
	private client: AxiosInstance;

	constructor() {
		const baseURL =
			process.env.LLM_SERVICE_URL || "https://llm-service-staging.resolve.io";
		const apiKey = process.env.LLM_SERVICE_API_KEY || "";
		const dbTenant = process.env.LLM_SERVICE_DB_TENANT || "";

		if (!dbTenant) {
			logger.warn(
				"LLM_SERVICE_DB_TENANT is not set — LLM Service calls will likely fail",
			);
		}

		this.client = axios.create({
			baseURL,
			timeout: 15000,
			headers: {
				"Content-Type": "application/json",
				...(apiKey && { "X-API-Key": apiKey }),
				...(dbTenant && { "X-DB-Tenant": dbTenant }),
			},
		});
	}

	async healthCheck(): Promise<boolean> {
		try {
			const response = await this.client.get("/health");
			return response.status === 200;
		} catch (error) {
			logger.error({ error }, "LLM Service health check failed");
			return false;
		}
	}

	async listAgents(
		filters?: AgentListFilters,
	): Promise<AgentMetadataApiData[]> {
		try {
			const params: Record<string, string | number | boolean> = {};
			if (filters?.name) params.name = filters.name;
			if (filters?.active !== undefined) params.active = filters.active;
			if (filters?.limit) params.limit = filters.limit;
			if (filters?.offset) params.offset = filters.offset;

			const response = await this.client.get<AgentMetadataApiData[]>(
				"/agents/metadata",
				{ params },
			);
			return response.data;
		} catch (error) {
			logger.error({ error }, "Failed to list agents from LLM Service");
			throw error;
		}
	}

	async listTools(filters?: ToolListFilters): Promise<ToolApiData[]> {
		try {
			const params: Record<string, string | number | boolean> = {};
			if (filters?.name) params.name = filters.name;
			if (filters?.active !== undefined) params.active = filters.active;
			if (filters?.type) params.type = filters.type;
			if (filters?.limit) params.limit = filters.limit;
			if (filters?.offset) params.offset = filters.offset;

			const response = await this.client.get<ToolApiData[]>("/tools/", {
				params,
			});
			return response.data;
		} catch (error) {
			logger.error({ error }, "Failed to list tools from LLM Service");
			throw error;
		}
	}

	async filterTools(
		query: string,
		opts?: { limit?: number; offset?: number; order_by?: string },
	): Promise<ToolApiData[]> {
		try {
			const params: Record<string, string | number> = { query };
			if (opts?.limit) params.limit = opts.limit;
			if (opts?.offset) params.offset = opts.offset;
			if (opts?.order_by) params.order_by = opts.order_by;

			const response = await this.client.get<ToolApiData[]>("/tools/filter", {
				params,
			});
			return response.data;
		} catch (error) {
			logger.error({ error }, "Failed to filter tools from LLM Service");
			throw error;
		}
	}

	async getAgent(eid: string): Promise<AgentMetadataApiData> {
		try {
			const response = await this.client.get<AgentMetadataApiData>(
				`/agents/metadata/eid/${eid}`,
			);
			return response.data;
		} catch (error) {
			logger.error({ eid, error }, "Failed to get agent from LLM Service");
			throw error;
		}
	}

	async getAgentByName(name: string): Promise<AgentMetadataApiData | null> {
		try {
			const response = await this.client.get<AgentMetadataApiData>(
				`/agents/metadata/name/${encodeURIComponent(name)}`,
			);
			return response.data;
		} catch (error: any) {
			if (error?.response?.status === 404) return null;
			logger.error(
				{ name, error },
				"Failed to get agent by name from LLM Service",
			);
			throw error;
		}
	}

	async deleteAgent(
		eid: string,
	): Promise<{ success: boolean; message: string }> {
		try {
			const response = await this.client.delete<{
				success: boolean;
				message: string;
			}>(`/agents/metadata/eid/${eid}`);
			return response.data;
		} catch (error) {
			logger.error({ eid, error }, "Failed to delete agent from LLM Service");
			throw error;
		}
	}

	async createAgent(
		data: Partial<AgentMetadataApiData>,
	): Promise<AgentMetadataApiData> {
		try {
			const response = await this.client.post<AgentMetadataApiData>(
				"/agents/metadata",
				data,
			);
			return response.data;
		} catch (error) {
			logger.error({ error }, "Failed to create agent in LLM Service");
			throw error;
		}
	}

	async updateAgent(
		eid: string,
		data: Partial<AgentMetadataApiData>,
	): Promise<AgentMetadataApiData> {
		try {
			const response = await this.client.put<AgentMetadataApiData>(
				`/agents/metadata/eid/${eid}`,
				data,
			);
			return response.data;
		} catch (error) {
			logger.error({ eid, error }, "Failed to update agent in LLM Service");
			throw error;
		}
	}

	async filterAgents(
		query: string,
		opts?: { limit?: number; offset?: number; order_by?: string },
	): Promise<AgentMetadataApiData[]> {
		try {
			const params: Record<string, string | number> = { query };
			if (opts?.limit) params.limit = opts.limit;
			if (opts?.offset) params.offset = opts.offset;
			if (opts?.order_by) params.order_by = opts.order_by;

			const response = await this.client.get<AgentMetadataApiData[]>(
				"/agents/metadata/filter",
				{ params },
			);
			return response.data;
		} catch (error) {
			logger.error({ error }, "Failed to filter agents from LLM Service");
			throw error;
		}
	}

	async listTasks(agentMetadataId?: string): Promise<AgentTaskApiData[]> {
		try {
			const params: Record<string, string | number> = {};
			if (agentMetadataId) params.agent_metadata_id = agentMetadataId;

			const response = await this.client.get<AgentTaskApiData[]>(
				"/agents/tasks",
				{ params },
			);
			return response.data;
		} catch (error) {
			logger.error(
				{ agentMetadataId, error },
				"Failed to list agent tasks from LLM Service",
			);
			throw error;
		}
	}

	async getTask(taskEid: string): Promise<AgentTaskApiData> {
		try {
			const response = await this.client.get<AgentTaskApiData>(
				`/agents/tasks/eid/${taskEid}`,
			);
			return response.data;
		} catch (error) {
			logger.error({ taskEid, error }, "Failed to get task from LLM Service");
			throw error;
		}
	}

	async createTask(data: Partial<AgentTaskApiData>): Promise<AgentTaskApiData> {
		try {
			const response = await this.client.post<AgentTaskApiData>(
				"/agents/tasks",
				data,
			);
			return response.data;
		} catch (error) {
			logger.error({ error }, "Failed to create task in LLM Service");
			throw error;
		}
	}

	async updateTask(
		taskEid: string,
		data: Partial<AgentTaskApiData>,
	): Promise<AgentTaskApiData> {
		try {
			const response = await this.client.put<AgentTaskApiData>(
				`/agents/tasks/eid/${taskEid}`,
				data,
			);
			return response.data;
		} catch (error) {
			logger.error({ taskEid, error }, "Failed to update task in LLM Service");
			throw error;
		}
	}

	async deleteTask(
		taskEid: string,
	): Promise<{ success: boolean; message: string }> {
		try {
			const response = await this.client.delete<{
				success: boolean;
				message: string;
			}>(`/agents/tasks/eid/${taskEid}`);
			return response.data;
		} catch (error) {
			logger.error(
				{ taskEid, error },
				"Failed to delete task from LLM Service",
			);
			throw error;
		}
	}

	// ============================================================================
	// Agent Execution (invoke, poll, stop)
	// ============================================================================

	async executeAgent(
		agentName: string,
		params: {
			utterance: string;
			transcript?: string;
			additionalInformation?: string;
			prevExecutionId?: string;
		},
	): Promise<{
		conversationId: string;
		executionId: string;
		agentMetadataId: string;
	}> {
		try {
			const body: Record<string, unknown> = {
				query: {
					agent_metadata_parameters: {
						agent_name: agentName,
						...(params.prevExecutionId && {
							prev_execution_id: params.prevExecutionId,
						}),
						parameters: {
							utterance: params.utterance,
							...(params.transcript && { transcript: params.transcript }),
							...(params.additionalInformation && {
								additional_information: params.additionalInformation,
							}),
						},
					},
				},
			};

			const response = await this.client.post("/services/agentic", body, {
				timeout: 30000,
			});

			const result = response.data?.result;
			if (!result?.execution_id) {
				throw new Error("Missing execution_id in agentic response");
			}

			return {
				conversationId: result.conversation_id,
				executionId: result.execution_id,
				agentMetadataId: result.agent_metadata_id,
			};
		} catch (error) {
			logger.error(
				{ agentName, error },
				"Failed to execute agent via LLM Service",
			);
			throw error;
		}
	}

	async pollExecution(
		executionId: string,
		limit = 100,
	): Promise<AgentExecutionMessage[]> {
		try {
			const response = await this.client.get<AgentExecutionMessage[]>(
				`/agents/messages/execution/poll/${executionId}`,
				{ params: { limit }, timeout: 10000 },
			);
			return response.data;
		} catch (error) {
			logger.error(
				{ executionId, error },
				"Failed to poll execution from LLM Service",
			);
			throw error;
		}
	}

	// ============================================================================
	// Prompt Rulesets (sync completion via /prompts/completion)
	// ============================================================================

	async executePromptCompletion(params: {
		promptName: string;
		promptParameters: Record<string, unknown>;
		llmParameters?: Record<string, unknown>;
		isJsonResponse?: boolean;
		referenceId?: string;
	}): Promise<PromptCompletionResponse> {
		try {
			const body: Record<string, unknown> = {
				prompt_name: params.promptName,
				prompt_parameters: params.promptParameters,
				...(params.llmParameters && { llm_parameters: params.llmParameters }),
				...(params.isJsonResponse !== undefined && {
					is_json_response: params.isJsonResponse,
				}),
				...(params.referenceId && { reference_id: params.referenceId }),
			};

			const response = await this.client.post<PromptCompletionResponse>(
				"/prompts/completion",
				body,
				{ timeout: 60000 },
			);
			return response.data;
		} catch (error) {
			logger.error(
				{ promptName: params.promptName, error },
				"Failed to execute prompt completion via LLM Service",
			);
			throw error;
		}
	}

	async stopExecution(
		executionId: string,
	): Promise<{ success: boolean; message: string }> {
		try {
			const response = await this.client.post<{
				success: boolean;
				message: string;
			}>("/agents/request_stop_agent", { execution_id: executionId });
			return response.data;
		} catch (error) {
			logger.error(
				{ executionId, error },
				"Failed to stop agent execution in LLM Service",
			);
			throw error;
		}
	}
}

// ============================================================================
// Execution Message Types (from poll endpoint)
// ============================================================================

export interface PromptCompletionResponse {
	/** The raw completion text, or (when is_json_response=true) a parsed object */
	data?: string | Record<string, unknown>;
	usage?: Record<string, unknown>;
	reference_id?: string;
	[key: string]: unknown;
}

export interface AgentExecutionMessage {
	id: number;
	eid: string;
	execution_id: string;
	role: string;
	event_type: string;
	content: Record<string, unknown>;
	tenant: string | null;
	sys_date_created: string;
	display_value?: string;
}
