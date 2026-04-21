/**
 * Consolidated mock agent data
 *
 * Single source for all mock agents, templates, knowledge sources, workflows, and skills.
 * Used across AgentsPage, AgentBuilderPage, AgentTestPage, and AgentTemplateModal.
 */

import type { AgentConfig, AgentTableRow, AgentTemplate } from "@/types/agent";

// --- Mock agents for the builder (AgentConfig shape) ---

export const MOCK_BUILDER_AGENTS: Record<string, AgentConfig> = {
	"1": {
		name: "HelpDesk Advisor",
		description:
			"Answers IT support questions and helps employees troubleshoot common technical issues.",
		role: "A friendly and knowledgeable IT support specialist",
		responsibilities:
			"Answering questions about password resets, VPN setup, software installation, and common IT issues. Providing step-by-step troubleshooting guidance.",
		completionCriteria:
			"When the user's technical issue is resolved, or when it needs to escalate to the IT team for hands-on support.",
		agentType: "answer",
		knowledgeSources: ["IT Security Policy", "Employee FAQ"],
		tools: ["Reset password", "Unlock account", "Request system access"],
		hasRequiredConnections: true,
		instructions:
			"## Role\nStore Operations Manager\n\n## Backstory\nYou are an experienced store operations manager responsible for managing and updating store configurations. You have expertise in retail operations and understand the importance of accurate store hour information for customers and employees. You ensure that all store hour updates are properly validated, formatted, and saved to maintain consistency across the system.\n\n## Goal\nTo update the store operating hours for a specific store after authorization has been confirmed.\n\n## Task\nAnalyze context to identify store_id, user_id, new_store_hours, and manager_email. Validate user authorization for the specified store. Check for manager approval — if missing, send notification and wait. Once approved, update the store hours.",
		conversationStarters: [
			"I forgot my password",
			"My account is locked",
			"I need access to a system",
		],
		guardrails: ["payroll questions", "HR policy questions"],
		iconId: "headphones",
		iconColorId: "blue",
		capabilities: {
			webSearch: true,
			imageGeneration: false,
			useAllWorkspaceContent: false,
		},
	},
	"2": {
		name: "Onboarding Compliance Checker",
		description:
			"Answers from compliance docs and ensures new hires complete required training.",
		role: "A compliance-focused onboarding assistant",
		responsibilities:
			"Guiding new employees through required compliance training, answering questions about company policies, and tracking completion status.",
		completionCriteria:
			"When the employee confirms understanding of all required compliance items.",
		agentType: "knowledge",
		knowledgeSources: [
			"HR Policies",
			"Code of Conduct",
			"IT Security Policy",
			"Employee FAQ",
		],
		tools: [],
		hasRequiredConnections: true,
		instructions:
			"## Role\nCompliance Onboarding Assistant\n\n## Backstory\nYou are a compliance-focused onboarding assistant that only answers from connected compliance documents. You never make up information — if something isn't in the documents, you say so.\n\n## Goal\nGuide new employees through required compliance training and answer questions about company policies.\n\n## Task\nRespond to compliance questions using only connected knowledge sources. Track which required items the employee has reviewed. Confirm understanding of all required compliance items before marking complete.",
		conversationStarters: [
			"What compliance training do I need?",
			"Tell me about the code of conduct",
			"What are the security policies?",
			"How do I report compliance issues?",
		],
		guardrails: ["IT troubleshooting", "benefits questions", "payroll"],
		iconId: "shield-check",
		iconColorId: "emerald",
		capabilities: {
			webSearch: false,
			imageGeneration: false,
			useAllWorkspaceContent: false,
		},
	},
	"3": {
		name: "Password Reset Bot",
		description: "Automates password resets for employees.",
		role: "An automated password reset assistant",
		responsibilities:
			"Verifying user identity and executing password resets through the AD workflow.",
		completionCriteria:
			"When the password reset is complete and the user confirms they can log in.",
		agentType: "workflow",
		knowledgeSources: [],
		tools: ["Password Reset"],
		hasRequiredConnections: true,
		instructions:
			"## Role\nAutomated Password Reset Assistant\n\n## Backstory\nYou help employees reset their passwords through a secure, verified process. You always verify the user's identity before initiating a reset and explain each step clearly.\n\n## Goal\nVerify user identity and execute password resets through the AD workflow.\n\n## Task\nConfirm user identity via security questions or manager verification. Execute the password reset workflow. Verify the user can log in with new credentials. Escalate if reset fails after 2 attempts.",
		conversationStarters: [
			"I need to reset my password",
			"I'm locked out of my account",
			"Can you help me change my password?",
			"My password expired",
		],
		guardrails: ["other IT issues", "software installation", "VPN setup"],
		iconId: "key",
		iconColorId: "purple",
		capabilities: {
			webSearch: false,
			imageGeneration: false,
			useAllWorkspaceContent: false,
		},
	},
};

// --- Mock agents for the table view ---

