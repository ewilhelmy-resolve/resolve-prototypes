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
	ArrowLeft,
	Bot,
	Briefcase,
	Calendar,
	Check,
	ChevronDown,
	Clock,
	Key,
	Loader2,
	Lock,
	MessageSquare,
	Play,
	Plus,
	Search,
	// Icon picker icons
	ShieldCheck,
	Sparkles,
	Trash2,
	Users,
	Workflow,
	X,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
	AddSkillModal,
	AgentCreationOverlay,
	ChangeAgentTypeModal,
	ConfirmTypeChangeModal,
	CreateWorkflowModal,
	ImproveInstructionsDialog,
	InstructionsExpandedModal,
	PublishModal,
	UnlinkWorkflowModal,
	UnpublishModal,
} from "@/components/agents/builder";
import { SaveStatusIndicator } from "@/components/agents/SaveStatusIndicator";
import { FieldHelp } from "@/components/custom/FieldHelp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AVAILABLE_ICONS, ICON_COLORS } from "@/constants/agents";
import {
	useAgent,
	useCheckAgentName,
	useCreateAgent,
	useUpdateAgent,
} from "@/hooks/api/useAgents";
import { useAgentCreation } from "@/hooks/useAgentCreation";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useDebounce } from "@/hooks/useDebounce";
import { useGenerateConversationStarters } from "@/hooks/useGenerateConversationStarters";
import { useImproveInstructions } from "@/hooks/useImproveInstructions";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { agentApi } from "@/services/api";
import { useAgentCreationStore } from "@/stores/agentCreationStore";
import type {
	AgentConfig,
	BuilderMessage,
	ConversationStep,
	DebugTraceStep,
} from "@/types/agent";

const MAX_CONVERSATION_STARTERS = 20;

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
		skillInstructions:
			"Look up employee birthdays from the HR directory. Respond with the employee's name and birthday. If not found, suggest checking the spelling.",
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
		skillInstructions:
			"Guide users through password reset. Verify identity via security questions or MFA before initiating reset. Send temporary password via secure channel and require change on next login.",
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
		skillInstructions:
			"Query the HR system for the user's PTO balance including vacation, sick, and personal days. Show accrued, used, and remaining totals.",
	},
	{
		id: "verify-i9",
		name: "Verify I-9 forms",
		author: "Compliance",
		icon: ShieldCheck,
		starters: ["Check my I-9 status", "Is my I-9 complete?"],
		linkedAgent: "Compliance Checker",
		skillInstructions:
			"Check I-9 employment verification form status. Report whether the form is complete, pending, or missing required documents. Flag any approaching deadlines.",
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
		skillInstructions:
			"Query the background check provider for current status. Report whether the check is pending, in progress, or completed, along with any action items needed.",
	},
	{
		id: "unlock-account",
		name: "Unlock account",
		author: "IT Team",
		icon: Lock,
		starters: ["My account is locked", "Unlock my account", "I can't log in"],
		linkedAgent: "HelpDesk Advisor",
		skillInstructions:
			"Unlock user accounts that have been locked due to failed login attempts. Verify user identity first, then unlock the account in Active Directory. Confirm the account is accessible.",
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
		skillInstructions:
			"Help users submit expense reports. Collect receipt details, amount, category, and business justification. Submit to the finance system and provide a confirmation number.",
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
		skillInstructions:
			"Process system access requests. Collect the target system, required access level, and business justification. Route to the appropriate approver and track request status.",
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
		skillInstructions:
			"Provision new user accounts across enterprise systems. Collect employee details (name, department, role, manager). Create accounts in Active Directory, Google Workspace, and assigned SaaS applications based on department role mapping. Configure email, distribution groups, and default permissions. Send welcome credentials via secure channel.",
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
		skillInstructions:
			"Manage customer engagement touchpoints. Look up customer context from CRM (recent interactions, open tickets, satisfaction score). Draft personalized follow-up messages. Schedule check-ins based on customer health score. Escalate at-risk accounts to the customer success manager.",
	},
];

