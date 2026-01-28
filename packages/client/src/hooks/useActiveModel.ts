import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { clusterKeys } from "@/hooks/useClusters";
import { mlModelsApi } from "@/services/api";
import type { TrainingState } from "@/types/mlModel";

const POLLING_INTERVAL = 10000; // 10 seconds

// Query Keys
export const mlModelKeys = {
	all: ["ml-models"] as const,
	active: () => [...mlModelKeys.all, "active"] as const,
};

/**
 * Hook to fetch the active ML model for the organization
 * Polls every 10s when training is in progress
 * Invalidates clusters query when training completes
 */
export function useActiveModel() {
	const queryClient = useQueryClient();
	const previousStateRef = useRef<TrainingState | undefined>();

	const query = useQuery({
		queryKey: mlModelKeys.active(),
		queryFn: async () => {
			const response = await mlModelsApi.getActive();
			return response.data;
		},
		staleTime: 5000,
		refetchInterval: (query) => {
			const trainingState = query.state.data?.metadata?.training_state;
			return trainingState === "in_progress" ? POLLING_INTERVAL : false;
		},
	});

	// Invalidate clusters when training state transitions to complete
	const currentState = query.data?.metadata?.training_state;

	useEffect(() => {
		if (
			previousStateRef.current === "in_progress" &&
			currentState === "complete"
		) {
			queryClient.invalidateQueries({ queryKey: clusterKeys.all });
		}
		previousStateRef.current = currentState;
	}, [currentState, queryClient]);

	return query;
}
