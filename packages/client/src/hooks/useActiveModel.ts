import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { clusterKeys } from "@/hooks/useClusters";
import { mlModelsApi } from "@/services/api";
import type { TrainingState } from "@/types/mlModel";

const POLLING_INTERVAL = 10000; // 10 seconds
const SYNC_PENDING_POLL_INTERVAL = 2000; // 2 seconds - faster polling when sync just started
const SYNC_PENDING_DURATION = 10000; // 10 seconds - how long to poll after sync starts

// Query Keys
export const mlModelKeys = {
	all: ["ml-models"] as const,
	active: () => [...mlModelKeys.all, "active"] as const,
};

// Global flag to track when a sync was just started
// This allows useSyncTickets to signal that we should poll aggressively
let syncPendingUntil: number | null = null;

/**
 * Signal that a sync just started and we should poll for state changes
 * Called from useSyncTickets when a sync is triggered
 */
export function signalSyncStarted(): void {
	syncPendingUntil = Date.now() + SYNC_PENDING_DURATION;
}

/**
 * Hook to fetch the active ML model for the organization
 *
 * Polling behavior:
 * - Polls every 2s for 10s after a sync starts (to catch state change quickly)
 * - Polls every 10s when no model exists (waiting for sync to create one)
 * - Polls every 10s when training is in_progress
 * - Stops polling when training is complete or failed (and no pending sync)
 *
 * Also invalidates clusters query when training transitions to complete
 */
export function useActiveModel() {
	const queryClient = useQueryClient();
	const previousStateRef = useRef<TrainingState | undefined>();
	// Force re-render when syncPendingUntil changes
	const [, forceUpdate] = useState(0);

	const query = useQuery({
		queryKey: mlModelKeys.active(),
		queryFn: async () => {
			const response = await mlModelsApi.getActive();
			return response.data;
		},
		staleTime: 5000,
		refetchInterval: (query) => {
			const model = query.state.data;
			const trainingState = model?.metadata?.training_state;

			// Check if we're in the "sync just started" window
			const isSyncPending =
				syncPendingUntil !== null && Date.now() < syncPendingUntil;

			if (isSyncPending) {
				return SYNC_PENDING_POLL_INTERVAL; // Fast polling to catch state change
			}

			// Clear the pending flag if we're past the window
			if (syncPendingUntil !== null && Date.now() >= syncPendingUntil) {
				syncPendingUntil = null;
			}

			// Poll when: no model exists OR training is in progress
			// Stop polling when: training is complete or failed
			if (model === null) {
				return POLLING_INTERVAL; // No model yet, keep checking
			}
			if (trainingState === "in_progress") {
				return POLLING_INTERVAL; // Training in progress
			}
			return false; // Complete or failed, stop polling
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

	// Helper to trigger sync pending state from components
	const notifySyncStarted = useCallback(() => {
		signalSyncStarted();
		forceUpdate((n) => n + 1); // Force re-render to update refetchInterval
		queryClient.invalidateQueries({ queryKey: mlModelKeys.active() });
	}, [queryClient]);

	return {
		...query,
		notifySyncStarted,
	};
}