// Merge in workflow-published skills from localStorage
function getPublishedWorkflowSkills() {
	try {
		const raw = localStorage.getItem("publishedWorkflowSkills");
		if (!raw) return [];
		return JSON.parse(raw).map(
			(s: {
				id: string;
				name: string;
				description?: string;
				author?: string;
				starters?: string[];
				instructions?: string;
			}) => ({
				id: `wf-${s.id}`,
				name: s.name,
				author: "Workflow",
				icon: Workflow,
				starters: [s.description || `Run ${s.name}`],
				linkedAgent: null,
			}),
		);
	} catch {
		return [];
	}
}

// Icon picker options
export default function AgentBuilderPage() {
	const { t } = useTranslation("agents");
	const navigate = useNavigate();
	const location = useLocation();
	const { id: agentId } = useParams<{ id: string }>();
	const agentName = location.state?.agentName || "Untitled Agent";
	const duplicatedConfig = location.state?.duplicatedConfig as
		| AgentConfig
		| undefined;
	const initialConfig = location.state?.initialConfig as
		| AgentConfig
		| undefined;
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Check if we're editing an existing agent
	const isEditing = !!agentId;
	const isDuplicate = !!duplicatedConfig;

	// Fetch existing agent from API when editing
	const {
		data: savedAgent,
		isLoading: isLoadingAgent,
		error: loadError,
	} = useAgent(agentId);

	const isPublished = savedAgent?.status === "published";
	const isDraft = savedAgent?.status === "draft";

	// Track live EID (starts undefined for create, set after first save)
	const [agentEid, setAgentEid] = useState<string | undefined>(agentId);
	const createAgent = useCreateAgent();
	const updateAgent = useUpdateAgent();

	// Default to configure tab
	const [_activeTab, _setActiveTab] = useState<"configure" | "access">(
		"configure",
	);
	const [showTestModal, _setShowTestModal] = useState(false);
	const [_inputValue, _setInputValue] = useState("");
	const [step, setStep] = useState<ConversationStep>(
		isEditing || isDuplicate ? "done" : "start",
	);
	const [_isTyping, _setIsTyping] = useState(false);
	const [config, setConfig] = useState<AgentConfig>(
		duplicatedConfig ||
			initialConfig || {
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

	// Seed config from API data when editing (once loaded)
	const [hasLoadedFromApi, setHasLoadedFromApi] = useState(false);
	useEffect(() => {
		if (savedAgent && !hasLoadedFromApi && !isDuplicate && !initialConfig) {
			setConfig(savedAgent);
			setStep("done");
			setHasLoadedFromApi(true);
		}
	}, [savedAgent, hasLoadedFromApi, isDuplicate, initialConfig]);

	// isCreatingDraft removed — creation now uses async AI flow

	// Debounced name uniqueness check
	const debouncedName = useDebounce(config.name, 300);
	const nameToCheck =
		debouncedName && debouncedName !== savedAgent?.name ? debouncedName : "";
	const { data: nameCheck, isFetching: isCheckingName } =
		useCheckAgentName(nameToCheck);
	const nameTaken = nameCheck?.available === false;
	const nameAvailable =
		nameCheck?.available === true && debouncedName === config.name.trim();
	const [nameTouched, setNameTouched] = useState(false);
	const nameEmpty = nameTouched && config.name.trim().length === 0;
	const [instructionsTouched, setInstructionsTouched] = useState(false);
	const instructionsError =
		instructionsTouched &&
		config.instructions.trim().length === 0 &&
		config.description.trim().length === 0;
	const hasEmptyGuardrails =
		config.guardrails.length > 0 && config.guardrails.some((g) => !g.trim());

	const [_showConfirmButtons, _setShowConfirmButtons] = useState(false);

	// Selection UI states (new flow)
	const [_showTypeSelector, _setShowTypeSelector] = useState(false);
	const [_showSourceSelector, _setShowSourceSelector] = useState(false);
	const [_selectedType, _setSelectedType] = useState<
		"answer" | "knowledge" | "workflow" | null
	>(null);
	const [_selectedSources, _setSelectedSources] = useState<string[]>([]);
	const [_showTypeConfirmation, _setShowTypeConfirmation] = useState(false);
	const [_showTriggerPhrases, _setShowTriggerPhrases] = useState(false);
	const [_suggestedTriggerPhrases, _setSuggestedTriggerPhrases] = useState<
		string[]
	>([]);
	const [_showGuardrails, _setShowGuardrails] = useState(true);
	const [_guardrailInput, _setGuardrailInput] = useState("");

	// Test tab state
	const [testMessages, setTestMessages] = useState<BuilderMessage[]>([]);
	const [_testInput, _setTestInput] = useState("");
	const [_isTestTyping, _setIsTestTyping] = useState(false);
	const [_isTestMode, _setIsTestMode] = useState(false);
	const [_debugTrace, _setDebugTrace] = useState<DebugTraceStep[]>([]);
	const [_expandedStep, _setExpandedStep] = useState<string | null>(null);
	const [_showOnlyErrors, _setShowOnlyErrors] = useState(false);
	const [_showDebugPanel, _setShowDebugPanel] = useState(false);
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
	const iconPickerRef = useRef<HTMLDivElement>(null);
	const handleIconPickerClose = useCallback(() => {
		if (showIconPicker) {
			setShowIconPicker(false);
			setIconSearchQuery("");
		}
	}, [showIconPicker]);
	useClickOutside(iconPickerRef, handleIconPickerClose);

	// Publish modal state
	const [showPublishModal, setShowPublishModal] = useState(false);
	const [showUnpublishModal, setShowUnpublishModal] = useState(false);

	// Create with AI
	const agentCreation = useAgentCreation();
	const isCreationActive = agentCreation.status !== "idle";

	// Improve instructions with AI
	const improveInstructions = useImproveInstructions();
	const [showImproveDialog, setShowImproveDialog] = useState(false);

	// Generate conversation starters with AI
	const generateStarters = useGenerateConversationStarters();

	// Apply generated conversation starters when they arrive
	useEffect(() => {
		if (
			generateStarters.status === "success" &&
			generateStarters.generatedStarters
		) {
			const starters = generateStarters.generatedStarters;
			setConfig((prev) => {
				const existing = prev.conversationStarters;
				const newOnes = starters.filter((s) => !existing.includes(s));
				const availableSlots = MAX_CONVERSATION_STARTERS - existing.length;
				const toAdd = newOnes.slice(0, availableSlots);
				if (toAdd.length === 0) return prev;
				return {
					...prev,
					conversationStarters: [...existing, ...toAdd],
				};
			});
			generateStarters.reset();
		} else if (generateStarters.status === "error") {
			toast.error("Failed to generate conversation starters");
			generateStarters.reset();
		}
	}, [
		generateStarters.status,
		generateStarters.generatedStarters,
		generateStarters.reset,
	]);

	// Track the original published config for diff comparison (only for editing)
	const publishedConfigRef = useRef<AgentConfig | null>(null);
	useEffect(() => {
		if (
			savedAgent &&
			!publishedConfigRef.current &&
			savedAgent.status === "published"
		) {
			publishedConfigRef.current = structuredClone(savedAgent);
		}
	}, [savedAgent]);
	const publishedConfig = publishedConfigRef.current;

	// Workflow picker state
	const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
	const [workflowToUnlink, setWorkflowToUnlink] = useState<{
		id: string;
		name: string;
		linkedAgentName: string;
	} | null>(null);

	// Create new workflow modal state
	const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);

	// Add skill modal state
	const [showAddSkillModal, setShowAddSkillModal] = useState(false);
	// Instructions expanded modal state
	const [showInstructionsModal, setShowInstructionsModal] = useState(false);

	// Conversation starters customization toggle
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
					description: "Updates store operating hours after manager approval",
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
	// Track when skills were just added to show "updated" message
	const [instructionsUpdatedFromSkills, setInstructionsUpdatedFromSkills] =
		useState(false);
	const prevWorkflowsLength = useRef(config.workflows.length);

	// Detect when skills are added and auto-populate instructions
	useEffect(() => {
		if (config.workflows.length > prevWorkflowsLength.current) {
			const allSkillsPool = [
				...AVAILABLE_SKILLS,
				...getPublishedWorkflowSkills(),
			];
			const skillEntries = config.workflows.map((name) => {
				const match = allSkillsPool.find((s) => s.name === name);
				return {
					name,
					instructions: match?.skillInstructions || `Handle ${name} requests.`,
				};
			});

			const skillNames = skillEntries
				.map((s) => s.name.toLowerCase())
				.join(", ");
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

	// Only persist name + icon fields to the API
	const saveableData = useMemo(
		() => ({
			name: config.name,
			iconId: config.iconId,
			iconColorId: config.iconColorId,
		}),
		[config.name, config.iconId, config.iconColorId],
	);

	// Auto-save with 1.5s debounce
	const {
		status: saveStatus,
		isDirty,
		error: saveError,
	} = useAutoSave({
		data: saveableData,
		onSave: async (data) => {
			if (agentEid) {
				await updateAgent.mutateAsync({ eid: agentEid, data });
			} else {
				const created = await createAgent.mutateAsync(data);
				if (created.id) {
					setAgentEid(created.id);
				}
			}
		},
		enabled: (step === "done" && !!agentEid) || isEditing, // Only auto-save when draft exists
	});

	const [_messages] = useState<BuilderMessage[]>([
		{
			id: "1",
			role: "assistant",
			content: `Hi! I can help you build a new agent.\nFirst, what kind of agent are you building today?`,
		},
	]);

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	// Auto-scroll test messages
	useEffect(() => {
		testMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

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

	// Handle natural language config updates when in "done" state

	// Handler for type selection confirmation (new flow)

	// Handler for confirming the agent type understanding

	// Handler for continuing after trigger phrases

	// Handler for guardrails input submission

	// Handler for skipping guardrails

	// Handler for adjusting the agent type (goes back to selection)

	// Handler for source/workflow selection confirmation

	// Toggle source selection

	const handleBack = () => {
		navigate("/agents");
	};

	// handleCreate removed — "Create agent" now uses agentCreation.create() (AI flow)

	const handlePublish = () => {
		// Show publish confirmation modal
		setShowPublishModal(true);
	};

	// Calculate diff between current config and published config (persisted fields only)
	const getConfigChanges = () => {
		if (!publishedConfig) return [];

		const changes: Array<{
			field: string;
			label: string;
			from: string;
			to: string;
			type: "added" | "removed" | "changed";
		}> = [];

		if (config.name !== publishedConfig.name) {
			changes.push({
				field: "name",
				label: "Name",
				from: publishedConfig.name,
				to: config.name,
				type: "changed",
			});
		}

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

	const configChanges = isPublished ? getConfigChanges() : [];
	const hasChanges = configChanges.length > 0;

	const handleConfirmPublish = async () => {
		try {
			const publishData = {
				name: config.name,
				iconId: config.iconId,
				iconColorId: config.iconColorId,
				status: "published" as const,
			};
			if (agentEid) {
				await updateAgent.mutateAsync({ eid: agentEid, data: publishData });
			} else {
				const created = await createAgent.mutateAsync(publishData);
				if (created.id) setAgentEid(created.id);
			}
		} catch {
			toast.error("Failed to publish agent");
			setShowPublishModal(false);
			return;
		}

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
					id: agentEid || agentId || "",
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

	// Loading state when fetching existing agent
	if (isEditing && isLoadingAgent) {
		return (
			<div className="flex items-center justify-center h-screen bg-muted/50">
				<div className="text-muted-foreground">Loading agent...</div>
			</div>
		);
	}

	if (isEditing && loadError) {
		return (
			<div className="flex flex-col items-center justify-center h-screen gap-4 bg-muted/50">
				<div className="text-sm text-muted-foreground">
					Failed to load agent. Please try again.
				</div>
				<Button variant="outline" onClick={() => navigate("/agents")}>
					Back to agents
				</Button>
			</div>
		);
	}

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
						variant={
							isPublished || (!savedAgent && step === "done")
								? "default"
								: "secondary"
						}
					>
						{isPublished ? (
							<>
								<Check className="size-3 mr-1" />
								Published
							</>
						) : isDraft ? (
							"Draft"
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
					{(isEditing || agentEid) && (
						<Button
							variant="outline"
							className="gap-2"
							onClick={() =>
								navigate(
									agentEid ? `/agents/${agentEid}/test` : "/agents/test",
									{
										state: { agentConfig: config },
									},
								)
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
					)}
					{isPublished ? (
						<>
							<Button
								variant="outline"
								onClick={() => setShowUnpublishModal(true)}
							>
								Unpublish
							</Button>
							<Button
								onClick={() => setShowPublishModal(true)}
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
					) : !isEditing && !agentEid ? (
						<Button
							onClick={() => {
								agentCreation.create({
									name: config.name,
									description: config.description,
									instructions: config.instructions,
									iconId: config.iconId,
									iconColorId: config.iconColorId,
									conversationStarters: config.conversationStarters,
									guardrails: config.guardrails.filter((g) => g.trim()),
								});
							}}
							disabled={
								!config.name.trim() ||
								!config.instructions.trim() ||
								nameTaken ||
								hasEmptyGuardrails ||
								agentCreation.isCreating
							}
						>
							{agentCreation.isCreating && (
								<Loader2 className="size-4 animate-spin" />
							)}
							Create agent
						</Button>
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

			{/* Main content — replaced by creation overlay when active */}
			{isCreationActive ? (
				<AgentCreationOverlay
					status={agentCreation.status}
					executionSteps={agentCreation.executionSteps}
					inputMessage={agentCreation.inputMessage}
					agentName={agentCreation.agentName}
					agentId={agentCreation.agentId}
					error={agentCreation.error}
					onEditAgent={(id) => {
						agentCreation.reset();
						navigate(`/agents/${id}`);
					}}
					onTestAgent={(id) => {
						agentCreation.reset();
						navigate(`/agents/${id}/test`);
					}}
					onSendInput={(input) => {
						if (agentCreation.creationId && agentCreation.executionId) {
							agentApi.sendCreationInput({
								creationId: agentCreation.creationId,
								prevExecutionId: agentCreation.executionId,
								prompt: input,
							});
							const store = useAgentCreationStore.getState();
							store.resumeCreation();
						}
					}}
					onRetry={() => {
						agentCreation.reset();
						agentCreation.create({
							name: config.name,
							description: config.description,
							instructions: config.instructions,
							iconId: config.iconId,
							iconColorId: config.iconColorId,
							conversationStarters: config.conversationStarters,
							guardrails: config.guardrails.filter((g) => g.trim()),
						});
					}}
					onCancel={() => {
						agentCreation.reset();
					}}
				/>
			) : (
				<div className="flex flex-1 overflow-hidden p-4 gap-4 justify-center">
					{/* Left panel - Configure/Access */}
					<div className="flex flex-col flex-1 max-w-3xl bg-white rounded-xl">
						{/* Configure content */}
						<div className="flex-1 overflow-y-auto p-6">
							<div className="max-w-2xl mx-auto space-y-8">
								{/* Name of agent with icon picker */}
								<div>
									<div className="flex items-center gap-1.5">
										<Label htmlFor="agent-name" className="text-sm font-medium">
											Name of agent
										</Label>
										<FieldHelp
											label="Name of agent"
											description={t("builder.help.name.description")}
											examples={
												t("builder.help.name.examples", {
													returnObjects: true,
												}) as string[]
											}
											triggerAriaLabel={t("builder.helpTriggerAria")}
										/>
									</div>
									<div className="flex items-start gap-4 mt-2">
										<div className="flex-1">
											<div className="relative">
												<Input
													id="agent-name"
													value={config.name}
													onChange={(e) => {
														setConfig((prev) => ({
															...prev,
															name: e.target.value,
														}));
														if (!nameTouched) setNameTouched(true);
													}}
													onBlur={() => setNameTouched(true)}
													placeholder="Enter agent name"
													aria-invalid={nameEmpty || nameTaken}
													aria-describedby="builder-name-feedback"
												/>
												{isCheckingName && config.name.trim() && (
													<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
												)}
											</div>
											<div
												id="builder-name-feedback"
												aria-live="polite"
												className="min-h-5 mt-1"
											>
												{nameEmpty && (
													<p className="text-sm text-destructive">
														Agent name is required
													</p>
												)}
												{nameTaken && (
													<p className="text-sm text-destructive">
														An agent with this name already exists
													</p>
												)}
												{nameAvailable && !nameEmpty && (
													<p className="text-sm text-emerald-600 flex items-center gap-1">
														<Check className="size-3.5" />
														Name is available
													</p>
												)}
											</div>
										</div>
										{/* Icon picker button */}
										<div
											ref={iconPickerRef}
											className="relative flex items-center"
										>
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
													const IconComponent = (iconData?.icon ||
														Bot) as React.ElementType;
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
																const IconComponent =
																	iconData.icon as React.ElementType;
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

								{/* Description - Collapsible, only visible when editing */}
								{isEditing &&
									(!showDescription && !config.description?.trim() ? (
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
									))}

								{/* Skills Section */}
								<div id="skills-section" className="space-y-2">
									<div className="flex items-start justify-between">
										<div>
											<div className="flex items-center gap-1.5">
												<Label className="text-sm font-medium">Skills</Label>
												<FieldHelp
													label="Skills"
													description={t("builder.help.skills.description")}
													examples={
														t("builder.help.skills.examples", {
															returnObjects: true,
														}) as string[]
													}
													triggerAriaLabel={t("builder.helpTriggerAria")}
												/>
											</div>
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
									<div className="flex items-center justify-between">
										<div>
											<div className="flex items-center gap-1.5">
												<Label
													htmlFor="instructions"
													className="text-sm font-medium"
												>
													Instructions
												</Label>
												<FieldHelp
													label="Instructions"
													description={t(
														"builder.help.instructions.description",
													)}
													examples={
														t("builder.help.instructions.examples", {
															returnObjects: true,
														}) as string[]
													}
													triggerAriaLabel={t("builder.helpTriggerAria")}
												/>
											</div>
											<p className="text-sm text-muted-foreground mt-1">
												Control your agents behavior by adding instructions.
											</p>
										</div>
										<Button
											variant="ghost"
											size="sm"
											className="gap-1.5 h-8"
											disabled={
												improveInstructions.status === "improving" ||
												isCreationActive ||
												(!config.instructions.trim() &&
													!config.description.trim())
											}
											onClick={() => {
												improveInstructions.improve({
													name: config.name,
													description: config.description,
													instructions: config.instructions,
													agentType: config.agentType,
													workflows: config.workflows,
													conversationStarters: config.conversationStarters,
													guardrails: config.guardrails.filter((g) => g.trim()),
													knowledgeSources: config.knowledgeSources,
													capabilities: config.capabilities,
												});
												setShowImproveDialog(true);
											}}
										>
											{improveInstructions.status === "improving" ? (
												<Loader2 className="size-3.5 animate-spin" />
											) : (
												<Sparkles className="size-3.5" />
											)}
											Improve
										</Button>
									</div>

									{/* Instructions textarea with footer */}
									<div className="border rounded-lg overflow-hidden">
										<div className="relative">
											<Textarea
												id="instructions"
												value={config.instructions}
												onChange={(e) => {
													setConfig((prev) => ({
														...prev,
														instructions: e.target.value,
													}));
													if (!instructionsTouched)
														setInstructionsTouched(true);
												}}
												onBlur={() => setInstructionsTouched(true)}
												placeholder={
													"## Role\n\n## Backstory\n\n## Goal\n\n## Task"
												}
												aria-invalid={instructionsError}
												aria-describedby="instructions-feedback"
												className="min-h-[80px] resize-y text-sm border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
									<div
										id="instructions-feedback"
										aria-live="polite"
										className="min-h-5 mt-1"
									>
										{instructionsError && (
											<p className="text-sm text-destructive">
												Instructions or description is required to publish
											</p>
										)}
									</div>
								</div>

								{/* Conversation Starters Section */}
								<div className="space-y-2">
									<div className="flex items-start justify-between">
										<div>
											<div className="flex items-center gap-1.5">
												<p className="text-sm font-medium text-foreground">
													Conversation starters
												</p>
												<FieldHelp
													label="Conversation starters"
													description={t(
														"builder.help.conversationStarters.description",
													)}
													examples={
														t("builder.help.conversationStarters.examples", {
															returnObjects: true,
														}) as string[]
													}
													triggerAriaLabel={t("builder.helpTriggerAria")}
												/>
											</div>
											<p className="text-sm text-muted-foreground mt-0.5">
												Suggested prompts shown to users when starting a
												conversation
											</p>
										</div>
										{config.conversationStarters.length > 0 && (
											<Button
												variant="outline"
												size="sm"
												className="gap-1.5 h-8 shrink-0"
												disabled={
													generateStarters.status === "generating" ||
													agentCreation.isCreating ||
													config.conversationStarters.length >=
														MAX_CONVERSATION_STARTERS ||
													(!config.instructions.trim() &&
														!config.description.trim())
												}
												onClick={() => {
													generateStarters.generate({
														name: config.name,
														description: config.description,
														instructions: config.instructions,
														agentType: config.agentType,
														workflows: config.workflows,
														conversationStarters: config.conversationStarters,
														guardrails: config.guardrails.filter((g) =>
															g.trim(),
														),
														knowledgeSources: config.knowledgeSources,
														capabilities: config.capabilities,
													});
												}}
											>
												{generateStarters.status === "generating" ? (
													<Loader2 className="size-3.5 animate-spin" />
												) : (
													<Sparkles className="size-3.5" />
												)}
												Regenerate
											</Button>
										)}
									</div>
									{config.conversationStarters.length === 0 ? (
										/* Empty state — single Generate button */
										<Button
											variant="outline"
											className="w-fit"
											disabled={
												generateStarters.status === "generating" ||
												agentCreation.isCreating ||
												(!config.instructions.trim() &&
													!config.description.trim())
											}
											onClick={() => {
												generateStarters.generate({
													name: config.name,
													description: config.description,
													instructions: config.instructions,
													agentType: config.agentType,
													workflows: config.workflows,
													conversationStarters: config.conversationStarters,
													guardrails: config.guardrails.filter((g) => g.trim()),
													knowledgeSources: config.knowledgeSources,
													capabilities: config.capabilities,
												});
											}}
										>
											{generateStarters.status === "generating" ? (
												<Loader2 className="animate-spin" />
											) : (
												<Plus />
											)}
											Generate conversation starters
										</Button>
									) : (
										/* Populated state — show chips + typing input */
										<div className="border rounded-md min-h-9 px-3 py-1.5 flex items-center gap-1 flex-wrap">
											{config.conversationStarters.map((starter, index) => (
												<div
													key={index}
													className="flex items-center gap-1 px-2 py-0.5 border border-dashed rounded-md text-xs text-muted-foreground whitespace-nowrap"
												>
													<span>{starter}</span>
													<button
														onClick={() => {
															const updated =
																config.conversationStarters.filter(
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
											{config.conversationStarters.length <
												MAX_CONVERSATION_STARTERS && (
												<input
													type="text"
													placeholder="Type and press Enter or comma to add..."
													className="flex-1 min-w-[150px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
													onKeyDown={(e) => {
														const input = e.currentTarget;
														if (
															(e.key === "Enter" || e.key === ",") &&
															input.value.replace(",", "").trim()
														) {
															e.preventDefault();
															const values = input.value
																.split(",")
																.map((v) => v.trim())
																.filter(Boolean);

															setConfig((prev) => {
																const existing = prev.conversationStarters;
																const availableSlots =
																	MAX_CONVERSATION_STARTERS - existing.length;
																const newStarters = values
																	.filter((v) => !existing.includes(v))
																	.slice(0, availableSlots);
																if (newStarters.length === 0) return prev;
																return {
																	...prev,
																	conversationStarters: [
																		...existing,
																		...newStarters,
																	],
																};
															});
															input.value = "";
														}
													}}
												/>
											)}
										</div>
									)}
								</div>

								{/* Guardrails Section */}
								<div className="space-y-2">
									<div>
										<div className="flex items-center gap-1.5">
											<p className="text-sm font-medium text-foreground">
												Guardrails
											</p>
											<FieldHelp
												label="Guardrails"
												description={t("builder.help.guardrails.description")}
												examples={
													t("builder.help.guardrails.examples", {
														returnObjects: true,
													}) as string[]
												}
												triggerAriaLabel={t("builder.helpTriggerAria")}
											/>
										</div>
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
														className={cn(
															"flex-1",
															!guardrail.trim() && "border-destructive",
														)}
														aria-invalid={!guardrail.trim()}
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
											{hasEmptyGuardrails && (
												<p className="text-sm text-destructive">
													{t("guardrails.emptyError")}
												</p>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

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
							knowledgeSources:
								newType === "workflow" ? [] : prev.knowledgeSources,
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
						knowledgeSources:
							pendingAgentType === "workflow" ? [] : prev.knowledgeSources,
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
				onConfirm={async () => {
					try {
						if (agentEid) {
							await updateAgent.mutateAsync({
								eid: agentEid,
								data: { status: "draft" },
							});
						}
					} catch {
						toast.error("Failed to unpublish agent");
						setShowUnpublishModal(false);
						return;
					}
					setShowUnpublishModal(false);
					navigate("/agents", {
						state: {
							unpublishedAgent: {
								id: agentEid || agentId,
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
				onChange={(value) =>
					setConfig((prev) => ({ ...prev, instructions: value }))
				}
				onImproveClick={() => {
					improveInstructions.improve({
						name: config.name,
						description: config.description,
						instructions: config.instructions,
						agentType: config.agentType,
						workflows: config.workflows,
						conversationStarters: config.conversationStarters,
						guardrails: config.guardrails.filter((g) => g.trim()),
						knowledgeSources: config.knowledgeSources,
						capabilities: config.capabilities,
					});
					setShowImproveDialog(true);
				}}
				isImproving={improveInstructions.status === "improving"}
			/>

			{/* Improve Instructions Sheet */}
			<ImproveInstructionsDialog
				open={showImproveDialog}
				onOpenChange={(open) => {
					setShowImproveDialog(open);
					if (!open) improveInstructions.reset();
				}}
				onAcceptInstructions={(improved) => {
					setConfig((prev) => ({ ...prev, instructions: improved }));
					if (!instructionsTouched) setInstructionsTouched(true);
				}}
				onRetry={() => {
					improveInstructions.improve({
						name: config.name,
						description: config.description,
						instructions: config.instructions,
						agentType: config.agentType,
						workflows: config.workflows,
						conversationStarters: config.conversationStarters,
						guardrails: config.guardrails.filter((g) => g.trim()),
						knowledgeSources: config.knowledgeSources,
						capabilities: config.capabilities,
					});
				}}
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
						const startersToAdd = newStarters.filter(
							(s) => !existingStarters.includes(s),
						);
						const availableSlots =
							MAX_CONVERSATION_STARTERS - existingStarters.length;
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
					if (!workflowToUnlink) return;
					setConfig((prev) => ({
						...prev,
						workflows: [...prev.workflows, workflowToUnlink.name],
					}));
					setShowUnlinkConfirm(false);
					toast.success(
						`${workflowToUnlink.name} unlinked from ${workflowToUnlink.linkedAgentName} and added to this agent`,
					);
					setWorkflowToUnlink(null);
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
									{i < demoStep ? <Check className="size-3" /> : i + 1}
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
