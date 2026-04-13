import { useCallback, useEffect, useRef } from "react";
import { useGenerateAgent } from "@/hooks/api/useAgents";
import { useAgentCreationStore } from "@/stores/agentCreationStore";

const CREATION_TIMEOUT_MS = 90_000;

/**
 * Orchestration hook for agent creation.
 *
 * Calls POST /api/agents/generate, gets a creationId, then waits for
 * SSE events (progress, completed, failed, input_required).
 * Both direct and workflow modes are async.
 */
export function useAgentCreation() {
	const generateAgent = useGenerateAgent();
	const store = useAgentCreationStore();
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

	const create = useCallback(
		async (formData: {
			name: string;
			description?: string;
			instructions?: string;
			iconId?: string;
			iconColorId?: string;
			conversationStarters?: string[];
			guardrails?: string[];
		}) => {
			store.startCreation();

			try {
				const response = await generateAgent.mutateAsync(formData);

				store.setWorkflowIds(response.creationId);

				timeoutRef.current = setTimeout(() => {
					store.timeout();
				}, CREATION_TIMEOUT_MS);
			} catch (err) {
				store.receiveError(
					err instanceof Error ? err.message : "Failed to create agent",
				);
			}
		},
		[generateAgent, store],
	);

	// Clear timeout on terminal states or unmount
	useEffect(() => {
		if (store.status === "success" || store.status === "error") {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		}
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, [store.status]);

	return {
		create,
		status: store.status,
		creationId: store.creationId,
		executionId: store.executionId,
		executionSteps: store.executionSteps,
		inputMessage: store.inputMessage,
		agentId: store.agentId,
		agentName: store.agentName,
		error: store.error,
		isCreating: generateAgent.isPending,
		reset: store.reset,
	};
}
