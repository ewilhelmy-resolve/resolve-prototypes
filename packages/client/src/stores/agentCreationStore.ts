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

/**
 * Distinguishes a brand-new agent (create) from an edit against an existing
 * one (update). Drives copy, CTA targets, and cache-invalidation behavior
 * downstream of a success SSE.
 */
export type CreationMode = "create" | "update";

interface AgentCreationState {
	creationId: string | null;
	executionId: string | null;
	status: CreationStatus;
	mode: CreationMode;
	executionSteps: ExecutionStep[];
	inputMessage: string | null;
	agentId: string | null;
	agentName: string | null;
	error: string | null;

	startCreation: (creationId?: string, mode?: CreationMode) => void;
	setWorkflowIds: (creationId: string) => void;
	receiveProgress: (step: ExecutionStep) => void;
	receiveInputRequired: (message: string, executionId: string) => void;
	resumeCreation: () => void;
	receiveResult: (data: {
		agentId: string;
		agentName: string;
		mode?: CreationMode;
	}) => void;
	receiveError: (error: string) => void;
	timeout: () => void;
	reset: () => void;
}

export const useAgentCreationStore = create<AgentCreationState>((set) => ({
	creationId: null,
	executionId: null,
	status: "idle",
	mode: "create",
	executionSteps: [],
	inputMessage: null,
	agentId: null,
	agentName: null,
	error: null,

	startCreation: (creationId?: string, mode: CreationMode = "create") =>
		set({
			creationId: creationId || null,
			executionId: null,
			status: "creating",
			mode,
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
		set((state) => ({
			status: "success",
			agentId: data.agentId,
			agentName: data.agentName,
			// Prefer the mode the server emits (authoritative) — fall back to the
			// mode we set at start so the UI copy stays consistent if the server
			// emits legacy events without the field.
			mode: data.mode ?? state.mode,
		})),

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
			mode: "create",
			executionSteps: [],
			inputMessage: null,
			agentId: null,
			agentName: null,
			error: null,
		}),
}));
