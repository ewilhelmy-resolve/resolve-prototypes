import type { NavigateFunction } from "react-router-dom";
import { MOCK_V4_AGENTS } from "@/data/mock-v4-agents";
import {
	type AgentRun,
	useClusterAgentStore,
} from "@/stores/clusterAgentStore";
import { usePhaseStore } from "@/stores/phaseStore";
import { usePresenterStore } from "@/stores/presenterStore";

/** Clusters used by the demo script (IDs come from mock-clusters.ts). */
export const DEMO_CLUSTERS = {
	a: "cl-002", // Password Reset — KB FOUND → Resolution Agent
	b: "cl-007", // MFA Setup — KB GAP → Data Collection Agent
	c: "cl-008", // Printer Config — KB GAP → Data Collection (will show flagged skill)
} as const;

interface StepCtx {
	navigate: NavigateFunction;
}

export interface DemoStep {
	title: string;
	line: string;
	onEnter?: (ctx: StepCtx) => void;
}

const resolutionAgent = MOCK_V4_AGENTS.find(
	(a) => a.archetype === "resolution",
);
const dataCollectionAgent = MOCK_V4_AGENTS.find(
	(a) => a.archetype === "data-collection",
);

function seedBaselineState() {
	// Ensure tickets phase = v4 for the demo
	usePhaseStore.getState().setPhase("tickets", "v4");

	// Clear any prior demo state on the three demo clusters
	const store = useClusterAgentStore.getState();
	for (const id of Object.values(DEMO_CLUSTERS)) {
		store.detachAgent(id);
		store.setAutomation(id, false);
	}
	// Wipe runs map entries for the demo clusters
	useClusterAgentStore.setState((s) => ({
		runs: Object.fromEntries(
			Object.entries(s.runs).filter(
				([k]) => !Object.values(DEMO_CLUSTERS).includes(k as never),
			),
		),
	}));
}

function seedPriorFeedback() {
	// Pretend the team already ran + flagged a skill on an unrelated cluster,
	// so when we get to cluster C, the suggestion reflects that.
	if (!dataCollectionAgent) return;
	const flaggedSkill = dataCollectionAgent.skills[1]; // "Ask user follow-ups"
	const runs: AgentRun[] = [
		{
			id: "demo-seed-1",
			clusterId: "cl-seed-history",
			ticketId: "tkt-seed-1",
			ticketExternalId: "INC009001",
			agentId: dataCollectionAgent.id,
			startedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
			mode: "dry",
			rating: "bad",
			skillOutputs: dataCollectionAgent.skills.map((s) => ({
				skillId: s.id,
				summary: s.dryRunSummary,
			})),
			feedback: {
				failedSkills: [flaggedSkill.id],
				note: "User follow-up was too generic; asked for info we already had.",
			},
		},
		{
			id: "demo-seed-2",
			clusterId: "cl-seed-history",
			ticketId: "tkt-seed-2",
			ticketExternalId: "INC009014",
			agentId: dataCollectionAgent.id,
			startedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
			mode: "dry",
			rating: "bad",
			skillOutputs: dataCollectionAgent.skills.map((s) => ({
				skillId: s.id,
				summary: s.dryRunSummary,
			})),
			feedback: {
				failedSkills: [flaggedSkill.id],
				note: "Same issue — duplicate follow-up question.",
			},
		},
	];
	useClusterAgentStore.setState((s) => ({
		runs: { ...s.runs, "cl-seed-history": runs },
	}));
}

/** Ticket IDs to run on per cluster. Match mock-clusters.ts. */
const DEMO_TICKETS = {
	[DEMO_CLUSTERS.a]: {
		ticketId: "tkt-002",
		externalId: "INC001002",
		title: "Forgot my password",
	},
	[DEMO_CLUSTERS.b]: {
		ticketId: "tkt-007",
		externalId: "INC001007",
		title: "New MFA device won't enroll",
	},
	[DEMO_CLUSTERS.c]: {
		ticketId: "tkt-008",
		externalId: "INC001008",
		title: "Printer won't connect after move",
	},
} as const;

