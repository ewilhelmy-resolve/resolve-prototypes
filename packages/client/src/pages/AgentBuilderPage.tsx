// @ts-nocheck
/**
 * AgentBuilderPage - Chat-based agent creation experience
 *
 * Implements RitaGo Agent Creation flow:
 * - Conversational collection of agent config
 * - Collects: name, description, role/persona, responsibilities, completion criteria
 * - Infers agent type (Answer, Knowledge, Workflow)
 * - Summarizes and confirms before finalizing
 */

import confetti from "canvas-confetti";
import {
	AlertCircle,
	ArrowLeft,
	Award,
	BookOpen,
	Bot,
	Brain,
	Briefcase,
	Bug,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	ClipboardList,
	Clock,
	Coffee,
	Database,
	FileText,
	Folder,
	Globe,
	GraduationCap,
	Headphones,
	Heart,
	HelpCircle,
	Home,
	Key,
	Landmark,
	Layers,
	LineChart,
	Link2,
	Loader2,
	Lock,
	Mail,
	Map,
	MessageSquare,
	MessageSquareText,
	Package,
	Phone,
	Play,
	Plus,
	Rocket,
	RotateCcw,
	Search,
	Send,
	Settings,
	// Icon picker icons
	ShieldCheck,
	ShoppingCart,
	Sparkles,
	Squirrel,
	Star,
	Target,
	ThumbsUp,
	Trash2,
	TrendingUp,
	Truck,
	Users,
	Workflow,
	Wrench,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	useLocation,
	useNavigate,
	useParams,
} from "react-router-dom";
import {
	AddSkillModal,
	ChangeAgentTypeModal,
	ConfirmTypeChangeModal,
	CreateWorkflowModal,
	InstructionsExpandedModal,
	PublishModal,
	UnlinkWorkflowModal,
	UnpublishModal,
} from "@/components/agents/builder";
import { SaveStatusIndicator } from "@/components/agents/SaveStatusIndicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAutoSave } from "@/hooks/useAutoSave";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AGENT_TYPE_INFO, AVAILABLE_ICONS, ICON_COLORS } from "@/constants/agents";
import { MOCK_BUILDER_AGENTS } from "@/constants/agentMocks";
import type {
	AgentConfig,
	BuilderMessage,
	ConversationStep,
	DebugStepStatus,
	DebugTraceStep,
} from "@/types/agent";

// Mock available knowledge sources in the org (uploads + connections)
const AVAILABLE_KNOWLEDGE_SOURCES = [
	// Uploads
	{
		id: "hr-policies",
		name: "HR Policies",
		description: "Company HR policies and guidelines",
		type: "upload",
		tags: ["hr", "policy", "employee"],
	},
	{
		id: "benefits-guide",
		name: "Benefits Guide",
		description: "Health insurance, 401k, and other benefits",
		type: "upload",
		tags: ["hr", "benefits", "insurance", "401k"],
	},
	{
		id: "pto-handbook",
		name: "PTO Handbook",
		description: "Time off policies and procedures",
		type: "upload",
		tags: ["hr", "pto", "vacation", "time off"],
	},
	{
		id: "employee-faq",
		name: "Employee FAQ",
		description: "Common questions and answers",
		type: "upload",
		tags: ["hr", "faq", "employee"],
	},
	{
		id: "onboarding-docs",
		name: "Onboarding Documents",
		description: "New hire information",
		type: "upload",
		tags: ["hr", "onboarding", "new hire"],
	},
	{
		id: "it-security-policy",
		name: "IT Security Policy",
		description: "Security guidelines and compliance",
		type: "upload",
		tags: ["it", "security", "compliance"],
	},
	{
		id: "expense-policy",
		name: "Expense Policy",
		description: "Travel and expense reimbursement rules",
		type: "upload",
		tags: ["finance", "expense", "travel"],
	},
	{
		id: "code-of-conduct",
		name: "Code of Conduct",
		description: "Employee behavior guidelines",
		type: "upload",
		tags: ["hr", "compliance", "conduct"],
	},
	// Connections
	{
		id: "confluence-hr",
		name: "Confluence - HR Space",
		description: "HR team Confluence workspace",
		type: "connection",
		tags: ["hr", "confluence"],
	},
	{
		id: "sharepoint-policies",
		name: "SharePoint - Company Policies",
		description: "Central policy repository",
		type: "connection",
		tags: ["policy", "sharepoint"],
	},
	{
		id: "notion-wiki",
		name: "Notion - Company Wiki",
		description: "Internal knowledge base",
		type: "connection",
		tags: ["wiki", "notion"],
	},
	{
		id: "gdrive-hr",
		name: "Google Drive - HR Folder",
		description: "HR shared drive",
		type: "connection",
		tags: ["hr", "gdrive"],
	},
];

// Mock available workflows in the org (1:1 with agents)
const AVAILABLE_WORKFLOWS = [
	{
		id: "password-reset",
		name: "Password Reset",
		description: "Reset user passwords in AD",
		category: "IT",
		linkedAgentId: "3",
		linkedAgentName: "Password Reset Bot",
		linkedAgentOwnerId: "user-2",
		linkedAgentOwnerName: "John Smith",
		linkedAgentOwnerEmail: "john.smith@company.com",
	},
	{
		id: "access-request",
		name: "Access Request",
		description: "Request system access",
		category: "IT",
		linkedAgentId: null,
		linkedAgentName: null,
		linkedAgentOwnerId: null,
		linkedAgentOwnerName: null,
		linkedAgentOwnerEmail: null,
	},
	{
		id: "new-hire-setup",
		name: "New Hire Setup",
		description: "Provision accounts for new employees",
		category: "HR",
		linkedAgentId: null,
		linkedAgentName: null,
		linkedAgentOwnerId: null,
		linkedAgentOwnerName: null,
		linkedAgentOwnerEmail: null,
	},
	{
		id: "offboarding",
		name: "Offboarding",
		description: "Revoke access for departing employees",
		category: "HR",
		linkedAgentId: "7",
		linkedAgentName: "HR Assistant",
		linkedAgentOwnerId: "user-1",
		linkedAgentOwnerName: "You",
		linkedAgentOwnerEmail: null,
	},
	{
		id: "software-install",
		name: "Software Installation",
		description: "Request and install approved software",
		category: "IT",
		linkedAgentId: null,
		linkedAgentName: null,
		linkedAgentOwnerId: null,
		linkedAgentOwnerName: null,
		linkedAgentOwnerEmail: null,
	},
	{
		id: "vpn-setup",
		name: "VPN Setup",
		description: "Configure VPN access for remote work",
		category: "IT",
		linkedAgentId: null,
		linkedAgentName: null,
		linkedAgentOwnerId: null,
		linkedAgentOwnerName: null,
		linkedAgentOwnerEmail: null,
	},
	{
		id: "expense-submit",
		name: "Expense Submission",
		description: "Submit and track expense reports",
		category: "Finance",
		linkedAgentId: null,
		linkedAgentName: null,
		linkedAgentOwnerId: null,
		linkedAgentOwnerName: null,
		linkedAgentOwnerEmail: null,
	},
	{
		id: "pto-request",
		name: "PTO Request",
		description: "Submit time off requests",
		category: "HR",
		linkedAgentId: null,
		linkedAgentName: null,
		linkedAgentOwnerId: null,
		linkedAgentOwnerName: null,
		linkedAgentOwnerEmail: null,
	},
];

// Available skills for the Add Skill modal
// linkedAgent: null = available, string = name of agent using this skill
const AVAILABLE_SKILLS = [
	{
		id: "lookup-birthday",
		name: "Lookup employee birthday",
		author: "System",
		icon: Calendar,
		starters: ["When is my coworker's birthday?", "Look up a birthday"],
		linkedAgent: null,
		skillInstructions: "Look up employee birthdays from the HR directory. Respond with the employee's name and birthday. If not found, suggest checking the spelling.",
	},
	{
		id: "reset-password",
		name: "Reset password",
		author: "IT Team",
		icon: Key,
		starters: [
			"I forgot my password",
			"Reset my password",
			"I need a new password",
		],
		linkedAgent: "HelpDesk Advisor",
		skillInstructions: "Guide users through password reset. Verify identity via security questions or MFA before initiating reset. Send temporary password via secure channel and require change on next login.",
	},
	{
		id: "check-pto",
		name: "Check PTO balance",
		author: "HR Team",
		icon: Clock,
		starters: [
			"How much PTO do I have?",
			"Check my time off balance",
			"How many vacation days left?",
		],
		linkedAgent: "PTO Balance Checker",
		skillInstructions: "Query the HR system for the user's PTO balance including vacation, sick, and personal days. Show accrued, used, and remaining totals.",
	},
	{
		id: "verify-i9",
		name: "Verify I-9 forms",
		author: "Compliance",
		icon: ShieldCheck,
		starters: ["Check my I-9 status", "Is my I-9 complete?"],
		linkedAgent: "Compliance Checker",
		skillInstructions: "Check I-9 employment verification form status. Report whether the form is complete, pending, or missing required documents. Flag any approaching deadlines.",
	},
	{
		id: "check-background",
		name: "Check background status",
		author: "HR Team",
		icon: Users,
		starters: [
			"What's my background check status?",
			"Is my background check done?",
		],
		linkedAgent: null,
		skillInstructions: "Query the background check provider for current status. Report whether the check is pending, in progress, or completed, along with any action items needed.",
	},
	{
		id: "unlock-account",
		name: "Unlock account",
		author: "IT Team",
		icon: Lock,
		starters: ["My account is locked", "Unlock my account", "I can't log in"],
		linkedAgent: "HelpDesk Advisor",
		skillInstructions: "Unlock user accounts that have been locked due to failed login attempts. Verify user identity first, then unlock the account in Active Directory. Confirm the account is accessible.",
	},
	{
		id: "submit-expense",
		name: "Submit expense report",
		author: "Finance",
		icon: Briefcase,
		starters: [
			"Submit an expense",
			"I need to file an expense report",
			"How do I get reimbursed?",
		],
		linkedAgent: null,
		skillInstructions: "Help users submit expense reports. Collect receipt details, amount, category, and business justification. Submit to the finance system and provide a confirmation number.",
	},
	{
		id: "request-access",
		name: "Request system access",
		author: "IT Team",
		icon: Key,
		starters: [
			"Request access to a system",
			"I need access to...",
			"How do I get permissions?",
		],
		linkedAgent: "HelpDesk Advisor",
		skillInstructions: "Process system access requests. Collect the target system, required access level, and business justification. Route to the appropriate approver and track request status.",
	},
	{
		id: "provision-account",
		name: "Provision account",
		author: "IT Team",
		icon: Users,
		starters: [
			"Set up a new account",
			"Provision a new employee",
			"Create user account",
			"New hire onboarding",
		],
		linkedAgent: null,
		skillInstructions: "Provision new user accounts across enterprise systems. Collect employee details (name, department, role, manager). Create accounts in Active Directory, Google Workspace, and assigned SaaS applications based on department role mapping. Configure email, distribution groups, and default permissions. Send welcome credentials via secure channel.",
	},
	{
		id: "customer-engagement",
		name: "Customer engagement",
		author: "CX Team",
		icon: MessageSquare,
		starters: [
			"Follow up with a customer",
			"Send a customer update",
			"Check customer satisfaction",
			"Schedule customer touchpoint",
		],
		linkedAgent: null,
		skillInstructions: "Manage customer engagement touchpoints. Look up customer context from CRM (recent interactions, open tickets, satisfaction score). Draft personalized follow-up messages. Schedule check-ins based on customer health score. Escalate at-risk accounts to the customer success manager.",
	},
];

