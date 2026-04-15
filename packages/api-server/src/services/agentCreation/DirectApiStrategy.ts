import crypto from "node:crypto";
import { logger } from "../../config/logger.js";
import type {
	AgentExecutionMessage,
	AgenticService,
} from "../AgenticService.js";
import type { SSEService } from "../sse.js";
import { buildAgentPrompt } from "./buildPrompt.js";
import type {
	AgentCancelParams,
	AgentCreationInputParams,
	AgentCreationStrategy,
	AgentGenerateParams,
	AsyncCreationResult,
} from "./types.js";

const AGENT_BUILDER_NAME = "AgentToCreateAgentRita";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 100; // ~5 minutes

interface ActiveCreation {
	executionId: string;
	conversationId: string;
	cancelled: boolean;
	userId: string;
	userEmail: string;
	tenantId: string;
	transcript: string[];
	conversationStarters?: string[];
	guardrails?: string[];
}

/**
 * Direct API Strategy
 *
 * Invokes the agent-builder agent (AgentToCreateAgentRita) via the LLM Service
 * agentic API, polls for execution progress, and sends SSE events to the client.
 *
 * Used when AGENT_CREATION_MODE=direct (default).
 */
export class DirectApiStrategy implements AgentCreationStrategy {
	private activeCreations = new Map<string, ActiveCreation>();

	constructor(
		private readonly agenticService: AgenticService,
		private readonly sseService: SSEService,
	) {}

	async createAgent(params: AgentGenerateParams): Promise<AsyncCreationResult> {
		const creationId = crypto.randomUUID();
		const prompt = buildAgentPrompt(params);

		logger.info(
			{ creationId, name: params.name, userId: params.userId },
			"Creating agent via direct agentic API",
		);

		const { executionId, conversationId } =
			await this.agenticService.executeAgent(AGENT_BUILDER_NAME, {
				utterance: prompt,
			});

		this.activeCreations.set(creationId, {
			executionId,
			conversationId,
			cancelled: false,
			userId: params.userId,
			userEmail: params.userEmail,
			tenantId: params.organizationId,
			transcript: [prompt],
			conversationStarters: params.conversationStarters,
			guardrails: params.guardrails,
		});

		// Fire-and-forget background polling
		this.pollInBackground(creationId).catch((err) => {
			logger.error(
				{ creationId, error: err },
				"Background polling failed unexpectedly",
			);
		});

		return { mode: "async", creationId };
	}

	async sendInput(
		params: AgentCreationInputParams,
	): Promise<{ success: boolean }> {
		const creation = this.activeCreations.get(params.creationId);
		if (!creation) {
			throw new Error(
				`No active creation found for creationId: ${params.creationId}`,
			);
		}

		logger.info(
			{ creationId: params.creationId },
			"Resuming agent creation with user input",
		);

		// Build transcript for continuation
		creation.transcript.push(params.prompt);
		const transcript = JSON.stringify(
			creation.transcript.map((content, i) => ({
				role: i % 2 === 0 ? "user" : "assistant",
				content,
			})),
		);

		const { executionId } = await this.agenticService.executeAgent(
			AGENT_BUILDER_NAME,
			{
				utterance: params.prompt,
				transcript,
				prevExecutionId: params.prevExecutionId,
			},
		);

		// Update tracked execution
		creation.executionId = executionId;
		creation.cancelled = false;

		// Resume polling
		this.pollInBackground(params.creationId).catch((err) => {
			logger.error(
				{ creationId: params.creationId, error: err },
				"Background polling failed after input",
			);
		});

		return { success: true };
	}

	async cancel(params: AgentCancelParams): Promise<{ success: boolean }> {
		const creation = this.activeCreations.get(params.creationId);
		if (!creation) {
			return { success: true };
		}

		logger.info({ creationId: params.creationId }, "Cancelling agent creation");

		creation.cancelled = true;

		try {
			await this.agenticService.stopExecution(creation.executionId);
		} catch (err) {
			logger.warn(
				{ creationId: params.creationId, error: err },
				"Failed to stop execution (may already be complete)",
			);
		}

		this.activeCreations.delete(params.creationId);
		return { success: true };
	}