export const DEMO_STEPS: DemoStep[] = [
	{
		title: "The ticket wall",
		line: "Customers see hundreds of clusters. Each one needs a different automation. How do they choose?",
		onEnter: ({ navigate }) => {
			seedBaselineState();
			seedPriorFeedback();
			navigate("/tickets");
		},
	},
	{
		title: "Rita reads the cluster",
		line: "Password Reset, KB article found, high volume. The system proposes Resolution Agent with reasoning.",
		onEnter: ({ navigate }) => {
			useClusterAgentStore.getState().detachAgent(DEMO_CLUSTERS.a);
			navigate(`/tickets/${DEMO_CLUSTERS.a}`);
		},
	},
	{
		title: "One click to attach",
		line: "We accept the suggestion. Nothing destructive yet — the agent is attached but automation is off.",
		onEnter: () => {
			if (resolutionAgent) {
				useClusterAgentStore
					.getState()
					.attachAgent(DEMO_CLUSTERS.a, resolutionAgent.id);
			}
		},
	},
	{
		title: "Simulate on a real ticket",
		line: "Skills fire one at a time. Nothing actually happened — this is a dry run. The team reviews what the agent would do.",
		onEnter: () => {
			const t = DEMO_TICKETS[DEMO_CLUSTERS.a];
			usePresenterStore.getState().setScriptedOpenTicket({
				ticketId: t.ticketId,
				externalId: t.externalId,
				title: t.title,
			});
		},
	},
	{
		title: "Thumbs up trains trust",
		line: "The reviewer rates it. Every rating feeds the agent's trust score. Five out of six good? Start automating.",
		onEnter: () => {
			const t = DEMO_TICKETS[DEMO_CLUSTERS.a];
			usePresenterStore.getState().setScriptedOpenTicket({
				ticketId: t.ticketId,
				externalId: t.externalId,
				title: t.title,
				skipAnimation: true,
				autoRate: "good",
			});
		},
	},
	{
		title: "Turn it on",
		line: "Automation is now live for this cluster. New tickets that match will be handled without human review.",
		onEnter: () => {
			useClusterAgentStore.getState().setAutomation(DEMO_CLUSTERS.a, true);
			usePresenterStore.getState().clearScriptedOpenTicket();
		},
	},
	{
		title: "Different cluster, different suggestion",
		line: "MFA Setup has no KB article — so Rita suggests Data Collection first. Gather context before acting.",
		onEnter: ({ navigate }) => {
			navigate(`/tickets/${DEMO_CLUSTERS.b}`);
		},
	},
	{
		title: "When it's wrong, say why",
		line: "Reviewer flags the skill that was off + leaves a note. Structured feedback, not just 'thumbs down'.",
		onEnter: () => {
			if (dataCollectionAgent) {
				useClusterAgentStore
					.getState()
					.attachAgent(DEMO_CLUSTERS.b, dataCollectionAgent.id);
			}
			const t = DEMO_TICKETS[DEMO_CLUSTERS.b];
			usePresenterStore.getState().setScriptedOpenTicket({
				ticketId: t.ticketId,
				externalId: t.externalId,
				title: t.title,
				skipAnimation: true,
				autoRate: "bad",
			});
		},
	},
	{
		title: "Feedback shapes the next suggestion",
		line: "New cluster, same archetype — but the flagged skill is downweighted. Every thumbs down improves the next recommendation.",
		onEnter: ({ navigate }) => {
			usePresenterStore.getState().clearScriptedOpenTicket();
			navigate(`/tickets/${DEMO_CLUSTERS.c}`);
		},
	},
	{
		title: "That's the loop",
		line: "Suggest → simulate → rate → automate → learn. Each cluster teaches the next one. Humans stay in the loop; automation earns its way in.",
	},
];
