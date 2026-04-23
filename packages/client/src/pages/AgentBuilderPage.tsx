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
	Check,
	ChevronDown,
	Loader2,
	Play,
	Plus,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
	AddToolsModal,
	AgentConversationStarters,
	AgentCreationOverlay,
	AgentGuardrailsSection,
	AgentIconPicker,
	ChangeAgentTypeModal,
	ConfirmTypeChangeModal,
	CreateWorkflowModal,
	ImproveInstructionsDialog,
	InstructionsExpandedModal,
	PublishModal,
	UnlinkWorkflowModal,
	UnpublishModal,
} from "@/components/agents/builder";
import { FieldHelp } from "@/components/custom/FieldHelp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getDemoScenario } from "@/data/demo-agents";
import {
	useAgent,
	useCheckAgentName,
	useCreateAgent,
	useUpdateAgent,
} from "@/hooks/api/useAgents";
import { useAgentCreation } from "@/hooks/useAgentCreation";
import { useDebounce } from "@/hooks/useDebounce";
import { useGenerateConversationStarters } from "@/hooks/useGenerateConversationStarters";
import { useImproveInstructions } from "@/hooks/useImproveInstructions";
import {
	diffAgentConfig,
	validateSkillReferences,
} from "@/lib/agentConfigDiff";
import {
	syncAddedToolsInInstructions,
	syncRemovedToolInInstructions,
} from "@/lib/agentInstructionsTools";
import { toast } from "@/lib/toast";
import { cn, humanizeToolName } from "@/lib/utils";
import {
	isInstructionsSubmitBlocked,
	MIN_INSTRUCTIONS_LENGTH,
	validateBuilder,
} from "@/pages/agentBuilderValidation";
import { agentApi } from "@/services/api";
import { useAgentCreationStore } from "@/stores/agentCreationStore";
import type {
	AgentConfig,
	BuilderMessage,
	ConversationStep,
	DebugTraceStep,
} from "@/types/agent";

const MAX_CONVERSATION_STARTERS = 20;

