import { useCallback } from "react";
import { useConversationStarterGenerationStore } from "@/stores/conversationStarterGenerationStore";
import { useGenerateConversationStartersMutation } from "./api/useAgents";

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

				if (response.starters.length > 0) {
					store.receiveResult({ starters: response.starters });
				} else {
					store.receiveError("No conversation starters generated");
				}
			} catch (err: any) {
				store.receiveError(
					err?.message || "Failed to generate conversation starters",
				);
			}
		},
		[generateMutation, store],
	);

	return {
		generate,
		status: store.status,
		isGenerating: generateMutation.isPending,
		generatedStarters: store.generatedStarters,
		reset: store.reset,
	};
}
