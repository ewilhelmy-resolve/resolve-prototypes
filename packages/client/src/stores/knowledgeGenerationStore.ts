import { create } from "zustand";

interface KnowledgeGenerationState {
	generationId: string | null;
	status: "idle" | "generating" | "success" | "error";
	content: string | null;
	filename: string | null;
	error: string | null;
	startGeneration: (generationId: string) => void;
	receiveResult: (data: { content: string; filename: string }) => void;
	receiveError: (error: string) => void;
	timeout: () => void;
	reset: () => void;
}

export const useKnowledgeGenerationStore = create<KnowledgeGenerationState>(
	(set) => ({
		generationId: null,
		status: "idle",
		content: null,
		filename: null,
		error: null,

		startGeneration: (generationId: string) =>
			set({
				generationId,
				status: "generating",
				content: null,
				filename: null,
				error: null,
			}),

		receiveResult: (data: { content: string; filename: string }) =>
			set({
				status: "success",
				content: data.content,
				filename: data.filename,
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
				content: null,
				filename: null,
				error: null,
			}),
	}),
);