	private async pollInBackground(creationId: string): Promise<void> {
		const creation = this.activeCreations.get(creationId);
		if (!creation) return;

		let lastSeenId = 0;
		let lastPollError: unknown = null;
		let pollFailureCount = 0;

		for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
			if (creation.cancelled) {
				this.activeCreations.delete(creationId);
				return;
			}

			await this.sleep(POLL_INTERVAL_MS);

			if (creation.cancelled) {
				this.activeCreations.delete(creationId);
				return;
			}

			try {
				const messages = await this.agenticService.pollExecution(
					creation.executionId,
				);

				// Forward only new messages
				const newMessages = messages.filter((m) => m.id > lastSeenId);
				if (newMessages.length > 0) {
					lastSeenId = newMessages[newMessages.length - 1].id;
				}

				logger.debug(
					{
						creationId,
						executionId: creation.executionId,
						attempt: attempt + 1,
						totalMessages: messages.length,
						newMessages: newMessages.length,
						newEventTypes: newMessages.map((m) => m.event_type),
						lastSeenId,
					},
					"Agent creation poll",
				);

				for (const msg of newMessages) {
					// Only forward user-facing progress events
					const progressLabel = this.getProgressLabel(msg);
					if (progressLabel) {
						this.sseService.sendToUser(creation.userId, creation.tenantId, {
							type: "agent_creation_progress",
							data: {
								creation_id: creationId,
								step_type: msg.event_type,
								step_label: progressLabel.label,
								step_detail: progressLabel.detail,
								timestamp: msg.sys_date_created || new Date().toISOString(),
							},
						});
					}

					// Check for terminal states
					if (msg.event_type === "execution_complete") {
						await this.handleExecutionComplete(creationId, creation, msg);
						return;
					}
					if (
						msg.event_type === "execution_error" ||
						msg.event_type === "execution_failed"
					) {
						this.handleExecutionError(creationId, creation, msg);
						return;
					}
				}
			} catch (err) {
				lastPollError = err;
				pollFailureCount++;
				logger.warn(
					{ creationId, attempt, error: err },
					"Poll attempt failed, retrying",
				);
			}
		}

