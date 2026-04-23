import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface AgentRunFeedback {
	/** Skill IDs the user flagged as wrong or unhelpful */
	failedSkills: string[];
	/** Freeform note from the user */
	note: string;
}

export interface AgentRun {
	id: string;
	clusterId: string;
	ticketId: string;
	ticketExternalId?: string;
	agentId: string;
	startedAt: string;
	/** Dry-run = simulation, live = actually executed (v4 MVP = dry only) */
	mode: "dry" | "live";
	/** Human rating — null until user rates it */
	rating: "good" | "bad" | null;
	/** Skill-level simulation output for display in run history */
	skillOutputs: { skillId: string; summary: string }[];
	/** Structured feedback captured when user rates bad */
	feedback?: AgentRunFeedback;
}

interface ClusterAgentState {
	/** clusterId → attached agentId */
	bindings: Record<string, string>;
	/** clusterId → automation enabled */
	automation: Record<string, boolean>;
	/** clusterId → run history (newest last) */
	runs: Record<string, AgentRun[]>;

	attachAgent: (clusterId: string, agentId: string) => void;
	detachAgent: (clusterId: string) => void;
	setAutomation: (clusterId: string, enabled: boolean) => void;
	appendRun: (clusterId: string, run: AgentRun) => void;
	rateRun: (
		clusterId: string,
		runId: string,
		rating: "good" | "bad" | null,
	) => void;
	setRunFeedback: (
		clusterId: string,
		runId: string,
		feedback: AgentRunFeedback,
	) => void;
}

export const useClusterAgentStore = create<ClusterAgentState>()(
	devtools(
		persist(
			(set) => ({
				bindings: {},
				automation: {},
				runs: {},

				attachAgent: (clusterId, agentId) =>
					set((state) => ({
						bindings: { ...state.bindings, [clusterId]: agentId },
					})),
				detachAgent: (clusterId) =>
					set((state) => {
						const { [clusterId]: _, ...rest } = state.bindings;
						return { bindings: rest };
					}),
				setAutomation: (clusterId, enabled) =>
					set((state) => ({
						automation: { ...state.automation, [clusterId]: enabled },
					})),
				appendRun: (clusterId, run) =>
					set((state) => ({
						runs: {
							...state.runs,
							[clusterId]: [...(state.runs[clusterId] ?? []), run],
						},
					})),
				rateRun: (clusterId, runId, rating) =>
					set((state) => ({
						runs: {
							...state.runs,
							[clusterId]: (state.runs[clusterId] ?? []).map((r) =>
								r.id === runId ? { ...r, rating } : r,
							),
						},
					})),
				setRunFeedback: (clusterId, runId, feedback) =>
					set((state) => ({
						runs: {
							...state.runs,
							[clusterId]: (state.runs[clusterId] ?? []).map((r) =>
								r.id === runId ? { ...r, feedback } : r,
							),
						},
					})),
			}),
			{ name: "rita-cluster-agent-store" },
		),
		{ name: "rita-cluster-agent-store" },
	),
);
