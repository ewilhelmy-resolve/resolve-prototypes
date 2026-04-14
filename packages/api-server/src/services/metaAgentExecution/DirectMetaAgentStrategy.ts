import crypto from "node:crypto";
import { logger } from "../../config/logger.js";
import type {
	AgentExecutionMessage,
	AgenticService,
} from "../AgenticService.js";
import type { SSEService } from "../sse.js";
import type {
	MetaAgentCancelParams,
	MetaAgentExecuteParams,
	MetaAgentExecuteResult,
	MetaAgentStrategy,
} from "./types.js";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 100; // ~5 minutes

interface ActiveExecution {
	executionId: string;
	conversationId: string;
	cancelled: boolean;
	userId: string;
	tenantId: string;
	agentName: string;
}

/**
 * Direct Meta-Agent Strategy
 *
 * Invokes any meta-agent via the LLM Service agentic API, polls for
 * execution progress, and sends SSE events to the client.
 *
 * Used when META_AGENT_MODE=direct (default).
 */
export class DirectMetaAgentStrategy implements MetaAgentStrategy {
	private activeExecutions = new Map<string, ActiveExecution>();

	constructor(
		private readonly agenticService: AgenticService,
		private readonly sseService: SSEService,
	) {}

	async execute(
		params: MetaAgentExecuteParams,
	): Promise<MetaAgentExecuteResult> {
		const executionRequestId = crypto.randomUUID();

		logger.info(
			{
				executionRequestId,
				agentName: params.agentName,
				userId: params.userId,
			},
			"Executing meta-agent via direct agentic API",
		);

		const { executionId, conversationId } =
			await this.agenticService.executeAgent(params.agentName, {
				utterance: params.utterance,
				additionalInformation: params.additionalInformation,
				transcript: params.transcript,
			});

		this.activeExecutions.set(executionRequestId, {
			executionId,
			conversationId,
			cancelled: false,
			userId: params.userId,
			tenantId: params.organizationId,
			agentName: params.agentName,
		});

		// Fire-and-forget background polling
		this.pollInBackground(executionRequestId).catch((err) => {
			logger.error(
				{ executionRequestId, error: err },
				"Meta-agent background polling failed unexpectedly",
			);
		});

		return { executionRequestId };
	}

	async cancel(params: MetaAgentCancelParams): Promise<{ success: boolean }> {
		const execution = this.activeExecutions.get(params.executionRequestId);
		if (!execution) {
			return { success: true };
		}

		logger.info(
			{ executionRequestId: params.executionRequestId },
			"Cancelling meta-agent execution",
		);

		execution.cancelled = true;

		try {
			await this.agenticService.stopExecution(execution.executionId);
		} catch (err) {
			logger.warn(
				{ executionRequestId: params.executionRequestId, error: err },
				"Failed to stop meta-agent execution (may already be complete)",
			);
		}

		this.activeExecutions.delete(params.executionRequestId);
		return { success: true };
	}

	private async pollInBackground(executionRequestId: string): Promise<void> {
		const execution = this.activeExecutions.get(executionRequestId);
		if (!execution) return;

		let lastSeenId = 0;
		let lastPollError: unknown = null;
		let pollFailureCount = 0;

		for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
			if (execution.cancelled) {
				this.activeExecutions.delete(executionRequestId);
				return;
			}

			await this.sleep(POLL_INTERVAL_MS);

			if (execution.cancelled) {
				this.activeExecutions.delete(executionRequestId);
				return;
			}

			try {
				const messages = await this.agenticService.pollExecution(
					execution.executionId,
				);

				const newMessages = messages.filter((m) => m.id > lastSeenId);
				if (newMessages.length > 0) {
					lastSeenId = newMessages[newMessages.length - 1].id;
				}

				logger.debug(
					{
						executionRequestId,
						executionId: execution.executionId,
						attempt: attempt + 1,
						totalMessages: messages.length,
						newMessages: newMessages.length,
						newEventTypes: newMessages.map((m) => m.event_type),
						lastSeenId,
					},
					"Meta-agent poll",
				);

				for (const msg of newMessages) {
					const progressLabel = this.getProgressLabel(msg);
					if (progressLabel) {
						this.sseService.sendToUser(execution.userId, execution.tenantId, {
							type: "meta_agent_progress",
							data: {
								execution_request_id: executionRequestId,
								agent_name: execution.agentName,
								step_label: progressLabel.label,
								step_detail: progressLabel.detail,
								timestamp: msg.sys_date_created || new Date().toISOString(),
							},
						});
					}

					// Terminal: execution_complete
					if (msg.event_type === "execution_complete") {
						this.handleExecutionComplete(executionRequestId, execution, msg);
						return;
					}
					// Terminal: execution_error / execution_failed
					if (
						msg.event_type === "execution_error" ||
						msg.event_type === "execution_failed"
					) {
						this.handleExecutionError(executionRequestId, execution, msg);
						return;
					}
				}
			} catch (err) {
				lastPollError = err;
				pollFailureCount++;
				logger.warn(
					{ executionRequestId, attempt, error: err },
					"Meta-agent poll attempt failed, retrying",
				);
			}
		}

