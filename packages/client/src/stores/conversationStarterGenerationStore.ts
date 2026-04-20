import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ExecutionStep } from "./agentCreationStore";

type GenerationStatus = "idle" | "generating" | "success" | "error";

interface ConversationStarterGenerationState {
	generationId: string | null;
	status: GenerationStatus;
	progressSteps: ExecutionStep[];
	generatedStarters: string[] | null;
	error: string | null;

	startGeneration: () => void;
	setGenerationId: (id: string) => void;
	receiveProgress: (step: ExecutionStep) => void;
	receiveResult: (data: { starters: string[] }) => void;
	receiveError: (error: string) => void;
	timeout: () => void;
	reset: () => void;
}

export const useConversationStarterGenerationStore =
	create<ConversationStarterGenerationState>()(
		devtools(
			(set) => ({
				generationId: null,
				status: "idle",
				progressSteps: [],
				generatedStarters: null,
				error: null,

				startGeneration: () =>
					set({
						generationId: null,
						status: "generating",
						progressSteps: [],
						generatedStarters: null,
						error: null,
					}),

				setGenerationId: (id: string) => set({ generationId: id }),

				receiveProgress: (step: ExecutionStep) =>
					set((state) => ({
						progressSteps: [...state.progressSteps, step],
					})),

				receiveResult: (data: { starters: string[] }) =>
					set({
						status: "success",
						generatedStarters: data.starters,
					}),

				receiveError: (error: string) =>
					set({
						status: "error",
						error,
					}),

				timeout: () =>
					set({
						status: "error",
						error: "Generation timed out. Please try again.",
					}),

				reset: () =>
					set({
						generationId: null,
						status: "idle",
						progressSteps: [],
						generatedStarters: null,
						error: null,
					}),
			}),
			{ name: "conversation-starter-generation" },
		),
	);
