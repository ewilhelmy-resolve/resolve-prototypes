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

export type EvalTestMethod = "skill-success" | "quality" | "similarity";

export interface EvalCase {
	id: string;
	ticketId: string;
	ticketExternalId?: string;
	/** The "question" — equivalent to ticket subject */
	question: string;
	/** The agent's generated response (markdown-ish summary) */
	agentResponse: string;
	testMethod: EvalTestMethod;
	score: "pass" | "fail";
	/** Reviewer override after seeing detail */
	rating: "good" | "bad" | null;
	/** When score=fail, which skill broke and why (mock copy) */
	failureReason?: string;
	/** Per-skill simulated outputs for the detail panel */
	skillOutputs: {
		skillId: string;
		skillName: string;
		summary: string;
		ok: boolean;
	}[];
}

export interface EvaluationRun {
	id: string;
	clusterId: string;
	agentId: string;
	name: string;
	startedAt: string;
	completedAt?: string;
	sampleSize: number;
	testMethod: EvalTestMethod;
	status: "running" | "completed" | "cancelled";
	cases: EvalCase[];
}

/** Reviewer's choice during bulk-review side-by-side: did they trust agent or AI? */
export interface TrustVote {
	id: string;
	ticketId: string;
	ticketExternalId?: string;
	choice: "agent" | "ai";
	at: string;
}

interface ClusterAgentState {
	/** clusterId → attached agentId */
	bindings: Record<string, string>;
	/** clusterId → automation enabled */
	automation: Record<string, boolean>;
	/** clusterId → ad-hoc dry-run history (newest last) */
	runs: Record<string, AgentRun[]>;
	/** clusterId → batch evaluations (newest last) */
	evaluations: Record<string, EvaluationRun[]>;
	/** clusterId → reviewer trust votes from agent-vs-AI side-by-side */
	trustVotes: Record<string, TrustVote[]>;

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
	startEvaluation: (clusterId: string, evaluation: EvaluationRun) => void;
	completeEvaluation: (clusterId: string, evaluationId: string) => void;
	rateEvalCase: (
		clusterId: string,
		evaluationId: string,
		caseId: string,
		rating: "good" | "bad" | null,
	) => void;
	addTrustVote: (clusterId: string, vote: TrustVote) => void;
}

export const useClusterAgentStore = create<ClusterAgentState>()(
	devtools(
		persist(
			(set) => ({
				bindings: {},
				automation: {},
				runs: {},
				evaluations: {},
				trustVotes: {},

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
				startEvaluation: (clusterId, evaluation) =>
					set((state) => ({
						evaluations: {
							...state.evaluations,
							[clusterId]: [
								...(state.evaluations[clusterId] ?? []),
								evaluation,
							],
						},
					})),
				completeEvaluation: (clusterId, evaluationId) =>
					set((state) => ({
						evaluations: {
							...state.evaluations,
							[clusterId]: (state.evaluations[clusterId] ?? []).map((ev) =>
								ev.id === evaluationId
									? {
											...ev,
											status: "completed",
											completedAt: new Date().toISOString(),
										}
									: ev,
							),
						},
					})),
				rateEvalCase: (clusterId, evaluationId, caseId, rating) =>
					set((state) => ({
						evaluations: {
							...state.evaluations,
							[clusterId]: (state.evaluations[clusterId] ?? []).map((ev) =>
								ev.id === evaluationId
									? {
											...ev,
											cases: ev.cases.map((c) =>
												c.id === caseId ? { ...c, rating } : c,
											),
										}
									: ev,
							),
						},
					})),
				addTrustVote: (clusterId, vote) =>
					set((state) => ({
						trustVotes: {
							...state.trustVotes,
							[clusterId]: [
								...(state.trustVotes[clusterId] ?? []),
								vote,
							],
						},
					})),
			}),
			{ name: "rita-cluster-agent-store" },
		),
		{ name: "rita-cluster-agent-store" },
	),
);
