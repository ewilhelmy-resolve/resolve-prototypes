import { useCallback, useEffect, useRef } from "react";
import { useInstructionsImprovementStore } from "@/stores/instructionsImprovementStore";
import { useImproveInstructionsMutation } from "./api/useAgents";

const IMPROVEMENT_TIMEOUT_MS = 120_000; // 2 minutes

interface ImproveInstructionsData {
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

export function useImproveInstructions() {
	const store = useInstructionsImprovementStore();
	const improveMutation = useImproveInstructionsMutation();
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearTimeoutRef = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	const improve = useCallback(
		async (data: ImproveInstructionsData) => {
			store.startImprovement(data.instructions);

			try {
				const response = await improveMutation.mutateAsync({
					instructions: data.instructions,
					agentConfig: {
						name: data.name,
						description: data.description,
						agentType: data.agentType,
						conversationStarters: data.conversationStarters,
						guardrails: data.guardrails,
						workflows: data.workflows,
						knowledgeSources: data.knowledgeSources,
						capabilities: data.capabilities,
					},
				});

				store.setImprovementId(response.executionRequestId);

				// Safety-net timeout
				clearTimeoutRef();
				timeoutRef.current = setTimeout(() => {
					const currentStore = useInstructionsImprovementStore.getState();
					if (currentStore.status === "improving") {
						currentStore.timeout();
					}
				}, IMPROVEMENT_TIMEOUT_MS);
			} catch (err: any) {
				store.receiveError(
					err?.message || "Failed to start instruction improvement",
				);
			}
		},
		[improveMutation, store, clearTimeoutRef],
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
		improve,
		status: store.status,
		isImproving: improveMutation.isPending,
		reset: store.reset,
	};
}
