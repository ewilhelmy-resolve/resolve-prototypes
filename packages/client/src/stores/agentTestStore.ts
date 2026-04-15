import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ExecutionStep } from "./agentCreationStore";

type AgentTestStatus = "idle" | "executing" | "success" | "error";

interface AgentTestState {
	executionRequestId: string | null;
	status: AgentTestStatus;
	progressSteps: ExecutionStep[];
	response: string | null;
	error: string | null;

	startExecution: () => void;
	setExecutionRequestId: (id: string) => void;
	receiveProgress: (step: ExecutionStep) => void;
	receiveResult: (content: string) => void;
	receiveError: (error: string) => void;
	reset: () => void;
}

export const useAgentTestStore = create<AgentTestState>()(
	devtools(
		(set) => ({
			executionRequestId: null,
			status: "idle",
			progressSteps: [],
			response: null,
			error: null,

			startExecution: () =>
				set({
					executionRequestId: null,
					status: "executing",
					progressSteps: [],
					response: null,
					error: null,
				}),

			setExecutionRequestId: (id: string) => set({ executionRequestId: id }),

			receiveProgress: (step: ExecutionStep) =>
				set((state) => ({
					progressSteps: [...state.progressSteps, step],
				})),

			receiveResult: (content: string) =>
				set({
					status: "success",
					response: content,
				}),

			receiveError: (error: string) =>
				set({
					status: "error",
					error,
				}),

			reset: () =>
				set({
					executionRequestId: null,
					status: "idle",
					progressSteps: [],
					response: null,
					error: null,
				}),
		}),
		{ name: "agent-test" },
	),
);
