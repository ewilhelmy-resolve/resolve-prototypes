import { useCallback, useEffect, useRef } from "react";
import { useConversationStarterGenerationStore } from "@/stores/conversationStarterGenerationStore";
import { useGenerateConversationStartersMutation } from "./api/useAgents";

const GENERATION_TIMEOUT_MS = 120_000; // 2 minutes

interface GenerateConversationStartersData {
	name: string;
	description: string;
	instructions: string;
	agentType?: string | null;
	workflows?: string[];
	conversationStarters?: string[];
	guardrails?: string[];
	knowledgeSources?: string[];
	capabilities?: { webSearch?: boolean; imageGeneration?: boolean };
}

export function useGenerateConversationStarters() {
	const store = useConversationStarterGenerationStore();
	const generateMutation = useGenerateConversationStartersMutation();
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearTimeoutRef = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	const generate = useCallback(
		async (data: GenerateConversationStartersData) => {
			store.startGeneration();

			try {
				const response = await generateMutation.mutateAsync({
					agentConfig: {
						name: data.name,
						description: data.description,
						instructions: data.instructions,
						agentType: data.agentType,
						conversationStarters: data.conversationStarters,
						guardrails: data.guardrails,
						workflows: data.workflows,
						knowledgeSources: data.knowledgeSources,
						capabilities: data.capabilities,
					},
				});

				store.setGenerationId(response.executionRequestId);

				// Safety-net timeout
				clearTimeoutRef();
				timeoutRef.current = setTimeout(() => {
					const currentStore = useConversationStarterGenerationStore.getState();
					if (currentStore.status === "generating") {
						currentStore.timeout();
					}
				}, GENERATION_TIMEOUT_MS);
			} catch (err: any) {
				store.receiveError(
					err?.message || "Failed to start conversation starter generation",
				);
			}
		},
		[generateMutation, store, clearTimeoutRef],
	);

	// Clear timeout on terminal states
	useEffect(() => {
		if (store.status === "success" || store.status === "error") {
			clearTimeoutRef();
		}
	}, [store.status, clearTimeoutRef]);

	// Cleanup on unmount
	useEffect(() => {
		return () => clearTimeoutRef();
	}, [clearTimeoutRef]);

	return {
		generate,
		status: store.status,
		isGenerating: generateMutation.isPending,
		generatedStarters: store.generatedStarters,
		reset: store.reset,
	};
}
