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

vi.mock("../../AgenticService.js", () => ({
	AgenticService: class {
		executeAgent = mockExecuteAgent;
		pollExecution = mockPollExecution;
		stopExecution = mockStopExecution;
		updateAgent = mockUpdateAgent;
		getAgent = mockGetAgent;
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

const baseParams = {
	name: "Test Agent",
	description: "A test agent",
	instructions: "Do test things",
	iconId: "bot",
	iconColorId: "slate",
	conversationStarters: [],
	guardrails: [],
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

	describe("draft enforcement", () => {
		it("should force-update agent to draft when created as published (active: true)", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			// First poll: no messages yet
			// Second poll: execution_complete with active: true
			mockPollExecution.mockResolvedValueOnce([]).mockResolvedValueOnce([
				buildExecCompleteMessage({
					success: true,
					need_inputs: [],
					agent_metadata: {
						eid: "new-agent-eid",
						name: "Test Agent",
						active: true,
					},
					tasks: [],
					is_multiturn: false,
					failures: [],
				}),
			]);

			mockUpdateAgent.mockResolvedValue({
				eid: "new-agent-eid",
				active: false,
			});

			const result = await strategy.createAgent(baseParams);
			expect(result.mode).toBe("async");

			// Let polling run
			await vi.advanceTimersByTimeAsync(7000);

			// Should have called updateAgent to force draft
			expect(mockUpdateAgent).toHaveBeenCalledWith("new-agent-eid", {
				active: false,
				sys_updated_by: "test@example.com",
			});

			// Should still send completed SSE
			expect(mockSendToUser).toHaveBeenCalledWith(
				"user-1",
				"org-1",
				expect.objectContaining({
					type: "agent_creation_completed",
					data: expect.objectContaining({
						agent_id: "new-agent-eid",
						agent_name: "Test Agent",
					}),
				}),
			);
		});

		it("should NOT call updateAgent when agent is already draft (active: false)", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			mockPollExecution.mockResolvedValueOnce([]).mockResolvedValueOnce([
				buildExecCompleteMessage({
					success: true,
					need_inputs: [],
					agent_metadata: {
						eid: "new-agent-eid",
						name: "Test Agent",
						active: false,
					},
					tasks: [],
					is_multiturn: false,
					failures: [],
				}),
			]);

			await strategy.createAgent(baseParams);
			await vi.advanceTimersByTimeAsync(7000);

			// Should NOT have called updateAgent
			expect(mockUpdateAgent).not.toHaveBeenCalled();

			// Should still send completed SSE
			expect(mockSendToUser).toHaveBeenCalledWith(
				"user-1",
				"org-1",
				expect.objectContaining({
					type: "agent_creation_completed",
				}),
			);
		});

		it("should surface LLM execution_error as agent_creation_failed SSE", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			// First poll empty; second poll returns execution_error (real traceback shape from LLM service)
			mockPollExecution
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([
					buildExecErrorMessage(
						"ValueError",
						"[bd573538-1179-439c-b685-66abcfae4014] Missing llm_parameters\nTraceback (most recent call last):\n  File .../agents.py, line 1001, in _run_agent_background\n    raise e",
					),
				]);

			await strategy.createAgent(baseParams);
			await vi.advanceTimersByTimeAsync(7000);

			// Must NOT wait for poll timeout — terminal event handled immediately
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

			// Error message should be first line only (no traceback in UI payload)
			const failedCall = mockSendToUser.mock.calls.find(
				(c) => c[2]?.type === "agent_creation_failed",
			);
			expect(failedCall?.[2].data.error).not.toContain("Traceback");

			// No follow-up polling after terminal
			const pollCallsAfter = mockPollExecution.mock.calls.length;
			await vi.advanceTimersByTimeAsync(10000);
			expect(mockPollExecution.mock.calls.length).toBe(pollCallsAfter);
		});

		it("should also treat execution_failed as terminal failure", async () => {
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

		it("should still send completed SSE even if draft enforcement update fails", async () => {
			mockExecuteAgent.mockResolvedValue({
				executionId: "exec-123",
				conversationId: "conv-123",
				agentMetadataId: "meta-123",
			});

			mockPollExecution.mockResolvedValueOnce([]).mockResolvedValueOnce([
				buildExecCompleteMessage({
					success: true,
					need_inputs: [],
					agent_metadata: {
						eid: "new-agent-eid",
						name: "Test Agent",
						active: true,
					},
					tasks: [],
					is_multiturn: false,
					failures: [],
				}),
			]);

			mockUpdateAgent.mockRejectedValue(new Error("LLM Service unavailable"));

			await strategy.createAgent(baseParams);
			await vi.advanceTimersByTimeAsync(7000);

			// updateAgent was attempted
			expect(mockUpdateAgent).toHaveBeenCalled();

			// Should still send completed SSE despite update failure
			expect(mockSendToUser).toHaveBeenCalledWith(
				"user-1",
				"org-1",
				expect.objectContaining({
					type: "agent_creation_completed",
					data: expect.objectContaining({
						agent_id: "new-agent-eid",
					}),
				}),
			);
		});
	});
});
