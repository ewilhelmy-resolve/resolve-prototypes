import crypto from "node:crypto";
import { logger } from "../../config/logger.js";
import type {
	AgentExecutionMessage,
	AgenticService,
} from "../AgenticService.js";
import { parseRawJsonResponse } from "../metaAgentExecution/parsers.js";
import type { SSEService } from "../sse.js";
import { buildAgentPrompt } from "./buildPrompt.js";
import type {
	AgentCancelParams,
	AgentCreationInputParams,
	AgentCreationStrategy,
	AgentGenerateParams,
	AsyncCreationResult,
} from "./types.js";

const AGENT_DEVELOPER_NAME = "AgentRitaDeveloper";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 100; // ~5 minutes

interface ActiveCreation {
	executionId: string;
	conversationId: string;
	cancelled: boolean;
	userId: string;
	userEmail: string;
	tenantId: string;
	requestedName: string;
	transcript: string[];
	/**
	 * Target agent EID. Always set — the meta-agent runs in UPDATE mode
	 * against a real agent row (either one RITA just created as a shell, or
	 * one the user is editing).
	 */
	targetAgentEid: string;
	/**
	 * True when RITA created the agent shell directly via POST /agents/metadata
	 * right before handing off to the meta-agent. Distinguishes shell-first
	 * CREATE from user-initiated UPDATE so we only roll back shells we
	 * actually created. User-edited agents must never be deleted on failure.
	 */
	shellAlreadyCreated: boolean;
}

