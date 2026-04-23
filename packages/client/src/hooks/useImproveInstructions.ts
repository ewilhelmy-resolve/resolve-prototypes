import { useCallback } from "react";
import { useInstructionsImprovementStore } from "@/stores/instructionsImprovementStore";
import { useImproveInstructionsMutation } from "./api/useAgents";

interface ImproveInstructionsData {
	name: string;
	description: string;
	instructions: string;
	agentType?: string | null;
	tools?: string[];
	conversationStarters?: string[];
	guardrails?: string[];
	knowledgeSources?: string[];
	capabilities?: { webSearch?: boolean; imageGeneration?: boolean };
}

export function useImproveInstructions() {
	const store = useInstructionsImprovementStore();
	const improveMutation = useImproveInstructionsMutation();

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
						tools: data.tools,
						knowledgeSources: data.knowledgeSources,
						capabilities: data.capabilities,
					},
				});

				store.receiveResult({ instructions: response.instructions });
			} catch (err: any) {
				store.receiveError(err?.message || "Failed to improve instructions");
			}
		},
		[improveMutation, store],
	);

	return {
		improve,
		status: store.status,
		isImproving: improveMutation.isPending,
		reset: store.reset,
	};
}
