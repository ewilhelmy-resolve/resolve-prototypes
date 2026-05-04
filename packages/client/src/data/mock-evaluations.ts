import type { MockAgent } from "@/data/mock-v4-agents";
import type {
	EvalCase,
	EvalTestMethod,
	EvaluationRun,
} from "@/stores/clusterAgentStore";

/**
 * Question/response pool for mock evaluation cases. Each entry mimics what a
 * real ITSM ticket would look like, so the eval results table feels populated
 * without depending on the cluster's actual ticket data.
 */
const MOCK_QA_POOL: { externalId: string; question: string }[] = [
	{
		externalId: "INC-4021",
		question: "Cannot access shared drive after password reset",
	},
	{
		externalId: "INC-4018",
		question: "Outlook keeps crashing on startup",
	},
	{
		externalId: "INC-3995",
		question: "VPN disconnects every 10 minutes",
	},
	{
		externalId: "INC-4025",
		question: "Laptop not connecting to office WiFi",
	},
	{
		externalId: "INC-4030",
		question: "MFA token not syncing with authenticator app",
	},
	{
		externalId: "INC-4042",
		question: "Slack desktop app stuck on splash screen",
	},
	{
		externalId: "INC-4051",
		question: "Two-factor auth code never arrives via SMS",
	},
	{
		externalId: "INC-4055",
		question: "Cannot install required corporate certificate",
	},
	{
		externalId: "INC-4062",
		question: "Zoom meeting audio cuts out repeatedly",
	},
	{
		externalId: "INC-4067",
		question: "OneDrive sync stalled at 87% for 2 days",
	},
	{
		externalId: "INC-4071",
		question: "External monitor not detected on dock connection",
	},
	{
		externalId: "INC-4078",
		question: "Citrix session disconnects after 5 minutes idle",
	},
	{
		externalId: "INC-4083",
		question: "BitLocker recovery key requested every reboot",
	},
	{
		externalId: "INC-4089",
		question: "Teams calendar not showing internal meetings",
	},
	{
		externalId: "INC-4094",
		question: "Print job spooling but never reaches printer",
	},
	{
		externalId: "INC-4100",
		question: "Edge browser homepage keeps reverting after restart",
	},
	{
		externalId: "INC-4108",
		question: "Mailbox over quota — cannot send new emails",
	},
	{
		externalId: "INC-4115",
		question: "Antivirus flagging legitimate finance app as threat",
	},
	{
		externalId: "INC-4122",
		question: "USB headset not recognized after Windows update",
	},
	{
		externalId: "INC-4129",
		question: "SAP login session times out after 30 seconds",
	},
	{
		externalId: "INC-4133",
		question: "Cannot reset password — security questions rejected",
	},
	{
		externalId: "INC-4140",
		question: "DNS resolution failing for internal hostnames",
	},
	{
		externalId: "INC-4147",
		question: "Calendar invite from external sender shows wrong time",
	},
	{
		externalId: "INC-4153",
		question: "Slack mobile app missing critical channel notifications",
	},
	{
		externalId: "INC-4159",
		question: "VS Code extensions not loading after corporate proxy change",
	},
	{
		externalId: "INC-4164",
		question:
			"AD account locked after 3 wrong attempts — needs immediate unlock",
	},
	{
		externalId: "INC-4170",
		question: "Salesforce login redirects to blank page",
	},
	{
		externalId: "INC-4178",
		question: "Network share intermittently unavailable on macOS",
	},
	{
		externalId: "INC-4185",
		question: "Cannot join Teams meeting — error 0x80004005",
	},
	{
		externalId: "INC-4192",
		question: "Box for Office add-in disabled silently after update",
	},
];

/**
 * Generate a synthetic agent response for a given ticket question + agent.
 * Uses agent archetype to vary the tone of the response.
 */
function generateAgentResponse(question: string, agent: MockAgent): string {
	const intro = (() => {
		switch (agent.archetype) {
			case "diagnosis":
				return "Likely root cause";
			case "data-collection":
				return "Missing context gathered";
			case "resolution":
				return "Resolution applied";
			case "triage":
				return "Classification & routing";
		}
	})();
	return (
		`**${intro}**\n${question}\n\n` +
		`- Cross-referenced ${Math.floor(Math.random() * 4) + 2} similar tickets\n` +
		`- Confidence: ${85 + Math.floor(Math.random() * 14)}%\n` +
		"- Next step: agent recommends suggested fix to requester"
	);
}

/**
 * Generate a complete EvaluationRun with N synthetic cases.
 * Pass rate ≈ 95% with 1-2 random failures so results feel realistic.
 */
export function generateMockEvaluation(params: {
	clusterId: string;
	agent: MockAgent;
	sampleSize: number;
	testMethod: EvalTestMethod;
	name: string;
}): EvaluationRun {
	const { clusterId, agent, sampleSize, testMethod, name } = params;
	const id = `eval-${Date.now()}`;
	const startedAt = new Date().toISOString();

	const pool = [...MOCK_QA_POOL].sort(() => Math.random() - 0.5);
	const picked = pool.slice(0, Math.min(sampleSize, pool.length));

	// 1-2 failures to mimic Copilot's 99% pass rate
	const failureCount = Math.max(1, Math.floor(picked.length * 0.04));
	const failureIndices = new Set<number>();
	while (
		failureIndices.size < failureCount &&
		failureIndices.size < picked.length
	) {
		failureIndices.add(Math.floor(Math.random() * picked.length));
	}

	const cases: EvalCase[] = picked.map((qa, idx) => {
		const isFail = failureIndices.has(idx);
		const failedSkillIdx = isFail
			? Math.floor(Math.random() * agent.skills.length)
			: -1;
		return {
			id: `case-${id}-${idx}`,
			ticketId: `tkt-eval-${idx}`,
			ticketExternalId: qa.externalId,
			question: qa.question,
			agentResponse: generateAgentResponse(qa.question, agent),
			testMethod,
			score: isFail ? "fail" : "pass",
			rating: null,
			failureReason: isFail
				? `${agent.skills[failedSkillIdx]?.name ?? "Skill"} returned low confidence — agent did not meet quality threshold`
				: undefined,
			skillOutputs: agent.skills.map((skill, sIdx) => ({
				skillId: skill.id,
				skillName: skill.name,
				summary: skill.dryRunSummary,
				ok: !(isFail && sIdx === failedSkillIdx),
			})),
		};
	});

	return {
		id,
		clusterId,
		agentId: agent.id,
		name,
		startedAt,
		sampleSize: picked.length,
		testMethod,
		status: "running",
		cases,
	};
}