		// Timeout — surface diagnostic info so we can tell slow-LLM from broken-polling next time
		logger.warn(
			{
				creationId,
				executionId: creation.executionId,
				pollFailureCount,
				lastPollError,
				maxAttempts: MAX_POLL_ATTEMPTS,
				intervalMs: POLL_INTERVAL_MS,
			},
			"Agent creation polling timed out",
		);
		this.sseService.sendToUser(creation.userId, creation.tenantId, {
			type: "agent_creation_failed",
			data: {
				creation_id: creationId,
				error:
					pollFailureCount > 0
						? `Agent creation timed out after ${pollFailureCount} failed polls (last error: ${lastPollError instanceof Error ? lastPollError.message : String(lastPollError)}). The agent may still be created in the background.`
						: "Agent creation timed out. The agent may still be created in the background.",
				timestamp: new Date().toISOString(),
			},
		});
		this.activeCreations.delete(creationId);
	}

	private async handleExecutionComplete(
		creationId: string,
		creation: ActiveCreation,
		msg: AgentExecutionMessage,
	): Promise<void> {
		try {
			const finalResponse = this.parseRawResponse(msg);

			if (
				finalResponse.success &&
				(!finalResponse.need_inputs || finalResponse.need_inputs.length === 0)
			) {
				// Success — extract created agent info
				const agentEid = finalResponse.agent_metadata?.eid || "";
				const agentName = finalResponse.agent_metadata?.name || "New Agent";

				logger.info(
					{ creationId, agentEid, agentName },
					"Agent created successfully via agentic API",
				);

				// Enforce draft status — agent-builder may create as published
				if (agentEid && finalResponse.agent_metadata?.active === true) {
					try {
						await this.agenticService.updateAgent(agentEid, {
							active: false,
							sys_updated_by: creation.userEmail,
						});
						logger.info(
							{ agentEid },
							"Forced agent to draft status (was created as published)",
						);
					} catch (err) {
						logger.warn(
							{ agentEid, error: err },
							"Failed to force agent to draft status",
						);
					}
				}

				// TODO: Uncomment when LLM API supports icon fields directly
				// if (agentEid) {
				//   await this.agenticService.updateAgent(agentEid, {
				//     configs: { ui: { icon: params.iconId, icon_color: params.iconColorId } },
				//   });
				// }

				if (agentEid) {
					try {
						const updatePayload: Record<string, unknown> = {
							tenant: creation.tenantId,
						};
						if (creation.conversationStarters?.length) {
							updatePayload.conversation_starters =
								creation.conversationStarters;
						}
						if (creation.guardrails?.length) {
							updatePayload.guardrails = creation.guardrails;
						}
						await this.agenticService.updateAgent(agentEid, updatePayload);
					} catch (err) {
						logger.warn(
							{ agentEid, error: err },
							"Failed to update agent metadata (tenant/starters/guardrails)",
						);
					}
				}

				this.sseService.sendToUser(creation.userId, creation.tenantId, {
					type: "agent_creation_completed",
					data: {
						creation_id: creationId,
						agent_id: agentEid,
						agent_name: agentName,
						timestamp: new Date().toISOString(),
					},
				});
			} else if (
				finalResponse.need_inputs &&
				finalResponse.need_inputs.length > 0
			) {
				// Agent needs more input
				const inputDescriptions = finalResponse.need_inputs
					.map((inp: { name: string; description: string }) => inp.description)
					.join("\n");

				this.sseService.sendToUser(creation.userId, creation.tenantId, {
					type: "agent_creation_input_required",
					data: {
						creation_id: creationId,
						execution_id: creation.executionId,
						message: inputDescriptions,
						need_inputs: finalResponse.need_inputs.map(
							(inp: { name: string }) => inp.name,
						),
						timestamp: new Date().toISOString(),
					},
				});

				// Don't delete from activeCreations — user will respond
				return;
			} else {
				// Failure
				const errorMsg =
					finalResponse.error_message ||
					(finalResponse.failures?.length
						? finalResponse.failures.join("; ")
						: "Agent creation failed");

				this.sseService.sendToUser(creation.userId, creation.tenantId, {
					type: "agent_creation_failed",
					data: {
						creation_id: creationId,
						error: errorMsg,
						timestamp: new Date().toISOString(),
					},
				});
			}
		} catch (err) {
			logger.error(
				{ creationId, error: err },
				"Failed to parse execution_complete response",
			);
			this.sseService.sendToUser(creation.userId, creation.tenantId, {
				type: "agent_creation_failed",
				data: {
					creation_id: creationId,
					error: "Failed to process agent creation result",
					timestamp: new Date().toISOString(),
				},
			});
		}

		this.activeCreations.delete(creationId);
	}

	/**
	 * Handle LLM-side execution failure events (execution_error / execution_failed).
	 * Surfaces the LLM's own error message to the user instead of letting the
	 * poll loop silently run out its 5-minute budget.
	 */
	private handleExecutionError(
		creationId: string,
		creation: ActiveCreation,
		msg: AgentExecutionMessage,
	): void {
		const errorType = (msg.content?.error_type as string) || "ExecutionError";
		const fullMessage = (msg.content?.error_message as string) || "";
		// LLM often sends a Python traceback — keep only the first line for the UI.
		const firstLine = fullMessage.split("\n")[0]?.trim() || "";
		const userFacing = firstLine
			? `${errorType}: ${firstLine}`
			: `Agent builder reported ${errorType}`;

		logger.error(
			{
				creationId,
				executionId: creation.executionId,
				eventType: msg.event_type,
				errorType,
				errorMessage: fullMessage,
			},
			"Agent creation failed — LLM reported execution error",
		);

		this.sseService.sendToUser(creation.userId, creation.tenantId, {
			type: "agent_creation_failed",
			data: {
				creation_id: creationId,
				error: userFacing,
				timestamp: new Date().toISOString(),
			},
		});

		this.activeCreations.delete(creationId);
	}

	/**
	 * Filter and humanize poll messages for the UI.
	 * Only returns a label for events worth showing to the user.
	 * Returns null for noisy intermediate steps (tool_start, tool_end, raw steps).
	 */
	private getProgressLabel(
		msg: AgentExecutionMessage,
	): { label: string; detail: string } | null {
		switch (msg.event_type) {
			case "execution_start":
				return { label: "Starting", detail: "Initializing agent builder..." };
			case "agent_start": {
				const role = (msg.content?.agent_role as string) || "";
				if (role.toLowerCase().includes("requirements")) {
					return {
						label: "Analyzing",
						detail: "Analyzing your requirements...",
					};
				}
				if (role.toLowerCase().includes("records")) {
					return {
						label: "Building",
						detail: "Creating agent and tasks...",
					};
				}
				return {
					label: "Processing",
					detail: `${role || "Agent"} is working...`,
				};
			}
			case "task_end": {
				const agent = (msg.content?.agent as string) || "";
				if (agent.toLowerCase().includes("requirements")) {
					return {
						label: "Requirements",
						detail: "Requirements analysis complete",
					};
				}
				if (agent.toLowerCase().includes("records")) {
					return {
						label: "Created",
						detail: "Agent configuration saved",
					};
				}
				return null;
			}
			// Skip noisy events: tool_start, tool_end, step, agent_end
			default:
				return null;
		}
	}

	private parseRawResponse(msg: AgentExecutionMessage): Record<string, any> {
		const raw = (msg.content?.raw as string) || "";
		// Strip markdown code fences if present
		const cleaned = raw
			.replace(/^```json\s*/i, "")
			.replace(/```\s*$/, "")
			.trim();
		return JSON.parse(cleaned);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