/**
 * Direct API Strategy
 *
 * Invokes the AgentRitaDeveloper meta-agent via the LLM Service agentic API
 * in UPDATE mode (always — the meta-agent never creates agents itself). The
 * caller is expected to have already written the agent shell via
 * POST /agents/metadata for CREATE, or to pass through an existing agent's
 * EID for user-initiated UPDATE. Polls for execution progress and sends SSE
 * events to the client.
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
		// targetAgentEid is always set by the route — shell-first CREATE writes
		// a shell first, user-initiated UPDATE passes one through directly.
		if (!params.targetAgentEid) {
			throw new Error(
				"targetAgentEid is required: meta-agent runs in UPDATE mode only",
			);
		}
		const prompt = buildAgentPrompt(params);
		const shellAlreadyCreated = params.shellAlreadyCreated ?? false;

		logger.info(
			{
				creationId,
				name: params.name,
				userId: params.userId,
				targetAgentEid: params.targetAgentEid,
				shellAlreadyCreated,
			},
			"Invoking AgentRitaDeveloper via direct agentic API",
		);

		const { executionId, conversationId } =
			await this.agenticService.executeAgent(AGENT_DEVELOPER_NAME, {
				utterance: prompt,
				targetAgentEid: params.targetAgentEid,
				tenant: params.organizationId,
				userEmail: params.userEmail,
			});

		this.activeCreations.set(creationId, {
			executionId,
			conversationId,
			cancelled: false,
			userId: params.userId,
			userEmail: params.userEmail,
			tenantId: params.organizationId,
			requestedName: params.name,
			transcript: [prompt],
			targetAgentEid: params.targetAgentEid,
			shellAlreadyCreated,
		});

		// Shell-first: surface the early-confirmation "Saved" step before the
		// meta-agent's slower Analyzing/Building phases show up. Gives the user
		// immediate feedback that RITA already persisted their form values — so
		// if the meta-agent phase takes a while or fails, they know the cheap
		// fields (name, description, icons, starters, guardrails) are safe.
		if (shellAlreadyCreated) {
			this.sseService.sendToUser(params.userId, params.organizationId, {
				type: "agent_creation_progress",
				data: {
					creation_id: creationId,
					step_type: "shell_created",
					step_label: "Saved",
					step_detail: "Agent saved; generating instructions...",
					timestamp: new Date().toISOString(),
				},
			});
		}

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
			AGENT_DEVELOPER_NAME,
			{
				utterance: params.prompt,
				transcript,
				prevExecutionId: params.prevExecutionId,
				// Preserve the mode across multi-turn clarifications.
				targetAgentEid: creation.targetAgentEid,
				// Preserve tenant across multi-turn clarifications so the resumed
				// run scopes tool calls against the same tenant.
				tenant: creation.tenantId,
				userEmail: creation.userEmail,
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
						await this.handleExecutionError(creationId, creation, msg);
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
				// The meta-agent patches an existing agent (shell or user's agent)
				// and may not echo back `agent_metadata.eid` — fall back to the
				// eid we already know.
				const agentEid =
					finalResponse.agent_metadata?.eid || creation.targetAgentEid;
				const returnedName = finalResponse.agent_metadata?.name || "New Agent";
				// The user-provided name is canonical (already persisted in the
				// shell). Report it in SSE regardless of what the meta-agent echoes.
				const agentName = creation.requestedName || returnedName;

				logger.info(
					{
						creationId,
						agentEid,
						agentName,
						returnedName,
						shellAlreadyCreated: creation.shellAlreadyCreated,
					},
					"Agent updated successfully via agentic API",
				);

				this.sseService.sendToUser(creation.userId, creation.tenantId, {
					type: "agent_creation_completed",
					data: {
						creation_id: creationId,
						agent_id: agentEid,
						agent_name: agentName,
						// From the UX perspective, a shell-first flow is a "create"
						// (user clicked Create); a pass-through is an "update".
						mode: creation.shellAlreadyCreated ? "create" : "update",
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
				const baseErrorMsg =
					finalResponse.error_message ||
					(finalResponse.failures?.length
						? finalResponse.failures.join("; ")
						: "Agent creation failed");

				const errorMsg = await this.rollbackShellIfNeeded(
					creationId,
					creation,
					baseErrorMsg,
				);

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
			// Log the raw content so we can diagnose parse failures — pino's
			// `err` key triggers the Error serializer (name/message/stack),
			// whereas `error` would serialize to `{}`.
			const rawField = msg.content?.raw;
			logger.error(
				{
					creationId,
					err,
					rawType: typeof rawField,
					rawPreview:
						typeof rawField === "string"
							? rawField.slice(0, 2000)
							: JSON.stringify(rawField)?.slice(0, 2000),
				},
				"Failed to parse execution_complete response",
			);

			const errorMsg = await this.rollbackShellIfNeeded(
				creationId,
				creation,
				"Failed to process agent creation result",
			);

			this.sseService.sendToUser(creation.userId, creation.tenantId, {
				type: "agent_creation_failed",
				data: {
					creation_id: creationId,
					error: errorMsg,
					timestamp: new Date().toISOString(),
				},
			});
		}

		this.activeCreations.delete(creationId);
	}

	/**
	 * Delete the agent shell RITA created just before the meta-agent handoff
	 * when the meta-agent fails. Only runs when `shellAlreadyCreated` is true
	 * — user-initiated UPDATEs must never be deleted on failure. Best-effort:
	 * if the DELETE itself fails, we tag the user-facing error so they know
	 * a draft may linger in their agent list.
	 */
	private async rollbackShellIfNeeded(
		creationId: string,
		creation: ActiveCreation,
		baseErrorMsg: string,
	): Promise<string> {
		if (!creation.shellAlreadyCreated) {
			return baseErrorMsg;
		}
		try {
			await this.agenticService.deleteAgent(creation.targetAgentEid);
			logger.info(
				{ creationId, eid: creation.targetAgentEid },
				"Rolled back orphan shell after meta-agent failure",
			);
			return baseErrorMsg;
		} catch (err) {
			logger.error(
				{ creationId, eid: creation.targetAgentEid, error: err },
				"Failed to roll back orphan shell — draft may linger",
			);
			return `${baseErrorMsg} (a draft may appear in your agent list — delete it manually and retry)`;
		}
	}

	/**
	 * Handle LLM-side execution failure events (execution_error / execution_failed).
	 * Surfaces the LLM's own error message to the user instead of letting the
	 * poll loop silently run out its 5-minute budget.
	 */
	private async handleExecutionError(
		creationId: string,
		creation: ActiveCreation,
		msg: AgentExecutionMessage,
	): Promise<void> {
		const errorType = (msg.content?.error_type as string) || "ExecutionError";
		const fullMessage = (msg.content?.error_message as string) || "";
		// LLM often sends a Python traceback — keep only the first line for the UI.
		const firstLine = fullMessage.split("\n")[0]?.trim() || "";
		const baseErrorMsg = firstLine
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

		const userFacing = await this.rollbackShellIfNeeded(
			creationId,
			creation,
			baseErrorMsg,
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
		const rawField = msg.content?.raw;
		// Defensive: the LLM Service normally returns a string here, but if it
		// ever emits an already-parsed object we should just return it.
		if (rawField && typeof rawField === "object") {
			return rawField as Record<string, any>;
		}
		const raw = typeof rawField === "string" ? rawField : "";
		return parseRawJsonResponse(raw);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