// Icon picker options
export default function AgentBuilderPage() {
	const { t } = useTranslation("agents");
	const navigate = useNavigate();
	const location = useLocation();
	const { id: agentId } = useParams<{ id: string }>();
	const demoScenario = getDemoScenario(
		new URLSearchParams(location.search).get("scenario"),
	);
	const agentName = location.state?.agentName || t("builder.untitledAgent");
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

	const isPublished = savedAgent?.state === "PUBLISHED";
	const isDraft = savedAgent?.state === "DRAFT";

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
		isEditing || isDuplicate || demoScenario ? "done" : "start",
	);
	const [_isTyping, _setIsTyping] = useState(false);
	const [config, setConfig] = useState<AgentConfig>(
		// Scenario wins over everything — sales expects a fresh, consistent
		// pre-fill regardless of prior duplicated/initial state or persisted drafts.
		demoScenario?.config ||
			duplicatedConfig ||
			initialConfig || {
				name: agentName,
				description: "",
				role: "",
				responsibilities: "",
				completionCriteria: "",
				agentType: null,
				knowledgeSources: [],
				tools: [],
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
		if (
			savedAgent &&
			!hasLoadedFromApi &&
			!isDuplicate &&
			!initialConfig &&
			!demoScenario
		) {
			setConfig(savedAgent);
			setStep("done");
			setHasLoadedFromApi(true);
		}
	}, [savedAgent, hasLoadedFromApi, isDuplicate, initialConfig, demoScenario]);

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
	const [instructionsTouched, setInstructionsTouched] = useState(false);
	const builderErrors = validateBuilder({
		nameTouched,
		name: config.name,
		instructionsTouched,
		instructions: config.instructions,
		description: config.description,
	});
	const nameEmpty = builderErrors.name === "required";
	const instructionsErrorCode = builderErrors.instructions;
	const instructionsError = instructionsErrorCode !== null;
	// Blocks Create/Publish/Save regardless of touch state — derived from raw fields.
	const instructionsBlocksSubmit = isInstructionsSubmitBlocked(
		config.instructions,
		config.description,
	);
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
			toast.error(t("conversationStarters.generateFailed"));
			generateStarters.reset();
		}
	}, [
		generateStarters.status,
		generateStarters.generatedStarters,
		generateStarters.reset,
		t,
	]);

	// Track the original published config for diff comparison (only for editing)
	const publishedConfigRef = useRef<AgentConfig | null>(null);
	useEffect(() => {
		if (
			savedAgent &&
			!publishedConfigRef.current &&
			savedAgent.state === "PUBLISHED"
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
	const [showAddToolsModal, setShowAddToolsModal] = useState(false);
	// Instructions expanded modal state
	const [showInstructionsModal, setShowInstructionsModal] = useState(false);

	// Description visibility toggle
	const [showDescription, setShowDescription] = useState(false);

	// Demo mode state
	const [demoMode, setDemoMode] = useState(false);
	const [demoStep, setDemoStep] = useState(0);
	const [demoScenarioKey, setDemoScenarioKey] = useState<"pto" | "laptop">(
		"pto",
	);

	const DEMO_STEPS = [
		{
			label: t("builder.demo.steps.createAgent"),
			description: t("builder.demo.steps.createAgentDesc"),
		},
		{
			label: t("builder.demo.steps.addSkills"),
			description: t("builder.demo.steps.addSkillsDesc"),
		},
		{
			label: t("builder.demo.steps.addStarters"),
			description: t("builder.demo.steps.addStartersDesc"),
		},
		{
			label: t("builder.demo.steps.testAgent"),
			description: t("builder.demo.steps.testAgentDesc"),
		},
		{
			label: t("builder.demo.steps.publish"),
			description: t("builder.demo.steps.publishDesc"),
		},
	];

	// Per-scenario values that drive each demo step. Sales picks a scenario from
	// the trigger button; the handler below pulls from this map.
	const DEMO_SCENARIOS: Record<
		"pto" | "laptop",
		{
			label: string;
			createAgent: Partial<AgentConfig>;
			skills: string[];
			starters: string[];
			instructions: string;
		}
	> = {
		pto: {
			label: "PTO Assistant",
			createAgent: {
				name: "PTO Assistant",
				description:
					"Helps internal employees check their PTO balance and submit PTO requests.",
				agentType: "workflow" as const,
				role: "HR Assistant",
				iconId: "bot",
				iconColorId: "blue",
			},
			skills: [
				"Check Existing PTO",
				"Request PTO",
				"Block Outlook Calendar for PTO",
			],
			starters: [
				"How many PTO days do I have left?",
				"I'd like to request time off next month.",
				"Can you block my calendar for vacation?",
			],
			instructions: [
				"You are a friendly HR assistant who helps internal employees with PTO.",
				"",
				"1. Greet them and ask whether they want to check their balance or request PTO.",
				"2. If checking balance, use the Check Existing PTO skill and summarize the result.",
				"3. If requesting PTO, use the Request PTO skill to collect start date, end date, and reason, then submit it.",
				"4. After submission, offer to block their Outlook calendar with the Block Outlook Calendar for PTO skill.",
				"",
				"Always confirm key details before submitting.",
			].join("\n"),
		},
		laptop: {
			label: "Laptop Loan Assistant",
			createAgent: {
				name: "Laptop Loan Assistant",
				description:
					"Helps internal employees request a temporary loaner laptop from IT.",
				agentType: "workflow" as const,
				role: "IT Agent",
				iconId: "bot",
				iconColorId: "indigo",
			},
			skills: ["Submit temporary Laptop request in ITSM"],
			starters: [
				"I need a loaner laptop for a trip next week.",
				"My laptop is being repaired — can I borrow one?",
				"How do I request a temporary laptop?",
			],
			instructions: [
				"You are a friendly IT agent who helps internal employees request temporary laptop loans.",
				"",
				"Follow these steps in order:",
				"1. Ask the employee which date they first need the laptop.",
				"2. Ask which date they will return the laptop.",
				"3. Ask them to choose a laptop from: Dell Latitude 7450, Dell XPS 13, Dell Precision 5680, Lenovo ThinkPad X1 Carbon, Lenovo ThinkPad T14.",
				"4. Ask how to deliver it — mailed home or hand-delivered to their desk.",
				"5. Confirm the details, call Submit temporary Laptop request in ITSM, and share a generated request number (REQ-LAPTOP-######).",
				"",
				"Do not proceed to the next step until the previous one is answered.",
			].join("\n"),
		},
	};

	const handleDemoNext = () => {
		const scenario = DEMO_SCENARIOS[demoScenarioKey];
		switch (demoStep) {
			case 0:
				setConfig((prev) => ({
					...prev,
					...scenario.createAgent,
					instructions: scenario.instructions,
				}));
				setStep("done");
				setDemoStep(1);
				break;
			case 1:
				setConfig((prev) => ({
					...prev,
					tools: scenario.skills,
				}));
				setDemoStep(2);
				break;
			case 2:
				setConfig((prev) => ({
					...prev,
					conversationStarters: scenario.starters,
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

	const handleBack = () => {
		navigate("/agents");
	};

	const handlePublish = () => {
		// Show publish confirmation modal
		setShowPublishModal(true);
	};

	// Update Agent — smart save router
	// ---------------------------------
	// Diff form state against the server-loaded baseline. Cheap-only changes
	// (name/description/icon/conversationStarters/guardrails) are PUT directly
	// via updateAgent. Any change to instructions or skills requires running
	// AgentRitaDeveloper because those fields drive agent_tasks + tools.
	const updateDiff = useMemo(() => {
		if (!savedAgent) return null;
		return diffAgentConfig(config, savedAgent);
	}, [config, savedAgent]);
	const skillValidation = useMemo(() => {
		if (!savedAgent) return null;
		return validateSkillReferences(config, savedAgent);
	}, [config, savedAgent]);

	const cheapSaveDisabled =
		!updateDiff?.hasChanges ||
		agentCreation.isCreating ||
		updateAgent.isPending ||
		nameTaken ||
		hasEmptyGuardrails ||
		!skillValidation?.valid ||
		instructionsBlocksSubmit;

	const handleUpdateAgent = async () => {
		if (!agentEid || !savedAgent || !updateDiff) return;

		// Defense-in-depth: the button is disabled when skillValidation fails,
		// but re-check at submit time in case the disabled check was bypassed
		// (keyboard, stale state, etc.).
		if (skillValidation && !skillValidation.valid) {
			// Dynamic key: validateSkillReferences returns a translation key string
			// that's resolved at runtime. i18next's heavy t() overloads can't
			// narrow a runtime key + params object — escape the type via any.
			const dynT = t as unknown as (
				key: string,
				params?: Record<string, string>,
			) => string;
			toast.error(
				dynT(
					skillValidation.messageKey ?? "builder.failedToUpdate",
					skillValidation.messageParams ?? {},
				),
			);
			return;
		}

		if (!updateDiff.hasChanges) return;

		// Expensive changes → need the meta-agent. Kick it off directly with
		// the current form values; AgentCreationOverlay streams progress.
		if (updateDiff.expensiveFields.length > 0) {
			// Ask the server to regenerate the description when the user didn't
			// touch it — instructions likely drifted and the stale description
			// no longer reflects what the agent does.
			const descriptionUnchanged =
				!updateDiff.cheapFields.includes("description");
			agentCreation.create({
				name: config.name,
				description: config.description,
				instructions: config.instructions,
				iconId: config.iconId,
				iconColorId: config.iconColorId,
				conversationStarters: config.conversationStarters,
				guardrails: config.guardrails.filter((g) => g.trim()),
				targetAgentEid: agentEid,
				generateDescription: descriptionUnchanged,
			});
			return;
		}

		// Cheap-only path: direct PUT, no meta-agent, no overlay.
		try {
			await updateAgent.mutateAsync({
				eid: agentEid,
				data: {
					name: config.name,
					description: config.description,
					iconId: config.iconId,
					iconColorId: config.iconColorId,
					conversationStarters: config.conversationStarters,
					guardrails: config.guardrails.filter((g) => g.trim()),
				},
			});
			toast.success(t("builder.agentUpdated"));
		} catch {
			toast.error(t("builder.failedToUpdate"));
		}
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
				label: t("builder.configChanges.name"),
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
				label: t("builder.configChanges.icon"),
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
				state: "PUBLISHED" as const,
			};
			if (agentEid) {
				await updateAgent.mutateAsync({ eid: agentEid, data: publishData });
			} else {
				const created = await createAgent.mutateAsync(publishData);
				if (created.id) setAgentEid(created.id);
			}
		} catch {
			toast.error(t("builder.failedToPublish"));
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
					skills: config.tools,
				},
			},
		});
	};

	// Loading state when fetching existing agent
	if (isEditing && isLoadingAgent) {
		return (
			<div className="flex items-center justify-center h-screen bg-muted/50">
				<div className="text-muted-foreground">{t("builder.loading")}</div>
			</div>
		);
	}

	if (isEditing && loadError) {
		return (
			<div className="flex flex-col items-center justify-center h-screen gap-4 bg-muted/50">
				<div className="text-sm text-muted-foreground">
					{t("builder.loadError")}
				</div>
				<Button variant="outline" onClick={() => navigate("/agents")}>
					{t("builder.backToAgents")}
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
						aria-label={t("builder.goBack")}
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
								{t("builder.statusPublished")}
							</>
						) : isDraft ? (
							t("builder.statusDraft")
						) : step === "done" ? (
							<>
								<Check className="size-3 mr-1" />
								{t("builder.statusReady")}
							</>
						) : (
							t("builder.statusDraft")
						)}
					</Badge>
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
							{t("builder.test")}
						</Button>
					)}
					{isPublished ? (
						<>
							<Button
								variant="outline"
								onClick={() => setShowUnpublishModal(true)}
							>
								{t("builder.unpublish")}
							</Button>
							<Button
								onClick={() => setShowPublishModal(true)}
								disabled={!hasChanges}
							>
								{t("builder.publishChanges")}
								{hasChanges && (
									<span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs">
										{configChanges.length}
									</span>
								)}
							</Button>
						</>
					) : isEditing && agentEid ? (
						<>
							<Button
								variant="outline"
								onClick={handleUpdateAgent}
								disabled={cheapSaveDisabled}
								title={
									skillValidation && !skillValidation.valid
										? (
												t as unknown as (
													key: string,
													params?: Record<string, string>,
												) => string
											)(
												skillValidation.messageKey ?? "",
												skillValidation.messageParams ?? {},
											)
										: undefined
								}
							>
								{updateAgent.isPending && (
									<Loader2 className="size-4 animate-spin" />
								)}
								{t("builder.updateAgent")}
							</Button>
							<Button
								onClick={handlePublish}
								disabled={!config.name || instructionsBlocksSubmit}
							>
								{t("builder.publish")}
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
									generateDescription: !config.description.trim(),
								});
							}}
							disabled={
								!config.name.trim() ||
								instructionsBlocksSubmit ||
								nameTaken ||
								hasEmptyGuardrails ||
								agentCreation.isCreating
							}
						>
							{agentCreation.isCreating && (
								<Loader2 className="size-4 animate-spin" />
							)}
							{t("builder.createAgent")}
						</Button>
					) : (
						<Button
							onClick={handlePublish}
							disabled={!config.name || instructionsBlocksSubmit}
						>
							{t("builder.publish")}
						</Button>
					)}
				</div>
			</header>

			{/* Main content — replaced by creation overlay when active */}
			{isCreationActive ? (
				<AgentCreationOverlay
					status={agentCreation.status}
					mode={agentCreation.mode}
					executionSteps={agentCreation.executionSteps}
					inputMessage={agentCreation.inputMessage}
					agentName={agentCreation.agentName}
					agentId={agentCreation.agentId}
					error={agentCreation.error}
					onEditAgent={(id) => {
						agentCreation.reset();
						// In update mode we're already on /agents/:id — reset clears the
						// overlay and the form rehydrates from the freshly-invalidated
						// detail query (SSEContext handles the invalidation).
						if (agentCreation.mode === "update" && id === agentEid) {
							setHasLoadedFromApi(false);
							return;
						}
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
							generateDescription: !config.description.trim(),
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
											{t("builder.form.nameLabel")}
										</Label>
										<FieldHelp
											label={t("builder.form.nameLabel")}
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
													placeholder={t("builder.form.namePlaceholder")}
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
														{t("builder.form.nameRequired")}
													</p>
												)}
												{nameTaken && (
													<p className="text-sm text-destructive">
														{t("builder.form.nameTaken")}
													</p>
												)}
												{nameAvailable && !nameEmpty && (
													<p className="text-sm text-emerald-600 flex items-center gap-1">
														<Check className="size-3.5" />
														{t("builder.form.nameAvailable")}
													</p>
												)}
											</div>
										</div>
										{/* Icon picker button */}
										<AgentIconPicker
											iconId={config.iconId}
											iconColorId={config.iconColorId}
											onIconChange={(iconId) =>
												setConfig((prev) => ({
													...prev,
													iconId,
												}))
											}
											onColorChange={(iconColorId) =>
												setConfig((prev) => ({
													...prev,
													iconColorId,
												}))
											}
										/>
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
											<span>{t("builder.form.addDescription")}</span>
										</button>
									) : (
										<div>
											<Label
												htmlFor="agent-description"
												className="text-sm font-medium"
											>
												{t("builder.form.descriptionLabel")}
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
												placeholder={t("builder.form.descriptionPlaceholder")}
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
												<Label className="text-sm font-medium">
													{t("builder.form.skillsLabel")}
												</Label>
												<FieldHelp
													label={t("builder.form.skillsLabel")}
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
												{t("builder.form.skillsDescription")}
											</p>
										</div>
										<Button
											variant="outline"
											size="sm"
											className="h-8 gap-1.5"
											onClick={() => setShowAddToolsModal(true)}
										>
											<Plus className="size-4" />
											{t("builder.form.addSkill")}
										</Button>
									</div>

									{config.tools.length === 0 ? (
										/* Empty state */
										<button
											onClick={() => setShowAddToolsModal(true)}
											className="w-full border border-dashed rounded-lg py-6 px-4 text-center hover:border-muted-foreground/50 transition-colors"
										>
											<p className="text-sm font-medium">
												{t("builder.form.addSkills")}
											</p>
											<p className="text-sm text-muted-foreground mt-1">
												{t("builder.form.addSkillsDescription")}
											</p>
										</button>
									) : (
										/* Added tools list */
										<div className="border rounded-md px-4 py-2">
											<div className="space-y-1">
												{config.tools.map((toolName, index) => {
													return (
														<div
															key={index}
															className="flex items-center gap-2.5 py-1"
														>
															<div className="size-5 rounded flex items-center justify-center flex-shrink-0 bg-muted">
																<Zap className="size-3 text-muted-foreground" />
															</div>
															<span className="text-xs flex-1">
																{humanizeToolName(toolName)}
															</span>
															<button
																onClick={() => {
																	setConfig((prev) => ({
																		...prev,
																		tools: prev.tools.filter(
																			(_, i) => i !== index,
																		),
																		instructions: syncRemovedToolInInstructions(
																			prev.instructions ?? "",
																			toolName,
																		),
																	}));
																}}
																aria-label={t("builder.form.removeTool", {
																	tool: humanizeToolName(toolName),
																})}
																className="p-2 text-muted-foreground hover:text-foreground"
															>
																<X className="size-3" aria-hidden="true" />
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
													{t("builder.form.instructionsLabel")}
												</Label>
												<FieldHelp
													label={t("builder.form.instructionsLabel")}
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
												{t("builder.form.instructionsDescription")}
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
													tools: config.tools,
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
											{t("builder.form.improve")}
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
												aria-label={t("builder.form.expandInstructions")}
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
										{t("builder.form.instructionsHint")}
									</p>

									<div
										id="instructions-feedback"
										aria-live="polite"
										className="min-h-5 mt-1"
									>
										{instructionsErrorCode === "required" && (
											<p className="text-sm text-destructive">
												{t("builder.form.instructionsRequired")}
											</p>
										)}
										{instructionsErrorCode === "tooShort" && (
											<p className="text-sm text-destructive">
												{t("builder.form.instructionsTooShort", {
													min: MIN_INSTRUCTIONS_LENGTH,
												})}
											</p>
										)}
									</div>
								</div>

								{/* Conversation Starters Section */}
								<AgentConversationStarters
									starters={config.conversationStarters}
									onChange={(starters) =>
										setConfig((prev) => ({
											...prev,
											conversationStarters: starters,
										}))
									}
									maxStarters={MAX_CONVERSATION_STARTERS}
									onGenerate={() => {
										generateStarters.generate({
											name: config.name,
											description: config.description,
											instructions: config.instructions,
											agentType: config.agentType,
											tools: config.tools,
											conversationStarters: config.conversationStarters,
											guardrails: config.guardrails.filter((g) => g.trim()),
											knowledgeSources: config.knowledgeSources,
											capabilities: config.capabilities,
										});
									}}
									isGenerating={generateStarters.status === "generating"}
									generateDisabled={
										agentCreation.isCreating ||
										(!config.instructions.trim() && !config.description.trim())
									}
								/>

								{/* Guardrails Section */}
								<AgentGuardrailsSection
									guardrails={config.guardrails}
									onChange={(guardrails) =>
										setConfig((prev) => ({
											...prev,
											guardrails,
										}))
									}
								/>
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
				toolsCount={config.tools.length}
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
							tools: newType === "knowledge" ? [] : prev.tools,
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
						tools: pendingAgentType === "knowledge" ? [] : prev.tools,
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
								data: { state: "DRAFT" },
							});
						}
					} catch {
						toast.error(t("builder.failedToUnpublish"));
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
						tools: config.tools,
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
						tools: config.tools,
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

			{/* Add Tools Modal */}
			<AddToolsModal
				open={showAddToolsModal}
				onOpenChange={setShowAddToolsModal}
				currentTools={config.tools}
				onAdd={(toolNames) => {
					setConfig((prev) => ({
						...prev,
						tools: [...prev.tools, ...toolNames],
						instructions: syncAddedToolsInInstructions(
							prev.instructions ?? "",
							toolNames,
						),
					}));
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
						tools: [...prev.tools, workflowToUnlink.name],
					}));
					setShowUnlinkConfirm(false);
					toast.success(
						t("builder.unlinkedToast", {
							skill: workflowToUnlink.name,
							agent: workflowToUnlink.linkedAgentName,
						}),
					);
					setWorkflowToUnlink(null);
				}}
			/>
			{/* Demo mode trigger — scenario picker */}
			{!demoMode && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="fixed bottom-4 left-4 z-50 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-full shadow-lg hover:bg-violet-700 transition-colors flex items-center gap-1.5"
						>
							<Play className="size-3" />
							{t("builder.demo.trigger")}
							<ChevronDown className="size-3" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" side="top" className="w-56">
						{(Object.keys(DEMO_SCENARIOS) as Array<"pto" | "laptop">).map(
							(key) => (
								<DropdownMenuItem
									key={key}
									onClick={() => {
										setDemoScenarioKey(key);
										setDemoMode(true);
										setDemoStep(0);
									}}
								>
									{DEMO_SCENARIOS[key].label}
								</DropdownMenuItem>
							),
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			)}

			{/* Demo stepper bar */}
			{demoMode && (
				<div className="fixed bottom-0 left-0 right-0 z-50 bg-violet-900 text-white px-6 py-3 flex items-center gap-4 shadow-2xl">
					<div className="flex items-center gap-2">
						<Play className="size-4" />
						<span className="text-sm font-semibold">
							{t("builder.demo.title")}
						</span>
						<span className="text-xs text-white/70">
							· {DEMO_SCENARIOS[demoScenarioKey].label}
						</span>
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
							{t("builder.demo.next")}
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
							{t("builder.demo.exit")}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