export const MOCK_TABLE_AGENTS: AgentTableRow[] = [
	{
		id: "1",
		name: "HelpDesk Advisor",
		description: "Answers IT support questions",
		state: "PUBLISHED",
		skills: ["Reset password", "Unlock account", "Request system access"],
		updatedBy: "chris.nelson@resolve.io",
		owner: "chris.nelson@resolve.io",
		lastUpdated: "16 Dec, 2025 11:44",
	},
	{
		id: "2",
		name: "Onboarding Compliance Checker",
		description: "Answers from compliance docs",
		state: "PUBLISHED",
		skills: ["Verify I-9 forms", "Check background status", "Review tax docs"],
		updatedBy: "kate.lee@resolve.io",
		owner: "kate.lee@resolve.io",
		lastUpdated: "06 Dec, 2025 12:03",
	},
	{
		id: "3",
		name: "Password Reset Bot",
		description: "Automates password resets",
		state: "DRAFT",
		skills: ["Password Reset"],
		updatedBy: "alex.johnson@resolve.io",
		owner: null,
		lastUpdated: "03 Dec, 2025 13:27",
	},
	{
		id: "4",
		name: "PTO Balance Checker",
		description: "Checks employee time off balances",
		state: "PUBLISHED",
		skills: ["Check PTO balance", "Request time off"],
		updatedBy: "jane.smith@resolve.io",
		owner: "jane.smith@resolve.io",
		lastUpdated: "23 Nov, 2025 12:07",
	},
	{
		id: "5",
		name: "Employee Directory Bot",
		description: "Looks up employee information",
		state: "PUBLISHED",
		skills: ["Lookup employee", "Find department", "Get contact info"],
		updatedBy: "mike.miller@resolve.io",
		owner: "mike.miller@resolve.io",
		lastUpdated: "03 Nov, 2025 18:07",
	},
];

// --- Agent templates ---

export const AGENT_TEMPLATES: AgentTemplate[] = [
	{
		id: "assign-computer",
		name: "Assign a Computer to a New Owner",
		description:
			"Allows IT administrators to quickly assign or reprovision managed apple computers",
		creator: "Resolve",
		prompt: "Help IT administrators assign computers to new owners...",
		category: "IT Support",
		domain: "Access Management",
		skills: ["Employee onboarding"],
		iconId: "monitor",
		iconBg: "bg-violet-200",
	},
	{
		id: "warranty-lookup",
		name: "Look Up My Computer Warranty Info",
		description:
			"Allows employees to check their computer's warranty and purchase details through",
		creator: "Resolve",
		prompt: "Help employees look up warranty information...",
		category: "IT Support",
		domain: "Access Management",
		skills: ["Employee onboarding"],
		iconId: "book-open-text",
		iconBg: "bg-teal-200",
	},
	{
		id: "onboard-computer",
		name: "Onboard a New Computer",
		description:
			"Runs automations and performs tasks based on leveraging Resolve actions platform",
		creator: "Resolve",
		prompt: "Guide users through onboarding a new computer...",
		category: "IT Support",
		domain: "Access Management",
		skills: ["Employee onboarding"],
		iconId: "keyboard",
		iconBg: "bg-sky-100",
	},
	{
		id: "inventory-record",
		name: "Create a Computer Inventory Record",
		description:
			"Allows IT administrators to quickly assign or reprovision managed apple computers",
		creator: "Resolve",
		prompt: "Help create inventory records...",
		category: "IT Support",
		domain: "General",
		skills: ["Employee onboarding"],
		iconId: "album",
		iconBg: "bg-indigo-950",
		iconColor: "text-white",
	},
	{
		id: "helpdesk-advisor",
		name: "HelpDesk Advisor",
		description: "Answer IT support questions using your knowledge base",
		creator: "Resolve",
		prompt: "Help employees with IT-related questions...",
		category: "IT Support",
		domain: "General",
		skills: ["IT Support", "Troubleshooting"],
		iconId: "headphones",
		iconBg: "bg-blue-100",
	},
	{
		id: "password-reset",
		name: "Password Reset Bot",
		description: "Automate password reset requests for employees securely",
		creator: "Resolve",
		prompt: "Help employees reset their passwords...",
		category: "IT Support",
		domain: "Access Management",
		skills: ["Password Reset", "Account Unlock"],
		iconId: "key",
		iconBg: "bg-purple-100",
	},
	{
		id: "onboarding-guide",
		name: "Onboarding Guide",
		description: "Help new hires navigate their first days at the company",
		creator: "Resolve",
		prompt: "Welcome new employees and guide them...",
		category: "HR",
		domain: "Human Resources",
		skills: ["Employee onboarding", "Benefits"],
		iconId: "users",
		iconBg: "bg-green-100",
	},
	{
		id: "policy-expert",
		name: "Policy Expert",
		description:
			"Answer questions about company policies from official documents",
		creator: "Resolve",
		prompt: "Provide accurate answers about company policies...",
		category: "Compliance",
		domain: "Human Resources",
		skills: ["Policy lookup", "Compliance"],
		iconId: "shield-check",
		iconBg: "bg-emerald-100",
	},
	{
		id: "benefits-advisor",
		name: "Benefits Advisor",
		description:
			"Help employees understand and navigate their benefits package",
		creator: "Resolve",
		prompt: "Help employees understand their benefits...",
		category: "HR",
		domain: "Human Resources",
		skills: ["Benefits", "Enrollment"],
		iconId: "briefcase",
		iconBg: "bg-amber-100",
	},
	{
		id: "access-request",
		name: "Access Request Handler",
		description: "Process system access requests for employees efficiently",
		creator: "Resolve",
		prompt: "Help employees request access to systems...",
		category: "IT Support",
		domain: "Access Management",
		skills: ["Access provisioning", "Approvals"],
		iconId: "settings",
		iconBg: "bg-slate-100",
	},
	{
		id: "customer-success",
		name: "Customer Success Assistant",
		description:
			"Help customer success teams with account information and insights",
		creator: "Resolve",
		prompt: "Assist customer success teams...",
		category: "Sales",
		domain: "Customer Success",
		skills: ["Account lookup", "Customer insights"],
		iconId: "help-circle",
		iconBg: "bg-pink-100",
	},
	{
		id: "approval-bot",
		name: "Approval Workflow Bot",
		description: "Streamline approval processes for various business requests",
		creator: "Resolve",
		prompt: "Help process approval requests...",
		category: "Operations",
		domain: "Approvals",
		skills: ["Approval routing", "Status tracking"],
		iconId: "file-text",
		iconBg: "bg-orange-100",
	},
];