// Merge in workflow-published skills from localStorage
function getPublishedWorkflowSkills() {
	try {
		const raw = localStorage.getItem("publishedWorkflowSkills");
		if (!raw) return [];
		return JSON.parse(raw).map((s) => ({
			id: `wf-${s.id}`,
			name: s.name,
			author: "Workflow",
			icon: Workflow,
			starters: [s.description || `Run ${s.name}`],
			linkedAgent: null,
		}));
	} catch {
		return [];
	}
}

// Icon picker options
export default function AgentBuilderPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const { id: agentId } = useParams<{ id: string }>();
	const agentName = location.state?.agentName || "Untitled Agent";
	const duplicatedConfig = location.state?.duplicatedConfig as
		| AgentConfig
		| undefined;
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Check if we're editing an existing agent
	const isEditing = !!agentId;
	const savedAgent = agentId ? MOCK_BUILDER_AGENTS[agentId] : null;
	const isDuplicate = !!duplicatedConfig;

	// Default to configure tab
	const [activeTab, setActiveTab] = useState<"configure" | "access">(
		"configure",
	);
	const [showTestModal, setShowTestModal] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [step, setStep] = useState<ConversationStep>(
		isEditing || isDuplicate ? "done" : "start",
	);
	const [isTyping, setIsTyping] = useState(false);
	const [config, setConfig] = useState<AgentConfig>(
		duplicatedConfig ||
			savedAgent || {
				name: agentName,
				description: "",
				role: "",
				responsibilities: "",
				completionCriteria: "",
				agentType: null,
				knowledgeSources: [],
				workflows: [],
				hasRequiredConnections: false,
				instructions: "",
				conversationStarters: [],
				guardrails: [],
				iconId: "bot",
				iconColorId: "slate",
				capabilities: {
					webSearch: true,
					imageGeneration: false,
					useAllWorkspaceContent: false,
				},
			},
	);

	const [showConfirmButtons, setShowConfirmButtons] = useState(false);

	// Selection UI states (new flow)
	const [showTypeSelector, setShowTypeSelector] = useState(false);
	const [showSourceSelector, setShowSourceSelector] = useState(false);
	const [selectedType, setSelectedType] = useState<
		"answer" | "knowledge" | "workflow" | null
	>(null);
	const [selectedSources, setSelectedSources] = useState<string[]>([]);
	const [showTypeConfirmation, setShowTypeConfirmation] = useState(false);
	const [showTriggerPhrases, setShowTriggerPhrases] = useState(false);
	const [suggestedTriggerPhrases, setSuggestedTriggerPhrases] = useState<
		string[]
	>([]);
	const [showGuardrails, setShowGuardrails] = useState(true);
	const [guardrailInput, setGuardrailInput] = useState("");

	// Test tab state
	const [testMessages, setTestMessages] = useState<BuilderMessage[]>([]);
	const [testInput, setTestInput] = useState("");
	const [isTestTyping, setIsTestTyping] = useState(false);
	const [isTestMode, setIsTestMode] = useState(false);
	const [debugTrace, setDebugTrace] = useState<DebugTraceStep[]>([]);
	const [expandedStep, setExpandedStep] = useState<string | null>(null);
	const [showOnlyErrors, setShowOnlyErrors] = useState(false);
	const [showDebugPanel, setShowDebugPanel] = useState(false);
	const testMessagesEndRef = useRef<HTMLDivElement>(null);

	// Change agent type modal state
	const [showChangeTypeModal, setShowChangeTypeModal] = useState(false);
	const [showConfirmTypeChangeModal, setShowConfirmTypeChangeModal] =
		useState(false);
	const [pendingAgentType, setPendingAgentType] = useState<
		"answer" | "knowledge" | "workflow" | null
	>(null);

	// Icon picker state
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [iconSearchQuery, setIconSearchQuery] = useState("");

	// Publish modal state
	const [showPublishModal, setShowPublishModal] = useState(false);
	const [showUnpublishModal, setShowUnpublishModal] = useState(false);
	const [showPublishChangesModal, setShowPublishChangesModal] = useState(false);

	// Track the original published config for diff comparison (only for editing)
	const [publishedConfig] = useState<AgentConfig | null>(savedAgent || null);

	// Workflow picker state
	const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
	const [workflowToUnlink, setWorkflowToUnlink] = useState<{
		id: string;
		name: string;
		linkedAgentName: string;
	} | null>(null);

	// Knowledge picker state
	const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState("");

	// Access tab state
	const [accessSearchQuery, setAccessSearchQuery] = useState("");
	const [showAccessDropdown, setShowAccessDropdown] = useState(false);
	const [addedAccessItems, setAddedAccessItems] = useState<
		Array<{
			id: string;
			type: "team" | "user";
			name: string;
			email?: string;
			initials?: string;
			color: string;
			bgClass: string;
			textClass: string;
		}>
	>([]);

	// Create new workflow modal state
	const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
	const [newWorkflowDescription, setNewWorkflowDescription] = useState("");

	// Add skill modal state
	const [showAddSkillModal, setShowAddSkillModal] = useState(false);
	const [skillSearchQuery, setSkillSearchQuery] = useState("");
	const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
	const [skillsTab, setSkillsTab] = useState<"available" | "all">("available");

	// Instructions expanded modal state
	const [showInstructionsModal, setShowInstructionsModal] = useState(false);

	// Conversation starters customization toggle
	const [showCustomStarters, setShowCustomStarters] = useState(true);

	// Description visibility toggle
	const [showDescription, setShowDescription] = useState(false);

	// Demo mode state
	const [demoMode, setDemoMode] = useState(false);
	const [demoStep, setDemoStep] = useState(0);

	const DEMO_STEPS = [
		{ label: "Create Agent", description: "Fill in agent details" },
		{ label: "Add Skills", description: "Configure workflows" },
		{ label: "Add Starters", description: "Set conversation starters" },
		{ label: "Test Agent", description: "Navigate to test page" },
		{ label: "Publish", description: "Make agent live" },
	];

	const handleDemoNext = () => {
		switch (demoStep) {
			case 0:
				setConfig((prev) => ({
					...prev,
					name: "Store Hours Manager",
					description:
						"Updates store operating hours after manager approval",
					agentType: "workflow" as const,
					role: "Store Operations Manager",
					iconId: "bot",
					iconColorId: "emerald",
				}));
				setStep("done");
				setDemoStep(1);
				break;
			case 1:
				setConfig((prev) => ({
					...prev,
					workflows: ["Update Store Hours"],
				}));
				setDemoStep(2);
				break;
			case 2:
				setConfig((prev) => ({
					...prev,
					conversationStarters: [
						"Update store hours for location 42",
						"Change weekend hours",
						"Set holiday schedule",
					],
				}));
				setDemoStep(3);
				break;
			case 3:
				navigate("/agents/test", {
					state: { agentConfig: config },
				});
				setDemoStep(4);
				break;
			case 4:
				setShowPublishModal(true);
				setDemoStep(5);
				break;
			default:
				setDemoMode(false);
				setDemoStep(0);
				break;
		}
	};

	// Knowledge collapsible toggle
	const [showKnowledge, setShowKnowledge] = useState(false);

	// Track when skills were just added to show "updated" message
	const [instructionsUpdatedFromSkills, setInstructionsUpdatedFromSkills] =
		useState(false);
	const prevWorkflowsLength = useRef(config.workflows.length);

	// Detect when skills are added and auto-populate instructions
	useEffect(() => {
		if (config.workflows.length > prevWorkflowsLength.current) {
			const allSkillsPool = [...AVAILABLE_SKILLS, ...getPublishedWorkflowSkills()];
			const skillEntries = config.workflows.map((name) => {
				const match = allSkillsPool.find((s) => s.name === name);
				return {
					name,
					instructions: match?.skillInstructions || `Handle ${name} requests.`,
				};
			});

			const skillNames = skillEntries.map((s) => s.name.toLowerCase()).join(", ");
			const taskLines = skillEntries
				.map((s) => `- **${s.name}**: ${s.instructions}`)
				.join("\n");

			setConfig((prev) => ({
				...prev,
				instructions: `## Role\nYou are a specialized assistant that helps users with ${skillNames}.\n\n## Backstory\nYou have expertise in ${skillNames} and understand the importance of accurate, timely resolution for each request. You ensure that all actions are properly validated before execution.\n\n## Goal\nResolve user requests efficiently by leveraging the skills below. Always verify identity before performing sensitive operations.\n\n## Task\nAnalyze context to identify the user's request and match it to the appropriate skill:\n${taskLines}\n\nAlways confirm actions before executing and escalate if outside your skill scope.`,
			}));
			setInstructionsUpdatedFromSkills(true);
			const timer = setTimeout(
				() => setInstructionsUpdatedFromSkills(false),
				5000,
			);
			return () => clearTimeout(timer);
		}
		prevWorkflowsLength.current = config.workflows.length;
	}, [config.workflows.length, config.workflows]);

	// Auto-save with 1.5s debounce
	const {
		status: saveStatus,
		isDirty,
		error: saveError,
	} = useAutoSave({
		data: config,
		onSave: async (data) => {
			// Mock save - in production this would call the API
			console.log("Auto-saving agent config:", data);
			// Simulate network delay
			await new Promise((resolve) => setTimeout(resolve, 500));
			// In production: await agentApi.saveAgent(agentId, data);
		},
		enabled: step === "done" || isEditing, // Only auto-save when in configure mode
	});

	const [messages, setMessages] = useState<BuilderMessage[]>([
		{
			id: "1",
			role: "assistant",
			content: `Hi! I can help you build a new agent.\nFirst, what kind of agent are you building today?`,
		},
	]);

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [
		messages,
		isTyping,
		showConfirmButtons,
		showTypeSelector,
		showSourceSelector,
		showTypeConfirmation,
		showTriggerPhrases,
		showGuardrails,
	]);

	// Auto-scroll test messages
	useEffect(() => {
		testMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [testMessages, isTestTyping]);

	// Initialize test chat when opening test modal
	useEffect(() => {
		if (showTestModal && testMessages.length === 0 && step === "done") {
			setTestMessages([
				{
					id: "test-welcome",
					role: "assistant",
					content: `Hi! I'm ${config.name}. ${config.description}\n\nHow can I help you today?`,
				},
			]);
		}
	}, [
		showTestModal,
		testMessages.length,
		step,
		config.name,
		config.description,
	]);

	// Handle test message submission
	const handleTestSendMessage = () => {
		if (!testInput.trim() || isTestTyping) return;

		const userMessage: BuilderMessage = {
			id: `test-user-${Date.now()}`,
			role: "user",
			content: testInput.trim(),
		};
		setTestMessages([userMessage]); // Replace messages for single-turn debug view
		const input = testInput.trim();
		setTestInput("");
		setExpandedStep(null);

		// Generate debug trace
		const trace = generateDebugTrace(input);
		setDebugTrace(trace);

		// Simulate agent response
		setIsTestTyping(true);
		setTimeout(
			() => {
				// Generate a simulated response based on the agent config
				const response = generateTestResponse(input);
				setTestMessages((prev) => [
					...prev,
					{
						id: `test-assistant-${Date.now()}`,
						role: "assistant",
						content: response,
					},
				]);
				setIsTestTyping(false);
			},
			1000 + Math.random() * 1000,
		);
	};

	// Generate simulated test response based on agent config
	const generateTestResponse = (userInput: string): string => {
		const input = userInput.toLowerCase();

		// Check if agent has minimal config
		const hasSkills = config.workflows.length > 0;
		const hasKnowledge = config.knowledgeSources.length > 0;
		const hasInstructions =
			config.instructions && config.instructions.trim().length > 0;

		// Nudge: No skills and no knowledge configured
		if (!hasSkills && !hasKnowledge && !hasInstructions) {
			return `I'd love to help, but I don't have any skills or knowledge configured yet.\n\n**To get me working:**\n• Add **Skills** to let me perform actions\n• Add **Knowledge** sources so I can answer questions\n• Write **Instructions** to define how I behave\n\nConfigure me in the panel on the left!`;
		}

		// Check guardrails first
		for (const guardrail of config.guardrails) {
			if (guardrail && input.includes(guardrail.toLowerCase())) {
				return `I'm sorry, but I'm not able to help with ${guardrail}. Please contact the appropriate team for assistance with that topic.`;
			}
		}

		// Meta questions about finding/adding skills
		if (
			input.includes("find skill") ||
			input.includes("add skill") ||
			input.includes("more skill") ||
			input.includes("what skill") ||
			input.includes("need skill") ||
			input.includes("skills to add")
		) {
			const currentSkills = hasSkills
				? `**Current skills:**\n${config.workflows.map((s) => `• ${s}`).join("\n")}\n\n`
				: "";

			return `${currentSkills}**Suggested skills for ${config.name || "this agent"}:**\n• Check VPN status\n• Submit IT ticket\n• Software installation request\n• Hardware replacement request\n• Email configuration help\n\n**To add skills:**\n1. Click "+ Add skill" in Configure\n2. Browse or search available skills\n3. Select and add`;
		}

		// Check if this matches any of the agent's skills/workflows
		const hasPasswordReset = config.workflows.some((w) =>
			w.toLowerCase().includes("password"),
		);
		const hasUnlockAccount = config.workflows.some((w) =>
			w.toLowerCase().includes("unlock"),
		);
		const hasRequestAccess = config.workflows.some((w) =>
			w.toLowerCase().includes("access"),
		);
		const hasPTO = config.workflows.some((w) =>
			w.toLowerCase().includes("pto"),
		);
		const hasBirthday = config.workflows.some((w) =>
			w.toLowerCase().includes("birthday"),
		);

		// Password reset flow
		if (
			hasPasswordReset &&
			(input.includes("password") ||
				input.includes("forgot") ||
				input.includes("reset"))
		) {
			return `I can help you reset your password. Let me verify your identity first.\n\n**To reset your password, I'll need:**\n• Your employee ID or email address\n• Answer to your security question\n\nOnce verified, I'll send a password reset link to your registered email. The link expires in 15 minutes.\n\nWould you like me to proceed with the password reset?`;
		}

		// Account unlock flow
		if (
			hasUnlockAccount &&
			(input.includes("locked") ||
				input.includes("unlock") ||
				input.includes("can't log in") ||
				input.includes("cannot log in"))
		) {
			return `I see you're having trouble accessing your account. Let me help you unlock it.\n\n**Account Status Check:**\n• Checking Active Directory status...\n• Account appears to be locked due to multiple failed login attempts\n\n**To unlock your account:**\n1. I'll verify your identity\n2. Unlock your AD account\n3. You can then log in with your existing password\n\nShall I proceed with unlocking your account?`;
		}

		// System access request flow
		if (
			hasRequestAccess &&
			(input.includes("access") ||
				input.includes("permission") ||
				input.includes("system"))
		) {
			return `I can help you request access to a system.\n\n**Available systems:**\n• Salesforce CRM\n• Jira Project Management\n• Confluence Wiki\n• GitHub Enterprise\n• AWS Console\n\nPlease specify which system you need access to, and I'll initiate the access request workflow. Your manager will receive a notification for approval.\n\nWhich system do you need access to?`;
		}

		// PTO check flow
		if (
			hasPTO &&
			(input.includes("pto") ||
				input.includes("time off") ||
				input.includes("vacation") ||
				input.includes("leave"))
		) {
			return `Let me check your PTO balance.\n\n**Your Time Off Summary:**\n• Available PTO: 12 days\n• Used this year: 8 days\n• Pending requests: 0 days\n\nWould you like to submit a new time off request?`;
		}

		// Birthday lookup flow
		if (
			hasBirthday &&
			(input.includes("birthday") || input.includes("coworker"))
		) {
			return `I can help you look up an employee's birthday.\n\nPlease provide the employee's name or email, and I'll find their birthday for you. Note: Only work anniversary dates are shared publicly; birth dates require the employee's consent to share.\n\nWhose birthday would you like to look up?`;
		}

		// Generic skill-based response if agent has skills but no specific match
		if (hasSkills) {
			return `I'm ${config.name || "your assistant"}, and I can help you with:\n\n${config.workflows.map((s) => `• ${s}`).join("\n")}\n\nBased on your message, it looks like you might need help with one of these. Could you tell me more specifically what you need?`;
		}

		// Knowledge-based response
		if (hasKnowledge) {
			return `I can help answer questions based on my knowledge sources:\n\n${config.knowledgeSources
				.slice(0, 3)
				.map((s) => `• ${s}`)
				.join(
					"\n",
				)}${config.knowledgeSources.length > 3 ? `\n• ...and ${config.knowledgeSources.length - 3} more` : ""}\n\nCould you be more specific about what you'd like to know?`;
		}

		// Default response with instructions
		return `Thanks for your question about "${userInput}"\n\nAs ${config.name || "your assistant"}, I'm configured to help based on my instructions.\n\n[This is a preview. In production, I'll provide real answers based on my configuration.]`;
	};

	// Generate debug trace for a user message
	const generateDebugTrace = (userInput: string): DebugTraceStep[] => {
		const input = userInput.toLowerCase();
		const hasSkills = config.workflows.length > 0;
		const hasKnowledge = config.knowledgeSources.length > 0;
		const matchedGuardrail = config.guardrails.find(
			(g) => g && input.includes(g.toLowerCase()),
		);
		const matchedSkill = config.workflows.find((w) => {
			const skillLower = w.toLowerCase();
			return (
				input.includes(skillLower) ||
				(skillLower.includes("password") && input.includes("password")) ||
				(skillLower.includes("unlock") && input.includes("unlock")) ||
				(skillLower.includes("access") && input.includes("access"))
			);
		});

		// Failure triggers for testing
		const isTimeoutTest = input.includes("timeout") || input.includes("slow");
		const isConnectionError = input.includes("error") || input.includes("fail");
		const isNoResults = input.includes("nothing") || input.includes("empty");

		const trace: DebugTraceStep[] = [
			{
				id: "branch",
				type: "trigger",
				label: "Branch",
				description: "Decide on next step",
				status: "success",
				duration: 120,
				input: { message: userInput },
				output: {
					decision: matchedSkill
						? "execute_skill"
						: hasKnowledge
							? "search_knowledge"
							: "direct_response",
				},
			},
			{
				id: "plan",
				type: "intent",
				label: "Plan & Execute",
				description:
					"Identify the appropriate tools and initiate their execution",
				status: "success",
				duration: 180 + Math.floor(Math.random() * 100),
				input: { message: userInput },
				output: {
					plan: matchedSkill
						? ["search_knowledge", "execute_skill", "respond"]
						: hasKnowledge
							? ["search_knowledge", "respond"]
							: ["respond"],
					confidence: 0.87 + Math.random() * 0.1,
				},
			},
		];

		// Add knowledge search step if agent has knowledge
		if (hasKnowledge) {
			const knowledgeFailed = isTimeoutTest || isConnectionError;
			trace.push({
				id: "knowledge",
				type: "knowledge",
				label: "Company search",
				description: knowledgeFailed
					? isTimeoutTest
						? "Search timed out"
						: "Connection failed"
					: isNoResults
						? "No relevant company knowledge found"
						: "Checking for any relevant company knowledge",
				status: knowledgeFailed ? "error" : "success",
				duration: isTimeoutTest ? 30000 : 800 + Math.floor(Math.random() * 400),
				input: { query: userInput, sources: config.knowledgeSources },
				output: knowledgeFailed
					? undefined
					: {
							documentsFound: isNoResults
								? 0
								: Math.floor(Math.random() * 5) + 1,
							sources: config.knowledgeSources.slice(0, 2),
						},
				error: isTimeoutTest
					? "The knowledge search took too long to respond. Try again or check your data source connection."
					: isConnectionError
						? "Couldn't connect to the knowledge source. The service may be temporarily unavailable."
						: undefined,
			});
		}

		// Add skill execution step if matched
		if (matchedSkill) {
			const skillFailed = isConnectionError && !isTimeoutTest;
			trace.push({
				id: "skill",
				type: "skill",
				label: `Skill: ${matchedSkill}`,
				description: skillFailed
					? "Skill execution failed"
					: "Execute matched skill",
				status: skillFailed ? "error" : "success",
				duration: skillFailed ? 150 : 600 + Math.floor(Math.random() * 300),
				input: { skill: matchedSkill, params: { userInput } },
				output: skillFailed
					? undefined
					: { executed: true, result: "Action completed" },
				error: skillFailed
					? `The "${matchedSkill}" skill couldn't complete. The connected service isn't responding.`
					: undefined,
			});
		}

		// Determine if any previous step failed
		const hasPreviousError = trace.some((t) => t.status === "error");

		// Add guardrail check only if there are guardrails
		if (config.guardrails.filter(Boolean).length > 0) {
			trace.push({
				id: "guardrail",
				type: "guardrail",
				label: "Guardrail",
				description: matchedGuardrail
					? `Blocked topic: ${matchedGuardrail}`
					: "Verify response meets safety guidelines",
				status: matchedGuardrail ? "error" : "success",
				duration: 45 + Math.floor(Math.random() * 30),
				input: { guardrails: config.guardrails.filter(Boolean) },
				output: {
					passed: !matchedGuardrail,
					blocked: matchedGuardrail || null,
					checkedRules: config.guardrails.filter(Boolean).length,
				},
				error: matchedGuardrail
					? `Message blocked by guardrail: ${matchedGuardrail}`
					: undefined,
			});
		}

		// Add response generation
		const responseFailed = matchedGuardrail || hasPreviousError;
		trace.push({
			id: "response",
			type: "response",
			label: "Respond",
			description: responseFailed ? "Generate fallback response" : "Respond",
			status: responseFailed ? "error" : "success",
			duration: 450 + Math.floor(Math.random() * 200),
			input: { context: "Compiled from previous steps" },
			output: {
				responseGenerated: true,
				fallback: responseFailed,
				tokenCount: Math.floor(Math.random() * 200) + 50,
			},
		});

		return trace;
	};

	const handleTestKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleTestSendMessage();
		}
	};

	// Handle clicking a conversation starter in test mode
	const handleTestStarterClick = (starter: string) => {
		setTestInput(starter);
	};

	const inferAgentType = (
		config: AgentConfig,
	): "answer" | "knowledge" | "workflow" => {
		const text =
			`${config.role} ${config.responsibilities} ${config.completionCriteria}`.toLowerCase();

		// Workflow indicators
		const workflowKeywords = [
			"automate",
			"run",
			"execute",
			"trigger",
			"action",
			"task",
			"process",
			"workflow",
			"reset password",
			"create ticket",
			"submit",
			"update system",
		];
		if (workflowKeywords.some((kw) => text.includes(kw))) {
			return "workflow";
		}

		// Knowledge indicators
		const knowledgeKeywords = [
			"document",
			"specific",
			"policy",
			"compliance",
			"handbook",
			"manual",
			"only from",
			"based on",
			"according to",
			"strictly",
		];
		if (knowledgeKeywords.some((kw) => text.includes(kw))) {
			return "knowledge";
		}

		// Default to answer agent
		return "answer";
	};

	// Generate trigger phrase suggestions based on agent config
	const generateTriggerPhrases = (agentConfig: AgentConfig): string[] => {
		const desc = agentConfig.description.toLowerCase();
		const role = agentConfig.role.toLowerCase();
		const responsibilities = agentConfig.responsibilities.toLowerCase();

		// Onboarding-related agent
		if (
			desc.includes("onboarding") ||
			role.includes("onboarding") ||
			responsibilities.includes("onboarding") ||
			responsibilities.includes("new employee")
		) {
			return [
				"I'm a new employee and need help getting started",
				"Can you help me with my first day orientation?",
				"I need to set up my accounts and access",
				"What do I need to do for onboarding?",
				"Help me understand the company processes",
				"I'm new here, what are my next steps?",
				"Can you guide me through employee orientation?",
				"I need help with new hire paperwork",
				"What tools and systems do I need access to?",
				"Can you explain the onboarding workflow?",
			];
		}

		// HR/Benefits-related agent
		if (
			desc.includes("hr") ||
			desc.includes("benefits") ||
			role.includes("hr") ||
			responsibilities.includes("pto") ||
			responsibilities.includes("benefits")
		) {
			return [
				"How do I request time off?",
				"What are my health insurance options?",
				"How do I enroll in benefits?",
				"What's the PTO policy?",
				"How do I update my personal information?",
				"Who do I contact about payroll issues?",
				"What holidays does the company observe?",
				"How do I access my pay stubs?",
			];
		}

		// IT/Technical support agent
		if (
			desc.includes("it") ||
			desc.includes("technical") ||
			role.includes("it") ||
			responsibilities.includes("password") ||
			responsibilities.includes("access")
		) {
			return [
				"I forgot my password",
				"How do I reset my password?",
				"I need access to a system",
				"My computer isn't working",
				"How do I connect to VPN?",
				"I need software installed",
				"Who do I contact for IT help?",
				"How do I set up my email?",
			];
		}

		// Default generic phrases
		return [
			"How can you help me?",
			"What can you do?",
			"I have a question",
			"I need assistance",
			"Can you help me with something?",
			"Where do I find information about...",
		];
	};

	// Generate Overall Understanding summary based on config and type
	const generateOverallUnderstanding = (
		agentConfig: AgentConfig,
		agentType: "answer" | "knowledge" | "workflow",
	): string => {
		const role = agentConfig.role || "assistant";
		const responsibilities = agentConfig.responsibilities || "helping users";
		const completion =
			agentConfig.completionCriteria || "when the task is complete";

		if (agentType === "answer") {
			return `This is an answer formatting agent that acts as ${role}. It will take pre-retrieved content and transform it into clear, conversational responses while ${responsibilities}. The agent considers its job complete when ${completion}.`;
		} else if (agentType === "knowledge") {
			return `This is an embedded knowledge agent that acts as ${role}. It will provide answers directly from its pre-configured knowledge base, ${responsibilities}. The agent considers its job complete when ${completion}.`;
		} else {
			return `This is a workflow execution agent that acts as ${role}. It will run automations and workflows while ${responsibilities}, then explain the results clearly. The agent considers its job complete when ${completion}.`;
		}
	};

	// Suggest relevant knowledge sources based on agent config
	const suggestRelevantSources = (agentConfig: AgentConfig): string[] => {
		const text =
			`${agentConfig.description} ${agentConfig.role} ${agentConfig.responsibilities}`.toLowerCase();

		// Score each source based on tag matches
		const scored = AVAILABLE_KNOWLEDGE_SOURCES.map((source) => {
			let score = 0;
			source.tags.forEach((tag) => {
				if (text.includes(tag)) score += 2;
			});
			// Also check name/description
			if (text.includes(source.name.toLowerCase())) score += 3;
			source.description
				.toLowerCase()
				.split(" ")
				.forEach((word) => {
					if (word.length > 3 && text.includes(word)) score += 1;
				});
			return { id: source.id, score };
		});

		// Return top matches (score > 0), sorted by score
		return scored
			.filter((s) => s.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 5)
			.map((s) => s.id);
	};

	const addAssistantMessage = (
		content: string,
		options?: { showButtons?: boolean },
	) => {
		setIsTyping(true);
		setShowConfirmButtons(false);

		setTimeout(() => {
			const newMessage: BuilderMessage = {
				id: Date.now().toString(),
				role: "assistant",
				content,
			};
			setMessages((prev) => [...prev, newMessage]);
			setIsTyping(false);
			if (options?.showButtons) {
				setShowConfirmButtons(true);
			}
		}, 800);
	};

	const processUserInput = (input: string) => {
		switch (step) {
			case "start":
			case "intent":
				setConfig((prev) => ({
					...prev,
					description: input,
				}));
				setStep("role");
				addAssistantMessage(
					`Got it. Let's define who this agent is.\n\n**How would you describe the role or persona of this agent?**\nFor example: "a friendly HR advisor" or "an on-call IT specialist."`,
				);
				break;

			case "role":
				setConfig((prev) => ({ ...prev, role: input }));
				setStep("responsibilities");
				addAssistantMessage(
					`Nice. Now let's get specific.\n\n**What should this agent help with day to day?**\nYou can list the types of questions or situations it should handle.`,
				);
				break;

			case "responsibilities":
				setConfig((prev) => ({ ...prev, responsibilities: input }));
				setStep("completion");
				addAssistantMessage(
					`Almost there.\n\n**When should this agent consider its job complete?**\nFor example, when the question is answered, when next steps are provided, or when it needs to hand off to a human.`,
				);
				break;

			case "completion": {
				const updatedConfig = { ...config, completionCriteria: input };
				const inferredType = inferAgentType(updatedConfig);
				setConfig(updatedConfig);
				_setSuggestedType(inferredType);
				setSelectedType(inferredType);
				setStep("select_type");

				setIsTyping(true);
				setTimeout(() => {
					setMessages((prev) => [
						...prev,
						{
							id: Date.now().toString(),
							role: "assistant",
							content: `Based on what you shared, I'd suggest an **${AGENT_TYPE_INFO[inferredType].label}** for this use case.\n\nPlease select the agent type that best fits your needs:`,
						},
					]);
					setIsTyping(false);
					setShowTypeSelector(true);
				}, 800);
				break;
			}

			case "done":
				// In done state, parse natural language to update config
				handleDoneStateInput(input);
				break;
		}
	};

	// Handle natural language config updates when in "done" state
	const handleDoneStateInput = (input: string) => {
		const lowerInput = input.toLowerCase();
		let handled = false;
		const changes: string[] = [];

		// Name change
		const nameMatch =
			input.match(
				/(?:change|set|update|rename)\s+(?:the\s+)?(?:agent\s+)?name\s+(?:to\s+)?["']?([^"']+)["']?/i,
			) ||
			input.match(/(?:call\s+(?:it|this|the\s+agent)\s+)["']?([^"']+)["']?/i);
		if (nameMatch) {
			const newName = nameMatch[1].trim();
			setConfig((prev) => ({ ...prev, name: newName }));
			changes.push(`name to "${newName}"`);
			handled = true;
		}

		// Description change
		const descMatch =
			input.match(
				/(?:change|set|update)\s+(?:the\s+)?description\s+(?:to\s+)?["']?([^"']+)["']?/i,
			) ||
			input.match(/(?:make\s+(?:the\s+)?description)\s+["']?([^"']+)["']?/i);
		if (descMatch) {
			const newDesc = descMatch[1].trim();
			setConfig((prev) => ({ ...prev, description: newDesc }));
			changes.push(`description`);
			handled = true;
		}

		// Add conversation starter
		const starterMatch =
			input.match(
				/(?:add|create)\s+(?:a\s+)?(?:conversation\s+)?starter[:\s]+["']?([^"']+)["']?/i,
			) ||
			input.match(
				/add\s+["']([^"']+)["']\s+(?:as\s+)?(?:a\s+)?(?:conversation\s+)?starter/i,
			);
		if (starterMatch) {
			const newStarter = starterMatch[1].trim();
			if (
				config.conversationStarters.length < 6 &&
				!config.conversationStarters.includes(newStarter)
			) {
				setConfig((prev) => ({
					...prev,
					conversationStarters: [...prev.conversationStarters, newStarter],
				}));
				changes.push(`conversation starter "${newStarter}"`);
				handled = true;
			}
		}

		// Remove conversation starter
		const removeStarterMatch = input.match(
			/(?:remove|delete)\s+(?:the\s+)?(?:conversation\s+)?starter[:\s]+["']?([^"']+)["']?/i,
		);
		if (removeStarterMatch) {
			const toRemove = removeStarterMatch[1].trim().toLowerCase();
			const idx = config.conversationStarters.findIndex((s) =>
				s.toLowerCase().includes(toRemove),
			);
			if (idx !== -1) {
				const removed = config.conversationStarters[idx];
				setConfig((prev) => ({
					...prev,
					conversationStarters: prev.conversationStarters.filter(
						(_, i) => i !== idx,
					),
				}));
				changes.push(`removed starter "${removed}"`);
				handled = true;
			}
		}

		// Add guardrail
		const guardrailMatch =
			input.match(
				/(?:add|create)\s+(?:a\s+)?guardrail[:\s]+["']?([^"']+)["']?/i,
			) ||
			input.match(
				/(?:don't|do\s+not|shouldn't)\s+(?:answer|help\s+with|handle)\s+["']?([^"']+)["']?/i,
			);
		if (guardrailMatch) {
			const newGuardrail = guardrailMatch[1].trim();
			if (!config.guardrails.includes(newGuardrail)) {
				setConfig((prev) => ({
					...prev,
					guardrails: [...prev.guardrails, newGuardrail],
				}));
				changes.push(`guardrail for "${newGuardrail}"`);
				handled = true;
			}
		}

		// Enable/disable web search
		if (lowerInput.includes("enable") && lowerInput.includes("web search")) {
			setConfig((prev) => ({
				...prev,
				capabilities: { ...prev.capabilities, webSearch: true },
			}));
			changes.push("enabled web search");
			handled = true;
		}
		if (lowerInput.includes("disable") && lowerInput.includes("web search")) {
			setConfig((prev) => ({
				...prev,
				capabilities: { ...prev.capabilities, webSearch: false },
			}));
			changes.push("disabled web search");
			handled = true;
		}

		// Change agent type
		if (lowerInput.includes("change") && lowerInput.includes("type")) {
			if (lowerInput.includes("answer")) {
				setConfig((prev) => ({ ...prev, agentType: "answer" }));
				changes.push("agent type to Answer Agent");
				handled = true;
			} else if (lowerInput.includes("knowledge")) {
				setConfig((prev) => ({ ...prev, agentType: "knowledge" }));
				changes.push("agent type to Knowledge Agent");
				handled = true;
			} else if (lowerInput.includes("workflow")) {
				setConfig((prev) => ({ ...prev, agentType: "workflow" }));
				changes.push("agent type to Workflow Agent");
				handled = true;
			}
		}

		// Update instructions
		const instructionsMatch = input.match(
			/(?:change|set|update)\s+(?:the\s+)?instructions?\s+(?:to\s+)?["']?(.+)["']?$/i,
		);
		if (instructionsMatch) {
			const newInstructions = instructionsMatch[1].trim();
			setConfig((prev) => ({ ...prev, instructions: newInstructions }));
			changes.push("instructions");
			handled = true;
		}

		// Handle skill-related questions
		if (
			lowerInput.includes("skill") ||
			lowerInput.includes("find skill") ||
			lowerInput.includes("add skill")
		) {
			const currentSkills =
				config.workflows.length > 0
					? `**Current skills:**\n${config.workflows.map((s) => `• ${s}`).join("\n")}\n\n`
					: "";

			addAssistantMessage(
				`${currentSkills}**Suggested skills for ${config.name || "this agent"}:**\n` +
					`• Check VPN status\n` +
					`• Submit IT ticket\n` +
					`• Software installation request\n` +
					`• Hardware replacement request\n` +
					`• Email configuration help\n\n` +
					`**To add skills:**\n` +
					`1. Switch to the **Configure** tab\n` +
					`2. Click "+ Add skill" in the Skills section\n` +
					`3. Browse or search available skills\n` +
					`4. Select skills and click "Add"`,
			);
			return;
		}

		// Provide feedback
		if (handled && changes.length > 0) {
			const changeList = changes.join(", ");
			addAssistantMessage(
				`✓ Updated ${changeList}. The preview has been refreshed.\n\nWhat else would you like to change?`,
			);
		} else {
			// Try to be helpful with unhandled input
			addAssistantMessage(
				`I can help you update your agent! Try commands like:\n\n` +
					`• "Change the name to [new name]"\n` +
					`• "Add a conversation starter: [question]"\n` +
					`• "Add a guardrail: [topic to avoid]"\n` +
					`• "Enable/disable web search"\n` +
					`• "Change the type to [answer/knowledge/workflow]"\n\n` +
					`Or switch to the **Configure** tab to make changes directly.`,
			);
		}
	};

	// Handler for type selection confirmation (new flow)

	// Handler for confirming the agent type understanding

	// Handler for continuing after trigger phrases

	// Handler for guardrails input submission
	const handleGuardrailsSubmit = () => {
		setShowGuardrails(false);

		const input = guardrailInput.trim();
		const isNone = input.toLowerCase() === "none" || input === "";

		const userMessage: BuilderMessage = {
			id: Date.now().toString(),
			role: "user",
			content: isNone ? "None - handle all related requests" : input,
		};
		setMessages((prev) => [...prev, userMessage]);

		// Parse guardrails from input (split by commas, newlines, or bullet points)
		const guardrails = isNone
			? []
			: input
					.split(/[,\n•]/)
					.map((s) => s.trim())
					.filter((s) => s.length > 0);

		setConfig((prev) => ({
			...prev,
			guardrails,
		}));

		// Move to source/workflow selection based on type
		setStep("select_sources");
		setIsTyping(true);
		_setStatusMessage("Loading available resources...");

		// Calculate suggested sources based on agent config
		const suggested = suggestRelevantSources(config);
		_setSuggestedSourceIds(suggested);
		// Pre-select suggested sources
		setSelectedSources(suggested);
		_setSourceSearchQuery("");

		setTimeout(() => {
			setIsTyping(false);
			_setStatusMessage(null);

			const hasSuggestions = suggested.length > 0;

			if (selectedType === "answer") {
				setMessages((prev) => [
					...prev,
					{
						id: Date.now().toString(),
						role: "assistant",
						content: hasSuggestions
							? `To help this agent answer questions effectively, I've pre-selected some relevant knowledge sources based on what you described.\n\nReview and adjust the selection, or search for more:`
							: `To help this agent answer questions effectively, you can connect knowledge sources.\n\nSelect the sources this agent should use (or skip if not needed):`,
					},
				]);
			} else if (selectedType === "knowledge") {
				setMessages((prev) => [
					...prev,
					{
						id: Date.now().toString(),
						role: "assistant",
						content: hasSuggestions
							? `Since this is an **Embedded Knowledge Agent**, it will only answer from specific documents.\n\nI've pre-selected some relevant sources. Review and adjust (at least one required):`
							: `Since this is an **Embedded Knowledge Agent**, it will only answer from specific documents — no guessing.\n\n**Select the documents this agent must use** (at least one required):`,
					},
				]);
			} else {
				setMessages((prev) => [
					...prev,
					{
						id: Date.now().toString(),
						role: "assistant",
						content: `Since this is a **Workflow Executor**, it needs workflows to perform actions.\n\n**Select the workflows this agent can execute** (at least one required):`,
					},
				]);
			}
			setShowSourceSelector(true);
		}, 800);
	};

	// Handler for skipping guardrails

	// Handler for adjusting the agent type (goes back to selection)

	// Handler for source/workflow selection confirmation

	// Toggle source selection

	const handleBack = () => {
		navigate("/agents");
	};

	const handlePublish = () => {
		// Show publish confirmation modal
		setShowPublishModal(true);
	};

	// Calculate diff between current config and published config
	const getConfigChanges = () => {
		if (!publishedConfig) return [];

		const changes: Array<{
			field: string;
			label: string;
			from: string;
			to: string;
			type: "added" | "removed" | "changed";
		}> = [];

		// Name
		if (config.name !== publishedConfig.name) {
			changes.push({
				field: "name",
				label: "Name",
				from: publishedConfig.name,
				to: config.name,
				type: "changed",
			});
		}

		// Description
		if (config.description !== publishedConfig.description) {
			changes.push({
				field: "description",
				label: "Description",
				from: publishedConfig.description || "(empty)",
				to: config.description || "(empty)",
				type: "changed",
			});
		}

		// Skills (workflows)
		const addedSkills = config.workflows.filter(
			(s) => !publishedConfig.workflows.includes(s),
		);
		const removedSkills = publishedConfig.workflows.filter(
			(s) => !config.workflows.includes(s),
		);
		addedSkills.forEach((skill) => {
			changes.push({
				field: "skills",
				label: "Skill added",
				from: "",
				to: skill,
				type: "added",
			});
		});
		removedSkills.forEach((skill) => {
			changes.push({
				field: "skills",
				label: "Skill removed",
				from: skill,
				to: "",
				type: "removed",
			});
		});

		// Knowledge sources
		const addedKnowledge = config.knowledgeSources.filter(
			(k) => !publishedConfig.knowledgeSources.includes(k),
		);
		const removedKnowledge = publishedConfig.knowledgeSources.filter(
			(k) => !config.knowledgeSources.includes(k),
		);
		addedKnowledge.forEach((source) => {
			changes.push({
				field: "knowledge",
				label: "Knowledge added",
				from: "",
				to: source,
				type: "added",
			});
		});
		removedKnowledge.forEach((source) => {
			changes.push({
				field: "knowledge",
				label: "Knowledge removed",
				from: source,
				to: "",
				type: "removed",
			});
		});

		// Instructions
		if (config.instructions !== publishedConfig.instructions) {
			changes.push({
				field: "instructions",
				label: "Instructions",
				from: "(modified)",
				to: "(modified)",
				type: "changed",
			});
		}

		// Conversation starters
		const startersChanged =
			JSON.stringify(config.conversationStarters) !==
			JSON.stringify(publishedConfig.conversationStarters);
		if (startersChanged) {
			changes.push({
				field: "starters",
				label: "Conversation starters",
				from: `${publishedConfig.conversationStarters.length} items`,
				to: `${config.conversationStarters.length} items`,
				type: "changed",
			});
		}

		// Guardrails
		const guardrailsChanged =
			JSON.stringify(config.guardrails) !==
			JSON.stringify(publishedConfig.guardrails);
		if (guardrailsChanged) {
			changes.push({
				field: "guardrails",
				label: "Guardrails",
				from: `${publishedConfig.guardrails.length} items`,
				to: `${config.guardrails.length} items`,
				type: "changed",
			});
		}

		// Capabilities
		if (
			config.capabilities.webSearch !== publishedConfig.capabilities.webSearch
		) {
			changes.push({
				field: "webSearch",
				label: "Web search",
				from: publishedConfig.capabilities.webSearch ? "Enabled" : "Disabled",
				to: config.capabilities.webSearch ? "Enabled" : "Disabled",
				type: "changed",
			});
		}
		if (
			config.capabilities.useAllWorkspaceContent !==
			publishedConfig.capabilities.useAllWorkspaceContent
		) {
			changes.push({
				field: "workspaceContent",
				label: "Workspace knowledge",
				from: publishedConfig.capabilities.useAllWorkspaceContent
					? "Enabled"
					: "Disabled",
				to: config.capabilities.useAllWorkspaceContent ? "Enabled" : "Disabled",
				type: "changed",
			});
		}

		// Icon
		if (
			config.iconId !== publishedConfig.iconId ||
			config.iconColorId !== publishedConfig.iconColorId
		) {
			changes.push({
				field: "icon",
				label: "Icon",
				from: "(changed)",
				to: "(changed)",
				type: "changed",
			});
		}

		return changes;
	};

	const configChanges = isEditing ? getConfigChanges() : [];
	const hasChanges = configChanges.length > 0;

	const handleConfirmPublish = () => {
		console.log("Publishing agent:", config);
		setShowPublishModal(false);

		// Fire confetti celebration
		const duration = 3000;
		const animationEnd = Date.now() + duration;
		const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

		const randomInRange = (min: number, max: number) =>
			Math.random() * (max - min) + min;

		const interval = window.setInterval(() => {
			const timeLeft = animationEnd - Date.now();
			if (timeLeft <= 0) {
				return clearInterval(interval);
			}
			const particleCount = 50 * (timeLeft / duration);
			confetti({
				...defaults,
				particleCount,
				origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
			});
			confetti({
				...defaults,
				particleCount,
				origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
			});
		}, 250);

		// Navigate back to agents list with published agent data (toast shown on arrival)
		navigate("/agents", {
			state: {
				publishedAgent: {
					id: isEditing ? agentId : Date.now().toString(),
					name: config.name,
					description: config.description,
					agentType: config.agentType,
					iconId: config.iconId,
					iconColorId: config.iconColorId,
					skills: config.workflows,
				},
			},
		});
	};

	const handleSendMessage = () => {
		if (!inputValue.trim() || isTyping || showConfirmButtons) return;

		const userMessage: BuilderMessage = {
			id: Date.now().toString(),
			role: "user",
			content: inputValue.trim(),
		};

		setMessages((prev) => [...prev, userMessage]);
		const input = inputValue.trim();
		setInputValue("");

		processUserInput(input);
	};

	const renderMessageContent = (content: string) => {
		// Simple markdown-like bold parsing
		const parts = content.split(/(\*\*[^*]+\*\*)/g);
		return parts.map((part, i) => {
			if (part.startsWith("**") && part.endsWith("**")) {
				return <strong key={i}>{part.slice(2, -2)}</strong>;
			}
			return <span key={i}>{part}</span>;
		});
	};

	return (
		<div className="flex flex-col h-screen bg-muted/50">

			{/* Header */}
			<header className="flex items-center justify-between px-4 py-3 bg-white border-b">
				<div className="flex items-center gap-3">
					<Button
						variant="ghost"
						size="icon"
						onClick={handleBack}
						aria-label="Go back to agents"
					>
						<ArrowLeft className="size-5" />
					</Button>
					<h1 className="text-lg font-medium">{config.name}</h1>
					<Badge
						variant={isEditing || step === "done" ? "default" : "secondary"}
					>
						{isEditing ? (
							<>
								<Check className="size-3 mr-1" />
								Published
							</>
						) : step === "done" ? (
							<>
								<Check className="size-3 mr-1" />
								Ready to publish
							</>
						) : (
							"Draft"
						)}
					</Badge>
					{(step === "done" || isEditing) && (
						<SaveStatusIndicator
							status={saveStatus}
							isDirty={isDirty}
							error={saveError}
						/>
					)}
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" className="gap-2">
						<HelpCircle className="size-4" />
						How agent builder works
					</Button>
					<Button
						variant="outline"
						className="gap-2"
						onClick={() =>
							navigate(isEditing ? `/agents/${agentId}/test` : "/agents/test", {
								state: { agentConfig: config },
							})
						}
						disabled={
							!config.name ||
							config.name === "my agent" ||
							(!config.description &&
								!config.instructions &&
								!config.conversationStarters.some((s) => s.trim()))
						}
					>
						<Play className="size-4" />
						Test
					</Button>
					{isEditing ? (
						<>
							<Button
								variant="outline"
								onClick={() => setShowUnpublishModal(true)}
							>
								Unpublish
							</Button>
							<Button
								onClick={() => setShowPublishChangesModal(true)}
								disabled={!hasChanges}
							>
								Publish changes
								{hasChanges && (
									<span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs">
										{configChanges.length}
									</span>
								)}
							</Button>
						</>
					) : (
						<Button
							onClick={handlePublish}
							disabled={
								!config.name || (!config.instructions && !config.description)
							}
						>
							Publish
						</Button>
					)}
				</div>
			</header>

			{/* Main content */}
			<div className="flex flex-1 overflow-hidden p-4 gap-4 justify-center">
				{/* Left panel - Configure/Access */}
				<div className="flex flex-col flex-1 max-w-3xl bg-white rounded-xl">
					{/* Configure content */}
					<div className="flex-1 overflow-y-auto p-6">
							<div className="max-w-2xl mx-auto space-y-8">
								{/* Name of agent with icon picker */}
								<div>
									<Label htmlFor="agent-name" className="text-sm font-medium">
										Name of agent
									</Label>
									<div className="flex items-center gap-4 mt-2">
										<Input
											id="agent-name"
											value={config.name}
											onChange={(e) =>
												setConfig((prev) => ({ ...prev, name: e.target.value }))
											}
											placeholder="Enter agent name"
											className="flex-1"
										/>
										{/* Icon picker button */}
										<div className="relative flex items-center">
											<button
												onClick={() => setShowIconPicker(!showIconPicker)}
												className={cn(
													"size-[38px] rounded-lg flex items-center justify-center transition-colors",
													ICON_COLORS.find((c) => c.id === config.iconColorId)
														?.bg || "bg-violet-200",
												)}
												aria-label="Change agent icon"
											>
												{(() => {
													const iconData = AVAILABLE_ICONS.find(
														(i) => i.id === config.iconId,
													);
													const colorData = ICON_COLORS.find(
														(c) => c.id === config.iconColorId,
													);
													const IconComponent = iconData?.icon || Bot;
													return (
														<IconComponent
															className={cn(
																"size-6",
																colorData?.text || "text-white",
															)}
														/>
													);
												})()}
											</button>
											<Button
												variant="ghost"
												size="icon"
												className="size-9"
												onClick={() => setShowIconPicker(!showIconPicker)}
											>
												<ChevronDown className="size-4" />
											</Button>

											{/* Icon Picker Dropdown */}
											{showIconPicker && (
												<div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border z-50 p-4">
													{/* Color selection */}
													<div className="mb-4">
														<p className="text-sm font-medium text-muted-foreground mb-2">
															Color
														</p>
														<div className="flex gap-2">
															{ICON_COLORS.map((color) => (
																<button
																	key={color.id}
																	onClick={() =>
																		setConfig((prev) => ({
																			...prev,
																			iconColorId: color.id,
																		}))
																	}
																	className={cn(
																		"size-10 rounded-full transition-all",
																		color.bg,
																		config.iconColorId === color.id
																			? "ring-2 ring-offset-2 ring-primary"
																			: "hover:scale-110",
																	)}
																	aria-label={`Select ${color.id} color`}
																/>
															))}
														</div>
													</div>

													{/* Icon selection */}
													<div>
														<p className="text-sm font-medium text-muted-foreground mb-2">
															Icon
														</p>
														<div className="relative mb-3">
															<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
															<Input
																placeholder="Find by type, role, or expertise"
																value={iconSearchQuery}
																onChange={(e) =>
																	setIconSearchQuery(e.target.value)
																}
																className="pl-9"
															/>
														</div>
														<div className="grid grid-cols-6 gap-1 max-h-[240px] overflow-y-auto">
															{AVAILABLE_ICONS.filter((icon) => {
																if (!iconSearchQuery) return true;
																const query = iconSearchQuery.toLowerCase();
																return (
																	icon.id.includes(query) ||
																	icon.keywords.some((k) => k.includes(query))
																);
															}).map((iconData) => {
																const IconComponent = iconData.icon;
																return (
																	<button
																		key={iconData.id}
																		onClick={() => {
																			setConfig((prev) => ({
																				...prev,
																				iconId: iconData.id,
																			}));
																			setShowIconPicker(false);
																			setIconSearchQuery("");
																		}}
																		className={cn(
																			"size-10 rounded-lg flex items-center justify-center transition-colors",
																			config.iconId === iconData.id
																				? "bg-primary/10 text-primary"
																				: "hover:bg-muted text-muted-foreground hover:text-foreground",
																		)}
																	>
																		<IconComponent className="size-5" />
																	</button>
																);
															})}
														</div>
													</div>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Description - Collapsible */}
								{!showDescription && !config.description?.trim() ? (
									<button
										onClick={() => setShowDescription(true)}
										className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
									>
										<Plus className="size-4" />
										<span>Add description</span>
									</button>
								) : (
									<div>
										<Label
											htmlFor="agent-description"
											className="text-sm font-medium"
										>
											Description
										</Label>
										<Textarea
											id="agent-description"
											value={config.description}
											onChange={(e) =>
												setConfig((prev) => ({
													...prev,
													description: e.target.value,
												}))
											}
											placeholder="Answers IT support questions and helps employees troubleshoot common technical issues."
											className="mt-2 min-h-[60px] resize-none text-muted-foreground"
											autoFocus={showDescription && !config.description}
										/>
									</div>
								)}

								{/* Skills Section */}
								<div id="skills-section" className="space-y-2">
									<div className="flex items-start justify-between">
										<div>
											<Label className="text-sm font-medium">Skills</Label>
											<p className="text-sm text-muted-foreground mt-1">
												Help users understand what this agent can help them with
												by adding skills
											</p>
										</div>
										<Button
											variant="outline"
											size="sm"
											className="h-8 gap-1.5"
											onClick={() => setShowAddSkillModal(true)}
										>
											<Plus className="size-4" />
											Add skill
										</Button>
									</div>

									{config.workflows.length === 0 ? (
										/* Empty state */
										<button
											onClick={() => setShowAddSkillModal(true)}
											className="w-full border border-dashed rounded-lg py-6 px-4 text-center hover:border-muted-foreground/50 transition-colors"
										>
											<p className="text-sm font-medium">Add skills</p>
											<p className="text-sm text-muted-foreground mt-1">
												Add existing skills to this agent to improve context
											</p>
										</button>
									) : (
										/* Added skills list - Resolve Actions/Workflows use violet icons */
										<div className="border rounded-md px-4 py-2">
											<div className="space-y-1">
												{config.workflows.map((workflow, index) => {
													const skillData = AVAILABLE_SKILLS.find(
														(s) => s.name === workflow,
													);
													const SkillIcon = skillData?.icon || Zap;
													return (
														<div
															key={index}
															className="flex items-center gap-2.5 py-1"
														>
															<div className="size-5 rounded flex items-center justify-center flex-shrink-0 bg-violet-200">
																<SkillIcon className="size-3 text-foreground" />
															</div>
															<span className="text-xs flex-1">{workflow}</span>
															<button
																onClick={() => {
																	const updated = config.workflows.filter(
																		(_, i) => i !== index,
																	);
																	setConfig((prev) => ({
																		...prev,
																		workflows: updated,
																	}));
																}}
																className="p-2 text-muted-foreground hover:text-foreground"
															>
																<X className="size-3" />
															</button>
														</div>
													);
												})}
											</div>
										</div>
									)}
								</div>

								{/* Instructions Section */}
								<div className="space-y-2">
									<div>
										<Label
											htmlFor="instructions"
											className="text-sm font-medium"
										>
											Instructions
										</Label>
										<p className="text-sm text-muted-foreground mt-1">
											Control your agents behavior by adding instructions.
										</p>
									</div>

									{/* Instructions textarea with footer */}
									<div className="border rounded-lg overflow-hidden">
										<div className="relative">
											<Textarea
												id="instructions"
												value={config.instructions}
												onChange={(e) =>
													setConfig((prev) => ({
														...prev,
														instructions: e.target.value,
													}))
												}
												placeholder={"## Role\n\n## Backstory\n\n## Goal\n\n## Task"}
												className="min-h-[80px] max-h-[120px] resize-none text-sm border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
											/>
											<button
												className="absolute top-2 right-2 p-2 text-muted-foreground hover:text-foreground"
												aria-label="Expand instructions"
												onClick={() => setShowInstructionsModal(true)}
											>
												<svg
													width="16"
													height="16"
													viewBox="0 0 16 16"
													fill="none"
													xmlns="http://www.w3.org/2000/svg"
												>
													<path
														d="M10 2H14V6M6 14H2V10M14 2L9 7M2 14L7 9"
														stroke="currentColor"
														strokeWidth="1.5"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												</svg>
											</button>
										</div>
									</div>
									<p className="text-xs text-muted-foreground">
										Update instructions as needed
									</p>

									{/* Updated from skills message */}
									{instructionsUpdatedFromSkills && (
										<p className="text-xs text-primary mt-1">
											Updated based on skills
										</p>
									)}
								</div>

								{/* Conversation Starters Section */}
								<div className="space-y-2">
									<div>
										<label className="text-sm font-medium text-foreground">
											Conversation starters
										</label>
										<p className="text-sm text-muted-foreground mt-0.5">
											Suggested prompts shown to users when starting a conversation
										</p>
									</div>
									{/* Input with inline tags */}
									<div className="border rounded-md min-h-9 px-3 py-1.5 flex items-center gap-1 flex-wrap">
										{/* Added starters as solid badges */}
										{config.conversationStarters.map((starter, index) => (
											<div
												key={index}
												className="flex items-center gap-1 px-2 py-0.5 border border-dashed rounded-md text-xs text-muted-foreground whitespace-nowrap"
											>
												<span>{starter}</span>
												<button
													onClick={() => {
														const updated = config.conversationStarters.filter(
															(_, i) => i !== index,
														);
														setConfig((prev) => ({
															...prev,
															conversationStarters: updated,
														}));
													}}
													className="text-muted-foreground hover:text-destructive"
													aria-label={`Remove ${starter}`}
												>
													<X className="size-3" />
												</button>
											</div>
										))}
										{/* Input for typing new starters */}
										{config.conversationStarters.length < 6 && (
											<input
												type="text"
												placeholder="Type and press Enter to add..."
												className="flex-1 min-w-[150px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
												onKeyDown={(e) => {
													const input = e.currentTarget;
													if (
														e.key === "Enter" &&
														input.value.trim()
													) {
														e.preventDefault();
														const newStarter = input.value.trim();
														setConfig((prev) => ({
															...prev,
															conversationStarters: [
																...prev.conversationStarters,
																newStarter,
															],
														}));
														input.value = "";
													}
												}}
											/>
										)}
									</div>
								</div>

								{/* Guardrails Section */}
								<div className="space-y-2">
									<div>
										<label className="text-sm font-medium text-foreground">
											Guardrails
										</label>
										<p className="text-xs text-muted-foreground mt-0.5">
											Topics or requests the agent should NOT handle
										</p>
									</div>

									{config.guardrails.length === 0 ? (
										<button
											onClick={() => {
												setConfig((prev) => ({
													...prev,
													guardrails: [...prev.guardrails, ""],
												}));
											}}
											className="w-full border border-dashed rounded-lg py-4 px-4 text-center hover:border-muted-foreground/50 transition-colors"
										>
											<p className="text-sm text-muted-foreground">
												Add a guardrail
											</p>
										</button>
									) : (
										<div className="space-y-2">
											{config.guardrails.map((guardrail, index) => (
												<div key={index} className="flex items-center gap-2">
													<Input
														value={guardrail}
														onChange={(e) => {
															const updated = [...config.guardrails];
															updated[index] = e.target.value;
															setConfig((prev) => ({
																...prev,
																guardrails: updated,
															}));
														}}
														placeholder="e.g., HR policy questions"
														className="flex-1"
													/>
													<Button
														variant="ghost"
														size="icon"
														className="size-9 text-muted-foreground hover:text-foreground"
														onClick={() => {
															const updated = config.guardrails.filter(
																(_, i) => i !== index,
															);
															setConfig((prev) => ({
																...prev,
																guardrails: updated,
															}));
														}}
													>
														<Trash2 className="size-4" />
													</Button>
												</div>
											))}
											<Button
												variant="ghost"
												size="sm"
												className="h-8 gap-1.5 text-muted-foreground"
												onClick={() => {
													setConfig((prev) => ({
														...prev,
														guardrails: [...prev.guardrails, ""],
													}));
												}}
											>
												<Plus className="size-4" />
												Add guardrail
											</Button>
										</div>
									)}
								</div>

								{/* Knowledge Section */}
								<div className="space-y-2">
									<div>
										<Label className="text-sm font-medium">Knowledge</Label>
										<p className="text-sm text-muted-foreground mt-1">
											Give your agent general knowledge to answer best
										</p>
									</div>

									{/* Search input */}
									<div className="relative">
										<div
											className="border rounded-md px-3 py-2.5 flex items-center gap-2 cursor-pointer hover:border-muted-foreground/50 transition-colors"
											onClick={() => {
												if (!config.capabilities.useAllWorkspaceContent) {
													const input = document.getElementById(
														"knowledge-search-input",
													);
													input?.focus();
												}
											}}
										>
											<Search className="size-3 text-muted-foreground" />
											<input
												id="knowledge-search-input"
												type="text"
												placeholder="Browse files from connected integrations or uploads"
												className={cn(
													"flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground",
													config.capabilities.useAllWorkspaceContent &&
														"opacity-50 cursor-not-allowed",
												)}
												value={knowledgeSearchQuery}
												onChange={(e) =>
													setKnowledgeSearchQuery(e.target.value)
												}
												disabled={config.capabilities.useAllWorkspaceContent}
											/>
										</div>

										{/* Dropdown results */}
										{knowledgeSearchQuery.trim() &&
											!config.capabilities.useAllWorkspaceContent && (
												<div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-[300px] overflow-y-auto z-20">
													{AVAILABLE_KNOWLEDGE_SOURCES.filter((source) => {
														const query = knowledgeSearchQuery.toLowerCase();
														return (
															source.name.toLowerCase().includes(query) ||
															source.description
																.toLowerCase()
																.includes(query) ||
															source.tags.some((tag) =>
																tag.toLowerCase().includes(query),
															)
														);
													}).map((source) => {
														const isAlreadyAdded =
															config.knowledgeSources.includes(source.name);
														return (
															<button
																key={source.id}
																className={cn(
																	"w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/50 transition-colors",
																	isAlreadyAdded && "opacity-50",
																)}
																onClick={() => {
																	if (isAlreadyAdded) return;
																	setConfig((prev) => ({
																		...prev,
																		knowledgeSources: [
																			...prev.knowledgeSources,
																			source.name,
																		],
																	}));
																	setKnowledgeSearchQuery("");
																}}
																disabled={isAlreadyAdded}
															>
																<div
																	className={cn(
																		"size-5 rounded flex items-center justify-center flex-shrink-0",
																		source.type === "upload"
																			? "bg-amber-100"
																			: "bg-blue-100",
																	)}
																>
																	{source.type === "upload" ? (
																		<FileText className="size-3 text-foreground" />
																	) : (
																		<Link2 className="size-3 text-foreground" />
																	)}
																</div>
																<span className="text-sm flex-1">
																	{source.name}
																</span>
																{isAlreadyAdded && (
																	<Check className="size-4 text-primary" />
																)}
															</button>
														);
													})}
													{AVAILABLE_KNOWLEDGE_SOURCES.filter((source) => {
														const query = knowledgeSearchQuery.toLowerCase();
														return (
															source.name.toLowerCase().includes(query) ||
															source.description
																.toLowerCase()
																.includes(query) ||
															source.tags.some((tag) =>
																tag.toLowerCase().includes(query),
															)
														);
													}).length === 0 && (
														<div className="px-4 py-6 text-center text-muted-foreground">
															<p className="text-sm">
																No matching sources found
															</p>
														</div>
													)}
												</div>
											)}
									</div>

									{/* Knowledge container with documents and toggles */}
									<div className="border rounded-lg">
										{/* Documents section - only show when not using all workspace */}
										{!config.capabilities.useAllWorkspaceContent &&
											config.knowledgeSources.length > 0 && (
												<div className="p-2">
													<p className="text-sm text-muted-foreground px-2 py-1">
														Documents ({config.knowledgeSources.length})
													</p>
													<div className="px-2 space-y-1">
														{config.knowledgeSources.map(
															(sourceName, index) => {
																const sourceData =
																	AVAILABLE_KNOWLEDGE_SOURCES.find(
																		(s) => s.name === sourceName,
																	);
																const isConnection =
																	sourceData?.type === "connection";
																return (
																	<div
																		key={index}
																		className="flex items-center gap-2.5 py-1"
																	>
																		<div
																			className={cn(
																				"size-5 rounded flex items-center justify-center flex-shrink-0",
																				isConnection
																					? "bg-blue-100"
																					: "bg-amber-100",
																			)}
																		>
																			{isConnection ? (
																				<Link2 className="size-3 text-foreground" />
																			) : (
																				<FileText className="size-3 text-foreground" />
																			)}
																		</div>
																		<span className="text-xs flex-1">
																			{sourceName}
																		</span>
																		<button
																			onClick={() => {
																				const updated =
																					config.knowledgeSources.filter(
																						(_, i) => i !== index,
																					);
																				setConfig((prev) => ({
																					...prev,
																					knowledgeSources: updated,
																				}));
																			}}
																			className="p-2 text-muted-foreground hover:text-foreground"
																		>
																			<X className="size-3" />
																		</button>
																	</div>
																);
															},
														)}
													</div>
												</div>
											)}

										{/* Toggle options */}
										<div className="px-4">
											<div className="flex items-start gap-3 py-3">
												<Checkbox
													checked={config.capabilities.webSearch}
													onCheckedChange={(checked) =>
														setConfig((prev) => ({
															...prev,
															capabilities: {
																...prev.capabilities,
																webSearch: !!checked,
															},
														}))
													}
													className="mt-0.5"
												/>
												<div className="flex-1">
													<p className="text-sm font-medium">
														Search the web for information
													</p>
													<p className="text-sm text-muted-foreground mt-1">
														Let the agent search and reference information found
														on the websites
													</p>
												</div>
											</div>
											<div className="border-t" />
											<div className="flex items-start gap-3 py-3">
												<Checkbox
													checked={config.capabilities.useAllWorkspaceContent}
													onCheckedChange={(checked) => {
														setConfig((prev) => ({
															...prev,
															capabilities: {
																...prev.capabilities,
																useAllWorkspaceContent: !!checked,
															},
														}));
														if (checked) {
															setKnowledgeSearchQuery("");
														}
													}}
													className="mt-0.5"
												/>
												<div className="flex-1">
													<p className="text-sm font-medium">
														Enable all workspace knowledge
													</p>
													<p className="text-sm text-muted-foreground mt-1">
														Let the agent use all shared integrations, files,
														and other assets in this workspace
													</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
				</div>
			</div>


			{/* Change Agent Type Modal */}
			<ChangeAgentTypeModal
				open={showChangeTypeModal}
				onOpenChange={setShowChangeTypeModal}
				currentType={config.agentType}
				knowledgeSourcesCount={config.knowledgeSources.length}
				workflowsCount={config.workflows.length}
				isEditing={isEditing}
				onConfirm={(newType, needsDoubleConfirm) => {
					if (needsDoubleConfirm) {
						setPendingAgentType(newType);
						setShowConfirmTypeChangeModal(true);
					} else {
						setConfig((prev) => ({
							...prev,
							agentType: newType,
							knowledgeSources: newType === "workflow" ? [] : prev.knowledgeSources,
							workflows: newType === "knowledge" ? [] : prev.workflows,
						}));
					}
				}}
			/>

			{/* Double Confirm Type Change Modal */}
			<ConfirmTypeChangeModal
				open={showConfirmTypeChangeModal}
				onOpenChange={setShowConfirmTypeChangeModal}
				currentType={config.agentType}
				pendingType={pendingAgentType}
				agentName={config.name}
				onGoBack={() => {
					setShowConfirmTypeChangeModal(false);
					setShowChangeTypeModal(true);
				}}
				onConfirm={() => {
					setConfig((prev) => ({
						...prev,
						agentType: pendingAgentType,
						knowledgeSources: pendingAgentType === "workflow" ? [] : prev.knowledgeSources,
						workflows: pendingAgentType === "knowledge" ? [] : prev.workflows,
					}));
					setShowConfirmTypeChangeModal(false);
					setPendingAgentType(null);
				}}
			/>

			{/* Publish Confirmation Modal */}
			<PublishModal
				open={showPublishModal}
				onOpenChange={setShowPublishModal}
				config={config}
				onConfirm={handleConfirmPublish}
			/>

			{/* Unpublish Confirmation Modal */}
			<UnpublishModal
				open={showUnpublishModal}
				onOpenChange={setShowUnpublishModal}
				onConfirm={() => {
					setShowUnpublishModal(false);
					navigate("/agents", {
						state: {
							unpublishedAgent: {
								id: agentId,
								name: config.name,
							},
						},
					});
				}}
			/>

			{/* Instructions Expanded Modal */}
			<InstructionsExpandedModal
				open={showInstructionsModal}
				onOpenChange={setShowInstructionsModal}
				value={config.instructions}
				onChange={(value) => setConfig((prev) => ({ ...prev, instructions: value }))}
			/>

			{/* Create New Workflow Modal */}
			<CreateWorkflowModal
				open={showCreateWorkflowModal}
				onOpenChange={setShowCreateWorkflowModal}
			/>

			{/* Add Skill Modal */}
			<AddSkillModal
				open={showAddSkillModal}
				onOpenChange={setShowAddSkillModal}
				availableSkills={[...AVAILABLE_SKILLS, ...getPublishedWorkflowSkills()]}
				currentWorkflows={config.workflows}
				onAdd={(skillNames, newStarters) => {
					setConfig((prev) => {
						const existingStarters = prev.conversationStarters;
						const startersToAdd = newStarters.filter((s) => !existingStarters.includes(s));
						const availableSlots = 6 - existingStarters.length;
						const finalNewStarters = startersToAdd.slice(0, availableSlots);
						return {
							...prev,
							workflows: [...prev.workflows, ...skillNames],
							conversationStarters: [...existingStarters, ...finalNewStarters],
						};
					});
				}}
			/>

			{/* Unlink Workflow Confirmation Modal */}
			<UnlinkWorkflowModal
				open={showUnlinkConfirm}
				onOpenChange={(open) => {
					setShowUnlinkConfirm(open);
					if (!open) setWorkflowToUnlink(null);
				}}
				workflow={workflowToUnlink}
				onConfirm={() => {
					setConfig((prev) => ({
						...prev,
						workflows: [...prev.workflows, workflowToUnlink.name],
					}));
					setShowUnlinkConfirm(false);
					setWorkflowToUnlink(null);
					toast.success(
						`${workflowToUnlink.name} unlinked from ${workflowToUnlink.linkedAgentName} and added to this agent`,
					);
				}}
			/>
			{/* Demo mode trigger button */}
			{!demoMode && (
				<button
					type="button"
					onClick={() => {
						setDemoMode(true);
						setDemoStep(0);
					}}
					className="fixed bottom-4 left-4 z-50 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-full shadow-lg hover:bg-violet-700 transition-colors flex items-center gap-1.5"
				>
					<Play className="size-3" />
					Demo
				</button>
			)}

			{/* Demo stepper bar */}
			{demoMode && (
				<div className="fixed bottom-0 left-0 right-0 z-50 bg-violet-900 text-white px-6 py-3 flex items-center gap-4 shadow-2xl">
					<div className="flex items-center gap-2">
						<Play className="size-4" />
						<span className="text-sm font-semibold">Demo Mode</span>
					</div>
					<div className="flex-1 flex items-center gap-1">
						{DEMO_STEPS.map((s, i) => (
							<div
								key={s.label}
								className={cn(
									"flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs",
									i === demoStep
										? "bg-white/20 font-medium"
										: i < demoStep
											? "text-white/60"
											: "text-white/40",
								)}
							>
								<span
									className={cn(
										"size-5 rounded-full flex items-center justify-center text-[10px] font-bold",
										i < demoStep
											? "bg-emerald-500"
											: i === demoStep
												? "bg-white text-violet-900"
												: "bg-white/20",
									)}
								>
									{i < demoStep ? (
										<Check className="size-3" />
									) : (
										i + 1
									)}
								</span>
								{s.label}
							</div>
						))}
					</div>
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="ghost"
							className="text-white/70 hover:text-white hover:bg-white/10 h-7 text-xs"
							onClick={handleDemoNext}
						>
							Next
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="text-white/40 hover:text-white hover:bg-white/10 h-7 text-xs"
							onClick={() => {
								setDemoMode(false);
								setDemoStep(0);
							}}
						>
							Exit Demo
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
