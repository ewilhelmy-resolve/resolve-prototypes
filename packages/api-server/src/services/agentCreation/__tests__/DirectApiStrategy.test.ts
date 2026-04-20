import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../config/logger.js", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

const mockExecuteAgent = vi.fn();
const mockPollExecution = vi.fn();
const mockStopExecution = vi.fn();
const mockUpdateAgent = vi.fn();
const mockGetAgent = vi.fn();
const mockDeleteAgent = vi.fn();

vi.mock("../../AgenticService.js", () => ({
	AgenticService: class {
		executeAgent = mockExecuteAgent;
		pollExecution = mockPollExecution;
		stopExecution = mockStopExecution;
		updateAgent = mockUpdateAgent;
		getAgent = mockGetAgent;
		deleteAgent = mockDeleteAgent;
	},
}));

const mockSendToUser = vi.fn();

vi.mock("../../sse.js", () => ({
	getSSEService: () => ({
		sendToUser: mockSendToUser,
	}),
	SSEService: class {
		sendToUser = mockSendToUser;
	},
}));

import { AgenticService } from "../../AgenticService.js";
import { DirectApiStrategy } from "../DirectApiStrategy.js";

function buildExecCompleteMessage(rawJson: Record<string, unknown>, id = 100) {
	return {
		id,
		eid: "msg-eid",
		execution_id: "exec-123",
		role: "system",
		event_type: "execution_complete",
		content: {
			raw: `\`\`\`json\n${JSON.stringify(rawJson)}\n\`\`\``,
			status: "completed",
		},
		tenant: null,
		sys_date_created: "2026-04-10T12:00:00.000Z",
	};
}

function buildExecErrorMessage(
	errorType: string,
	errorMessage: string,
	id = 200,
	eventType: "execution_error" | "execution_failed" = "execution_error",
) {
	return {
		id,
		eid: "err-eid",
		execution_id: "exec-123",
		role: "system",
		event_type: eventType,
		content: {
			conversation_id: "conv-123",
			status: "error",
			error_type: errorType,
			error_message: errorMessage,
		},
		tenant: null,
		sys_date_created: "2026-04-10T12:00:00.000Z",
	};
}

// After the shell-first refactor, targetAgentEid is always set — the route
// writes the shell first (for CREATE) or passes through an existing eid (for
// user UPDATE). The default test params model the common case: shell-first
// CREATE, where RITA just wrote the shell and the meta-agent runs in
// UPDATE-shell mode.
const baseParams = {
	name: "Test Agent",
	description: "A test agent",
	instructions: "Do test things",
	iconId: "bot",
	iconColorId: "slate",
	conversationStarters: [],
	guardrails: [],
	targetAgentEid: "shell-eid-default",
	shellAlreadyCreated: true,
	userId: "user-1",
	userEmail: "test@example.com",
	organizationId: "org-1",
};