		// Timeout
		logger.warn(
			{
				executionRequestId,
				executionId: execution.executionId,
				pollFailureCount,
				lastPollError,
				maxAttempts: MAX_POLL_ATTEMPTS,
				intervalMs: POLL_INTERVAL_MS,
			},
			"Meta-agent polling timed out",
		);
		this.sseService.sendToUser(execution.userId, execution.tenantId, {
			type: "meta_agent_failed",
			data: {
				execution_request_id: executionRequestId,
				agent_name: execution.agentName,
				error:
					pollFailureCount > 0
						? `Meta-agent timed out after ${pollFailureCount} failed polls (last error: ${lastPollError instanceof Error ? lastPollError.message : String(lastPollError)}).`
						: "Meta-agent execution timed out.",
				timestamp: new Date().toISOString(),
			},
		});
		this.activeExecutions.delete(executionRequestId);
	}

	private handleExecutionComplete(
		executionRequestId: string,
		execution: ActiveExecution,
		msg: AgentExecutionMessage,
	): void {
		try {
			const finalResponse = this.parseRawResponse(msg);

			if (
				finalResponse.success &&
				(!finalResponse.need_inputs || finalResponse.need_inputs.length === 0)
			) {
				logger.info(
					{ executionRequestId, agentName: execution.agentName },
					"Meta-agent completed successfully",
				);

				this.sseService.sendToUser(execution.userId, execution.tenantId, {
					type: "meta_agent_completed",
					data: {
						execution_request_id: executionRequestId,
						agent_name: execution.agentName,
						content: finalResponse.content || "",
						success: true,
						timestamp: new Date().toISOString(),
					},
				});
			} else {
				// Meta-agents used here are single-turn; treat need_inputs or
				// success:false as a failure for now.
				const errorMsg =
					finalResponse.error_message ||
					(finalResponse.need_inputs?.length
						? "Agent requested additional inputs (unexpected for this operation)"
						: "Meta-agent execution failed");

				this.sseService.sendToUser(execution.userId, execution.tenantId, {
					type: "meta_agent_failed",
					data: {
						execution_request_id: executionRequestId,
						agent_name: execution.agentName,
						error: errorMsg,
						timestamp: new Date().toISOString(),
					},
				});
			}
		} catch (err) {
			logger.error(
				{ executionRequestId, error: err },
				"Failed to parse meta-agent execution_complete response",
			);
			this.sseService.sendToUser(execution.userId, execution.tenantId, {
				type: "meta_agent_failed",
				data: {
					execution_request_id: executionRequestId,
					agent_name: execution.agentName,
					error: "Failed to process meta-agent result",
					timestamp: new Date().toISOString(),
				},
			});
		}

		this.activeExecutions.delete(executionRequestId);
	}

	private handleExecutionError(
		executionRequestId: string,
		execution: ActiveExecution,
		msg: AgentExecutionMessage,
	): void {
		const errorType = (msg.content?.error_type as string) || "ExecutionError";
		const fullMessage = (msg.content?.error_message as string) || "";
		const firstLine = fullMessage.split("\n")[0]?.trim() || "";
		const userFacing = firstLine
			? `${errorType}: ${firstLine}`
			: `Meta-agent reported ${errorType}`;

		logger.error(
			{
				executionRequestId,
				executionId: execution.executionId,
				eventType: msg.event_type,
				errorType,
				errorMessage: fullMessage,
			},
			"Meta-agent execution failed — LLM reported error",
		);

		this.sseService.sendToUser(execution.userId, execution.tenantId, {
			type: "meta_agent_failed",
			data: {
				execution_request_id: executionRequestId,
				agent_name: execution.agentName,
				error: userFacing,
				timestamp: new Date().toISOString(),
			},
		});

		this.activeExecutions.delete(executionRequestId);
	}

	private getProgressLabel(
		msg: AgentExecutionMessage,
	): { label: string; detail: string } | null {
		switch (msg.event_type) {
			case "execution_start":
				return {
					label: "Starting",
					detail: "Initializing meta-agent...",
				};
			case "agent_start": {
				const role = (msg.content?.agent_role as string) || "";
				return {
					label: "Processing",
					detail: `${role || "Agent"} is working...`,
				};
			}
			case "task_end":
				return {
					label: "Processing",
					detail: "Task completed",
				};
			default:
				return null;
		}
	}

	private parseRawResponse(msg: AgentExecutionMessage): Record<string, any> {
		const raw = (msg.content?.raw as string) || "";
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
