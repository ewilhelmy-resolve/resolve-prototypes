import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ExecutionStep } from "./agentCreationStore";

type ImprovementStatus = "idle" | "improving" | "success" | "error";

interface InstructionsImprovementState {
	improvementId: string | null;
	status: ImprovementStatus;
	progressSteps: ExecutionStep[];
	originalInstructions: string | null;
	improvedInstructions: string | null;
	error: string | null;

	startImprovement: (originalInstructions: string) => void;
	setImprovementId: (id: string) => void;
	receiveProgress: (step: ExecutionStep) => void;
	receiveResult: (data: { instructions: string }) => void;
	receiveError: (error: string) => void;
	timeout: () => void;
	reset: () => void;
}

export const useInstructionsImprovementStore =
	create<InstructionsImprovementState>()(
		devtools(
			(set) => ({
				improvementId: null,
				status: "idle",
				progressSteps: [],
				originalInstructions: null,
				improvedInstructions: null,
				error: null,

				startImprovement: (originalInstructions: string) =>
					set({
						improvementId: null,
						status: "improving",
						progressSteps: [],
						originalInstructions,
						improvedInstructions: null,
						error: null,
					}),

				setImprovementId: (id: string) => set({ improvementId: id }),

				receiveProgress: (step: ExecutionStep) =>
					set((state) => ({
						progressSteps: [...state.progressSteps, step],
					})),

				receiveResult: (data: { instructions: string }) =>
					set({
						status: "success",
						improvedInstructions: data.instructions,
					}),

				receiveError: (error: string) =>
					set({
						status: "error",
						error,
					}),

				timeout: () =>
					set({
						status: "error",
						error: "Improvement timed out. Please try again.",
					}),

				reset: () =>
					set({
						improvementId: null,
						status: "idle",
						progressSteps: [],
						originalInstructions: null,
						improvedInstructions: null,
						error: null,
					}),
			}),
			{ name: "instructions-improvement" },
		),
	);