describe("DirectApiStrategy", () => {
	let strategy: DirectApiStrategy;

	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.clearAllMocks();
		const agenticService = new AgenticService();
		const sseService = { sendToUser: mockSendToUser } as any;
		strategy = new DirectApiStrategy(agenticService, sseService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("meta-agent invocation — shell-first is the only path", () => {
		it("throws when targetAgentEid is missing (shell-first contract)", async () => {
			const { targetAgentEid: _, ...rest } = baseParams;
			await expect(strategy.createAgent(rest as any)).rejects.toThrow(
				/targetAgentEid is required/,
			);
		});

		it("forwards tenant, targetAgentEid, userEmail to executeAgent (minimal identifiers only)", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});
			mockPollExecution.mockResolvedValue([]);

			await strategy.createAgent(baseParams);

			const [, actualParams] = mockExecuteAgent.mock.calls[0];
			expect(actualParams).toMatchObject({
				targetAgentEid: "shell-eid-default",
				tenant: "org-1",
				userEmail: "test@example.com",
			});
			// userId is intentionally NOT forwarded — shell audit is already
			// set by the route's direct POST/PUT, and the meta-agent only needs
			// user_email for sub-task audit.
			expect(actualParams).not.toHaveProperty("userId");
		});

		it("does NOT fire a post-create PUT after completion (meta-agent owns writes)", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			mockPollExecution.mockResolvedValueOnce([]).mockResolvedValueOnce([
				buildExecCompleteMessage({
					success: true,
					need_inputs: [],
					agent_metadata: { eid: "shell-eid-default", name: "Test Agent" },
					tasks: [],
					is_multiturn: false,
					failures: [],
				}),
			]);

			await strategy.createAgent(baseParams);
			await vi.advanceTimersByTimeAsync(7000);

			expect(mockUpdateAgent).not.toHaveBeenCalled();

			expect(mockSendToUser).toHaveBeenCalledWith(
				"user-1",
				"org-1",
				expect.objectContaining({
					type: "agent_creation_completed",
					data: expect.objectContaining({
						agent_id: "shell-eid-default",
						agent_name: "Test Agent",
						mode: "create",
					}),
				}),
			);
		});

		it("emits mode:'update' when the caller is editing an existing agent (shellAlreadyCreated=false)", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});
			mockPollExecution.mockResolvedValueOnce([]).mockResolvedValueOnce([
				buildExecCompleteMessage({
					success: true,
					need_inputs: [],
					agent_metadata: { eid: "existing-agent", name: "Test Agent" },
					tasks: [],
					is_multiturn: false,
					failures: [],
				}),
			]);

			await strategy.createAgent({
				...baseParams,
				targetAgentEid: "existing-agent",
				shellAlreadyCreated: false,
			});
			await vi.advanceTimersByTimeAsync(7000);

			const completedCall = mockSendToUser.mock.calls.find(
				(c) => c[2]?.type === "agent_creation_completed",
			);
			expect(completedCall?.[2].data.mode).toBe("update");
		});

		it("surfaces LLM execution_error as agent_creation_failed SSE", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			mockPollExecution
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([
					buildExecErrorMessage(
						"ValueError",
						"[bd573538-1179-439c-b685-66abcfae4014] Missing llm_parameters\nTraceback (most recent call last):\n  File .../agents.py, line 1001, in _run_agent_background\n    raise e",
					),
				]);
			mockDeleteAgent.mockResolvedValue({ success: true, message: "ok" });

			await strategy.createAgent(baseParams);
			await vi.advanceTimersByTimeAsync(7000);

			expect(mockSendToUser).toHaveBeenCalledWith(
				"user-1",
				"org-1",
				expect.objectContaining({
					type: "agent_creation_failed",
					data: expect.objectContaining({
						error: expect.stringContaining("ValueError"),
					}),
				}),
			);

			const failedCall = mockSendToUser.mock.calls.find(
				(c) => c[2]?.type === "agent_creation_failed",
			);
			expect(failedCall?.[2].data.error).not.toContain("Traceback");

			const pollCallsAfter = mockPollExecution.mock.calls.length;
			await vi.advanceTimersByTimeAsync(10000);
			expect(mockPollExecution.mock.calls.length).toBe(pollCallsAfter);
		});

		it("also treats execution_failed as terminal failure", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			mockPollExecution
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([
					buildExecErrorMessage(
						"RuntimeError",
						"Agent flow aborted",
						300,
						"execution_failed",
					),
				]);
			mockDeleteAgent.mockResolvedValue({ success: true, message: "ok" });

			await strategy.createAgent(baseParams);
			await vi.advanceTimersByTimeAsync(7000);

			expect(mockSendToUser).toHaveBeenCalledWith(
				"user-1",
				"org-1",
				expect.objectContaining({
					type: "agent_creation_failed",
					data: expect.objectContaining({
						error: expect.stringContaining("RuntimeError"),
					}),
				}),
			);
		});
	});

	describe("shell-first 'Saved' progress event", () => {
		const shellParams = {
			...baseParams,
			targetAgentEid: "shell-eid-1",
			shellAlreadyCreated: true,
		};

		it("emits a Saved agent_creation_progress event right after shell handoff", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});
			mockPollExecution.mockResolvedValue([]);

			await strategy.createAgent(shellParams);

			// The Saved event fires synchronously in createAgent before pollInBackground,
			// so it must be visible without advancing timers.
			const savedCall = mockSendToUser.mock.calls.find(
				(c) =>
					c[2]?.type === "agent_creation_progress" &&
					c[2]?.data?.step_label === "Saved",
			);
			expect(savedCall).toBeTruthy();
			expect(savedCall?.[2].data).toMatchObject({
				step_type: "shell_created",
				step_label: "Saved",
			});
		});

		it("does NOT emit a Saved event for user-initiated UPDATE (shellAlreadyCreated=false)", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});
			mockPollExecution.mockResolvedValue([]);

			await strategy.createAgent({
				...baseParams,
				targetAgentEid: "existing-eid",
				shellAlreadyCreated: false,
			});

			const savedCall = mockSendToUser.mock.calls.find(
				(c) => c[2]?.data?.step_label === "Saved",
			);
			expect(savedCall).toBeFalsy();
		});
	});

	describe("execution_complete raw parsing robustness", () => {
		it("parses raw content that has reasoning text before a fenced JSON block", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			const innerJson = JSON.stringify({
				success: true,
				need_inputs: [],
				agent_metadata: { eid: "new-agent-eid", name: "Test Agent" },
				tasks: [],
				is_multiturn: false,
				failures: [],
			});

			// Simulates Claude-style chain-of-thought output preceding the JSON
			// fence — the legacy simple regex parser failed on this shape.
			const rawWithReasoning = [
				"I've reviewed the request and built the agent configuration.",
				"",
				"Here is the result:",
				"",
				"```json",
				innerJson,
				"```",
			].join("\n");

			mockPollExecution.mockResolvedValueOnce([]).mockResolvedValueOnce([
				{
					id: 100,
					eid: "msg-eid",
					execution_id: "exec-123",
					role: "system",
					event_type: "execution_complete",
					content: { raw: rawWithReasoning, status: "completed" },
					tenant: null,
					sys_date_created: "2026-04-10T12:00:00.000Z",
				},
			]);
			mockUpdateAgent.mockResolvedValue({ eid: "new-agent-eid" });

			await strategy.createAgent(baseParams);
			await vi.advanceTimersByTimeAsync(7000);

			const completedCall = mockSendToUser.mock.calls.find(
				(c) => c[2]?.type === "agent_creation_completed",
			);
			expect(completedCall).toBeTruthy();
			expect(completedCall?.[2].data).toMatchObject({
				agent_id: "new-agent-eid",
				agent_name: "Test Agent",
			});
		});

		it("parses raw content that is already a parsed object", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			mockPollExecution.mockResolvedValueOnce([]).mockResolvedValueOnce([
				{
					id: 100,
					eid: "msg-eid",
					execution_id: "exec-123",
					role: "system",
					event_type: "execution_complete",
					content: {
						raw: {
							success: true,
							need_inputs: [],
							agent_metadata: { eid: "obj-agent-eid", name: "Test Agent" },
							tasks: [],
							is_multiturn: false,
							failures: [],
						},
						status: "completed",
					},
					tenant: null,
					sys_date_created: "2026-04-10T12:00:00.000Z",
				},
			]);
			mockUpdateAgent.mockResolvedValue({ eid: "obj-agent-eid" });

			await strategy.createAgent(baseParams);
			await vi.advanceTimersByTimeAsync(7000);

			const completedCall = mockSendToUser.mock.calls.find(
				(c) => c[2]?.type === "agent_creation_completed",
			);
			expect(completedCall?.[2].data.agent_id).toBe("obj-agent-eid");
		});

		it("falls back to targetAgentEid when meta-agent omits agent_metadata.eid (shell-first UPDATE)", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			mockPollExecution.mockResolvedValueOnce([]).mockResolvedValueOnce([
				buildExecCompleteMessage({
					success: true,
					need_inputs: [],
					// agent_metadata absent — meta-agent only patched tasks in UPDATE mode
					tasks: [],
					is_multiturn: false,
					failures: [],
				}),
			]);

			await strategy.createAgent({
				...baseParams,
				targetAgentEid: "shell-eid-fallback",
				shellAlreadyCreated: true,
			});
			await vi.advanceTimersByTimeAsync(7000);

			const completedCall = mockSendToUser.mock.calls.find(
				(c) => c[2]?.type === "agent_creation_completed",
			);
			expect(completedCall?.[2].data.agent_id).toBe("shell-eid-fallback");
		});
	});

	describe("shell-first rollback on meta-agent failure", () => {
		const shellParams = {
			...baseParams,
			targetAgentEid: "shell-eid-1",
			shellAlreadyCreated: true,
		};

		it("calls deleteAgent when execution_error arrives for a shell-first create", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			mockPollExecution
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([
					buildExecErrorMessage("RuntimeError", "Meta-agent exploded"),
				]);
			mockDeleteAgent.mockResolvedValue({ success: true, message: "ok" });

			await strategy.createAgent(shellParams);
			await vi.advanceTimersByTimeAsync(7000);

			expect(mockDeleteAgent).toHaveBeenCalledTimes(1);
			expect(mockDeleteAgent).toHaveBeenCalledWith("shell-eid-1");

			// User-visible error does NOT mention orphan since cleanup succeeded.
			const failedCall = mockSendToUser.mock.calls.find(
				(c) => c[2]?.type === "agent_creation_failed",
			);
			expect(failedCall?.[2].data.error).not.toContain("draft may appear");
		});

		it("calls deleteAgent when execution_complete reports success: false", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			mockPollExecution.mockResolvedValueOnce([]).mockResolvedValueOnce([
				buildExecCompleteMessage({
					success: false,
					need_inputs: [],
					error_message: "Could not generate instructions",
					failures: ["prompt too long"],
					agent_metadata: {},
					tasks: [],
					is_multiturn: false,
				}),
			]);
			mockDeleteAgent.mockResolvedValue({ success: true, message: "ok" });

			await strategy.createAgent(shellParams);
			await vi.advanceTimersByTimeAsync(7000);

			expect(mockDeleteAgent).toHaveBeenCalledWith("shell-eid-1");
		});

		it("tags the SSE error message when deleteAgent itself fails", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			mockPollExecution
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([
					buildExecErrorMessage("RuntimeError", "Meta-agent exploded"),
				]);
			mockDeleteAgent.mockRejectedValue(new Error("DELETE failed"));

			await strategy.createAgent(shellParams);
			await vi.advanceTimersByTimeAsync(7000);

			expect(mockDeleteAgent).toHaveBeenCalledWith("shell-eid-1");

			const failedCall = mockSendToUser.mock.calls.find(
				(c) => c[2]?.type === "agent_creation_failed",
			);
			expect(failedCall?.[2].data.error).toContain("draft may appear");
		});

		it("does NOT call deleteAgent on failure for user-initiated UPDATE (shellAlreadyCreated=false)", async () => {
			// User is editing their own existing agent — the shell is theirs,
			// not one RITA just created, so we must never delete it on failure.
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			mockPollExecution
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([
					buildExecErrorMessage("RuntimeError", "Meta-agent exploded"),
				]);

			await strategy.createAgent({
				...baseParams,
				targetAgentEid: "user-owned-agent",
				shellAlreadyCreated: false,
			});
			await vi.advanceTimersByTimeAsync(7000);

			expect(mockDeleteAgent).not.toHaveBeenCalled();
		});
	});
});
