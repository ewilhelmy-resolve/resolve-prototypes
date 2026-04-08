import { type FeatureEpic, type Phase, usePhaseStore } from "@/stores/phaseStore";

const PHASE_ORDER: Record<Phase, number> = {
	v1: 1,
	v2: 2,
	v3: 3,
};

/**
 * Returns true if the epic's current phase >= the minimum required phase.
 */
export function usePhaseGate(epic: FeatureEpic, minPhase: Phase): boolean {
	const currentPhase = usePhaseStore((state) => state.phases[epic]);
	return PHASE_ORDER[currentPhase] >= PHASE_ORDER[minPhase];
}
