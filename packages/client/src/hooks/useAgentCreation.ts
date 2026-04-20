import { useCallback, useEffect, useRef } from "react";
import { useGenerateAgent } from "@/hooks/api/useAgents";
import { useAgentCreationStore } from "@/stores/agentCreationStore";

// Safety-net only. The server is the source of truth: it always emits a
// terminal SSE event (completed / failed / its own timeout) within ~5 min.
// This local timeout only fires if the server's SSE never arrives at all —
// e.g. API crash, dropped EventSource, browser sleep. Keep it well above the
// server's budget so normal late completions are never misreported as timeouts.
const CREATION_TIMEOUT_MS = 600_000; // 10 minutes

interface CreateInput {
	name: string;
	description?: string;
	instructions?: string;
	iconId?: string;
	iconColorId?: string;
	conversationStarters?: string[];
	guardrails?: string[];
	/**
	 * When present, the server routes this through AgentRitaDeveloper in
	 * UPDATE mode against the referenced agent. Also flips the local store
	 * mode so the overlay shows "Agent updated" copy on success.
	 */
	targetAgentEid?: string;
	/**
	 * Optional free-form change request. Ignored server-side when
	 * `targetAgentEid` is absent (i.e. create mode).
	 */
	updatePrompt?: string;
	/**
	 * When true, the server auto-generates the description from the submitted
	 * instructions. Set when the user left description blank (CREATE) or
	 * didn't edit it (UPDATE expensive path).
	 */
	generateDescription?: boolean;
}

/**
 * Orchestration hook for agent creation and update-via-AI.
 *
 * Calls POST /api/agents/generate, gets a creationId, then waits for
 * SSE events (progress, completed, failed, input_required). The backend
 * discriminates create vs update via the optional `targetAgentEid` field.
 */
export function useAgentCreation() {
	const generateAgent = useGenerateAgent();
	const store = useAgentCreationStore();
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

	const create = useCallback(
		async (formData: CreateInput) => {
			store.startCreation(
				undefined,
				formData.targetAgentEid ? "update" : "create",
			);

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
		mode: store.mode,
		creationId: store.creationId,
		executionId: store.executionId,
		executionSteps: store.executionSteps,
		inputMessage: store.inputMessage,
		agentId: store.agentId,
		agentName: store.agentName,
		error: store.error,
		isCreating:
			generateAgent.isPending ||
			store.status === "creating" ||
			store.status === "awaiting_input",
		reset: store.reset,
	};
}
