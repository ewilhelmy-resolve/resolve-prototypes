import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type Phase = "v1" | "v2" | "v3" | "v4";

export type FeatureEpic = "tickets" | "agents";

interface PhaseState {
	phases: Record<FeatureEpic, Phase>;
	setPhase: (epic: FeatureEpic, phase: Phase) => void;
}

export const usePhaseStore = create<PhaseState>()(
	devtools(
		persist(
			(set) => ({
				phases: {
					tickets: "v3",
					agents: "v3",
				},
				setPhase: (epic, phase) =>
					set((state) => ({
						phases: { ...state.phases, [epic]: phase },
					})),
			}),
			{
				name: "rita-phase-store",
			},
		),
		{ name: "rita-phase-store" },
	),
);
