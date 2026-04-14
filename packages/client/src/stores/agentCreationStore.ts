import { create } from "zustand";

export interface ExecutionStep {
	stepType: string;
	stepLabel: string;
	stepDetail: string;
	stepIndex?: number;
	totalSteps?: number;
	timestamp: string;
}

type CreationStatus =
	| "idle"
	| "creating"
	| "awaiting_input"
	| "success"
	| "error";

interface AgentCreationState {
	creationId: string | null;
	executionId: string | null;
	status: CreationStatus;
	executionSteps: ExecutionStep[];
	inputMessage: string | null;
	agentId: string | null;
	agentName: string | null;
	error: string | null;

	startCreation: (creationId?: string) => void;
	setWorkflowIds: (creationId: string) => void;
	receiveProgress: (step: ExecutionStep) => void;
	receiveInputRequired: (message: string, executionId: string) => void;
	resumeCreation: () => void;
	receiveResult: (data: { agentId: string; agentName: string }) => void;
	receiveError: (error: string) => void;
	timeout: () => void;
	reset: () => void;
}

export const useAgentCreationStore = create<AgentCreationState>((set) => ({
	creationId: null,
	executionId: null,
	status: "idle",
	executionSteps: [],
	inputMessage: null,
	agentId: null,
	agentName: null,
	error: null,

	startCreation: (creationId?: string) =>
		set({
			creationId: creationId || null,
			executionId: null,
			status: "creating",
			executionSteps: [],
			inputMessage: null,
			agentId: null,
			agentName: null,
			error: null,
		}),

	setWorkflowIds: (creationId) =>
		set({
			creationId,
		}),

	receiveProgress: (step) =>
		set((state) => ({
			executionSteps: [...state.executionSteps, step],
		})),

	receiveInputRequired: (message, executionId) =>
		set({
			status: "awaiting_input",
			inputMessage: message,
			executionId,
		}),

	resumeCreation: () =>
		set({
			status: "creating",
			inputMessage: null,
		}),

	receiveResult: (data) =>
		set({
			status: "success",
			agentId: data.agentId,
			agentName: data.agentName,
		}),

	receiveError: (error) =>
		set({
			status: "error",
			error,
		}),

	timeout: () =>
		set({
			status: "error",
			error: "Creation timed out. Please try again.",
		}),

	reset: () =>
		set({
			creationId: null,
			executionId: null,
			status: "idle",
			executionSteps: [],
			inputMessage: null,
			agentId: null,
			agentName: null,
			error: null,
		}),
}));
