import { MOCK_V4_AGENTS, type MockAgent } from "@/data/mock-v4-agents";
import type { AgentRun } from "@/stores/clusterAgentStore";
import type { ClusterDetails } from "@/types/cluster";

export interface AgentSuggestion {
	agent: MockAgent;
	/** Cluster signals the system inferred */
	reasons: string[];
	/** Skill IDs that should be downweighted/skipped based on prior feedback */
	dampenedSkills: { skillId: string; skillName: string; badCount: number }[];
}

/**
 * Count how often each skill has been flagged as failed across ALL runs in the
 * store — used to downweight skills that consistently underperform.
 */
function countFailedSkills(
	allRuns: AgentRun[],
): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const run of allRuns) {
		const flagged = run.feedback?.failedSkills;
		if (!flagged) continue;
		for (const id of flagged) {
			counts[id] = (counts[id] ?? 0) + 1;
		}
	}
	return counts;
}

/**
 * Pick a suggested agent archetype for a cluster based on simple signals.
 * Deliberately lightweight — this is a prototype mock, not a real model.
 */
export function suggestAgentForCluster(
	cluster: ClusterDetails,
	allRuns: AgentRun[],
): AgentSuggestion {
	const reasons: string[] = [];
	let archetype: MockAgent["archetype"] = "diagnosis";

	const nameLower = cluster.name.toLowerCase();
	const ticketCount = cluster.ticket_count;
	const kbStatus = cluster.kb_status;

	// Heuristic #1 — KB gap → data collection first
	if (kbStatus === "GAP") {
		archetype = "data-collection";
		reasons.push(
			"No knowledge coverage for this cluster — gather context before acting",
		);
	}
	// Heuristic #2 — high-volume + KB found → resolution
	else if (kbStatus === "FOUND" && ticketCount >= 50) {
		archetype = "resolution";
		reasons.push(
			`${ticketCount.toLocaleString()} tickets + matching KB article — auto-resolve candidate`,
		);
	}
	// Heuristic #3 — name contains routing signals → triage
	else if (/route|assign|priority|escalation/i.test(nameLower)) {
		archetype = "triage";
		reasons.push("Cluster name suggests routing / classification work");
	}
	// Default → diagnosis
	else {
		archetype = "diagnosis";
		reasons.push(
			"Mixed-content cluster — start with diagnosis to narrow root cause",
		);
	}

	// Volume signal
	if (ticketCount >= 100) {
		reasons.push(
			`High volume (${ticketCount.toLocaleString()} tickets) — automation will have big impact`,
		);
	} else if (ticketCount < 10) {
		reasons.push(
			"Low ticket volume — dry-run more times before automating",
		);
	}

	const agent =
		MOCK_V4_AGENTS.find((a) => a.archetype === archetype) ?? MOCK_V4_AGENTS[0];

	// Feedback signal — dampen skills flagged repeatedly
	const badCounts = countFailedSkills(allRuns);
	const dampenedSkills = agent.skills
		.map((s) => ({
			skillId: s.id,
			skillName: s.name,
			badCount: badCounts[s.id] ?? 0,
		}))
		.filter((s) => s.badCount >= 2);

	return { agent, reasons, dampenedSkills };
}
