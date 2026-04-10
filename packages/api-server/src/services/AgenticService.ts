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
	prompt_name: string | null;
	llm_parameters: Record<string, unknown> | null;
	sys_date_created: string | null;
	sys_date_updated: string | null;
	sys_created_by: string | null;
	sys_updated_by: string | null;
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

		this.client = axios.create({
			baseURL,
			timeout: 15000,
			headers: {
				"Content-Type": "application/json",
				...(apiKey && { "X-API-Key": apiKey }),
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
}
