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

import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft, HelpCircle, Send, Check, Play, Clock, FileText, Workflow, MessageSquare,
  Link2, Search, X, Sparkles, Plus, Trash2, Squirrel, ChevronDown, Brain,
  RotateCcw, CheckCircle2, XCircle, ChevronRight, Loader2, MessageSquareText, Bug,
  // Icon picker icons
  ShieldCheck, TrendingUp, BookOpen, ClipboardList, LineChart, Briefcase, Users,
  Landmark, Truck, Key, Award, Settings, AlertCircle, Rocket, Bot, Headphones,
  GraduationCap, Heart, Zap, Globe, Lock, Mail, Phone, Star, Target, ThumbsUp,
  Wrench, Calendar, Coffee, Database, Folder, Home, Layers, Map, Package, ShoppingCart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import confetti from "canvas-confetti";
import { WizardAgentBuilder } from "@/components/agents/WizardAgentBuilder";
import { WizardFloatBuilder } from "@/components/agents/WizardFloatBuilder";
import { CanvasBuilder } from "@/components/agents/CanvasBuilder";
import { useAutoSave } from "@/hooks/useAutoSave";
import { SaveStatusIndicator } from "@/components/agents/SaveStatusIndicator";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
}

// Debug trace types for test mode
type DebugStepStatus = "pending" | "running" | "success" | "error";

interface DebugTraceStep {
  id: string;
  type: "trigger" | "intent" | "knowledge" | "skill" | "guardrail" | "response";
  label: string;
  description: string;
  status: DebugStepStatus;
  duration?: number; // milliseconds
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

type ConversationStep =
  | "start"
  | "intent"
  | "role"
  | "responsibilities"
  | "completion"
  | "select_type"
  | "confirm_type"
  | "trigger_phrases"
  | "guardrails"
  | "select_sources"
  | "confirm"
  | "knowledge_sources"
  | "done";

interface AgentCapabilities {
  webSearch: boolean;
  imageGeneration: boolean;
  useAllWorkspaceContent: boolean;
}

interface AgentConfig {
  name: string;
  description: string;
  role: string;
  responsibilities: string;
  completionCriteria: string;
  agentType: "answer" | "knowledge" | "workflow" | null;
  knowledgeSources: string[];
  workflows: string[];
  hasRequiredConnections: boolean;
  // Additional configure fields
  instructions: string;
  conversationStarters: string[];
  guardrails: string[]; // Topics/requests the agent should NOT handle
  // Icon customization
  iconId: string;
  iconColorId: string;
  // Capabilities
  capabilities: AgentCapabilities;
}

const AGENT_TYPE_INFO = {
  answer: {
    label: "Answer agent",
    shortLabel: "Answer Agent",
    shortDesc: "Use your company's knowledge and gives clear, helpful responses.",
    subDesc: "Perfect for HR, IT, and policy Q&A.",
    description: "turning pre-retrieved content (from internal or external sources) into clear, conversational answers",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  knowledge: {
    label: "Knowledge agent",
    shortLabel: "Knowledge Agent",
    shortDesc: "Documents you choose to give strict, policy-accurate answers",
    subDesc: "Great for compliance, legal, HR policy, device manuals.",
    description: "providing answers directly from its pre-configured knowledge without requiring search",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  workflow: {
    label: "Workflow agent",
    shortLabel: "Workflow Agent",
    shortDesc: "Runs automations and performs tasks based on leveraging Resolve actions.",
    subDesc: "Great for password resets, access requests, onboarding tasks.",
    description: "running automations or workflows and explaining the results back to users",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
};

// Mock available knowledge sources in the org (uploads + connections)
const AVAILABLE_KNOWLEDGE_SOURCES = [
  // Uploads
  { id: "hr-policies", name: "HR Policies", description: "Company HR policies and guidelines", type: "upload", tags: ["hr", "policy", "employee"] },
  { id: "benefits-guide", name: "Benefits Guide", description: "Health insurance, 401k, and other benefits", type: "upload", tags: ["hr", "benefits", "insurance", "401k"] },
  { id: "pto-handbook", name: "PTO Handbook", description: "Time off policies and procedures", type: "upload", tags: ["hr", "pto", "vacation", "time off"] },
  { id: "employee-faq", name: "Employee FAQ", description: "Common questions and answers", type: "upload", tags: ["hr", "faq", "employee"] },
  { id: "onboarding-docs", name: "Onboarding Documents", description: "New hire information", type: "upload", tags: ["hr", "onboarding", "new hire"] },
  { id: "it-security-policy", name: "IT Security Policy", description: "Security guidelines and compliance", type: "upload", tags: ["it", "security", "compliance"] },
  { id: "expense-policy", name: "Expense Policy", description: "Travel and expense reimbursement rules", type: "upload", tags: ["finance", "expense", "travel"] },
  { id: "code-of-conduct", name: "Code of Conduct", description: "Employee behavior guidelines", type: "upload", tags: ["hr", "compliance", "conduct"] },
  // Connections
  { id: "confluence-hr", name: "Confluence - HR Space", description: "HR team Confluence workspace", type: "connection", tags: ["hr", "confluence"] },
  { id: "sharepoint-policies", name: "SharePoint - Company Policies", description: "Central policy repository", type: "connection", tags: ["policy", "sharepoint"] },
  { id: "notion-wiki", name: "Notion - Company Wiki", description: "Internal knowledge base", type: "connection", tags: ["wiki", "notion"] },
  { id: "gdrive-hr", name: "Google Drive - HR Folder", description: "HR shared drive", type: "connection", tags: ["hr", "gdrive"] },
];

// Mock available workflows in the org (1:1 with agents)
const AVAILABLE_WORKFLOWS = [
  { id: "password-reset", name: "Password Reset", description: "Reset user passwords in AD", category: "IT", linkedAgentId: "3", linkedAgentName: "Password Reset Bot", linkedAgentOwnerId: "user-2", linkedAgentOwnerName: "John Smith", linkedAgentOwnerEmail: "john.smith@company.com" },
  { id: "access-request", name: "Access Request", description: "Request system access", category: "IT", linkedAgentId: null, linkedAgentName: null, linkedAgentOwnerId: null, linkedAgentOwnerName: null, linkedAgentOwnerEmail: null },
  { id: "new-hire-setup", name: "New Hire Setup", description: "Provision accounts for new employees", category: "HR", linkedAgentId: null, linkedAgentName: null, linkedAgentOwnerId: null, linkedAgentOwnerName: null, linkedAgentOwnerEmail: null },
  { id: "offboarding", name: "Offboarding", description: "Revoke access for departing employees", category: "HR", linkedAgentId: "7", linkedAgentName: "HR Assistant", linkedAgentOwnerId: "user-1", linkedAgentOwnerName: "You", linkedAgentOwnerEmail: null },
  { id: "software-install", name: "Software Installation", description: "Request and install approved software", category: "IT", linkedAgentId: null, linkedAgentName: null, linkedAgentOwnerId: null, linkedAgentOwnerName: null, linkedAgentOwnerEmail: null },
  { id: "vpn-setup", name: "VPN Setup", description: "Configure VPN access for remote work", category: "IT", linkedAgentId: null, linkedAgentName: null, linkedAgentOwnerId: null, linkedAgentOwnerName: null, linkedAgentOwnerEmail: null },
  { id: "expense-submit", name: "Expense Submission", description: "Submit and track expense reports", category: "Finance", linkedAgentId: null, linkedAgentName: null, linkedAgentOwnerId: null, linkedAgentOwnerName: null, linkedAgentOwnerEmail: null },
  { id: "pto-request", name: "PTO Request", description: "Submit time off requests", category: "HR", linkedAgentId: null, linkedAgentName: null, linkedAgentOwnerId: null, linkedAgentOwnerName: null, linkedAgentOwnerEmail: null },
];

// Available skills for the Add Skill modal
// linkedAgent: null = available, string = name of agent using this skill
const AVAILABLE_SKILLS = [
  { id: "lookup-birthday", name: "Lookup employee birthday", author: "System", icon: Calendar, starters: ["When is my coworker's birthday?", "Look up a birthday"], linkedAgent: null },
  { id: "reset-password", name: "Reset password", author: "IT Team", icon: Key, starters: ["I forgot my password", "Reset my password", "I need a new password"], linkedAgent: "HelpDesk Advisor" },
  { id: "check-pto", name: "Check PTO balance", author: "HR Team", icon: Clock, starters: ["How much PTO do I have?", "Check my time off balance", "How many vacation days left?"], linkedAgent: "PTO Balance Checker" },
  { id: "verify-i9", name: "Verify I-9 forms", author: "Compliance", icon: ShieldCheck, starters: ["Check my I-9 status", "Is my I-9 complete?"], linkedAgent: "Compliance Checker" },
  { id: "check-background", name: "Check background status", author: "HR Team", icon: Users, starters: ["What's my background check status?", "Is my background check done?"], linkedAgent: null },
  { id: "unlock-account", name: "Unlock account", author: "IT Team", icon: Lock, starters: ["My account is locked", "Unlock my account", "I can't log in"], linkedAgent: "HelpDesk Advisor" },
  { id: "submit-expense", name: "Submit expense report", author: "Finance", icon: Briefcase, starters: ["Submit an expense", "I need to file an expense report", "How do I get reimbursed?"], linkedAgent: null },
  { id: "request-access", name: "Request system access", author: "IT Team", icon: Key, starters: ["Request access to a system", "I need access to...", "How do I get permissions?"], linkedAgent: "HelpDesk Advisor" },
];

// Icon picker options
const ICON_COLORS = [
  { id: "slate", bg: "bg-slate-800", text: "text-white", preview: "bg-slate-800" },
  { id: "blue", bg: "bg-blue-600", text: "text-white", preview: "bg-blue-600" },
  { id: "emerald", bg: "bg-emerald-600", text: "text-white", preview: "bg-emerald-600" },
  { id: "violet", bg: "bg-violet-200", text: "text-foreground", preview: "bg-violet-200" },
  { id: "purple", bg: "bg-purple-600", text: "text-white", preview: "bg-purple-600" },
  { id: "orange", bg: "bg-orange-500", text: "text-white", preview: "bg-orange-500" },
  { id: "rose", bg: "bg-rose-500", text: "text-white", preview: "bg-rose-500" },
];

const AVAILABLE_ICONS = [
  { id: "bot", icon: Bot, keywords: ["ai", "assistant", "robot"] },
  { id: "message-square", icon: MessageSquare, keywords: ["chat", "conversation"] },
  { id: "headphones", icon: Headphones, keywords: ["support", "help", "audio"] },
  { id: "graduation-cap", icon: GraduationCap, keywords: ["education", "learning", "training"] },
  { id: "shield-check", icon: ShieldCheck, keywords: ["security", "compliance", "protection"] },
  { id: "clipboard-list", icon: ClipboardList, keywords: ["tasks", "checklist", "todo"] },
  { id: "users", icon: Users, keywords: ["team", "people", "hr"] },
  { id: "briefcase", icon: Briefcase, keywords: ["work", "business", "job"] },
  { id: "book-open", icon: BookOpen, keywords: ["knowledge", "documentation", "reading"] },
  { id: "zap", icon: Zap, keywords: ["automation", "fast", "power"] },
  { id: "target", icon: Target, keywords: ["goals", "focus", "aim"] },
  { id: "globe", icon: Globe, keywords: ["web", "international", "world"] },
  { id: "lock", icon: Lock, keywords: ["security", "password", "private"] },
  { id: "mail", icon: Mail, keywords: ["email", "message", "communication"] },
  { id: "phone", icon: Phone, keywords: ["call", "contact", "support"] },
  { id: "calendar", icon: Calendar, keywords: ["schedule", "date", "time"] },
  { id: "database", icon: Database, keywords: ["data", "storage", "info"] },
  { id: "folder", icon: Folder, keywords: ["files", "documents", "organize"] },
  { id: "settings", icon: Settings, keywords: ["config", "preferences", "options"] },
  { id: "wrench", icon: Wrench, keywords: ["tools", "fix", "repair"] },
  { id: "heart", icon: Heart, keywords: ["health", "wellness", "care"] },
  { id: "star", icon: Star, keywords: ["favorite", "rating", "important"] },
  { id: "award", icon: Award, keywords: ["achievement", "recognition", "badge"] },
  { id: "rocket", icon: Rocket, keywords: ["launch", "startup", "fast"] },
  { id: "coffee", icon: Coffee, keywords: ["break", "cafe", "drink"] },
  { id: "home", icon: Home, keywords: ["house", "main", "dashboard"] },
  { id: "key", icon: Key, keywords: ["access", "password", "unlock"] },
  { id: "layers", icon: Layers, keywords: ["stack", "design", "levels"] },
  { id: "map", icon: Map, keywords: ["location", "navigation", "directions"] },
  { id: "package", icon: Package, keywords: ["shipping", "delivery", "box"] },
  { id: "shopping-cart", icon: ShoppingCart, keywords: ["ecommerce", "buy", "cart"] },
  { id: "thumbs-up", icon: ThumbsUp, keywords: ["like", "approve", "good"] },
  { id: "trending-up", icon: TrendingUp, keywords: ["growth", "analytics", "increase"] },
  { id: "line-chart", icon: LineChart, keywords: ["analytics", "data", "metrics"] },
  { id: "landmark", icon: Landmark, keywords: ["bank", "finance", "government"] },
  { id: "truck", icon: Truck, keywords: ["delivery", "shipping", "logistics"] },
  { id: "squirrel", icon: Squirrel, keywords: ["animal", "nature", "cute"] },
];

// Mock saved agents data (for loading existing agents)
const MOCK_SAVED_AGENTS: Record<string, AgentConfig> = {
  "1": {
    name: "HelpDesk Advisor",
    description: "Answers IT support questions and helps employees troubleshoot common technical issues.",
    role: "A friendly and knowledgeable IT support specialist",
    responsibilities: "Answering questions about password resets, VPN setup, software installation, and common IT issues. Providing step-by-step troubleshooting guidance.",
    completionCriteria: "When the user's technical issue is resolved, or when it needs to escalate to the IT team for hands-on support.",
    agentType: "answer",
    knowledgeSources: ["IT Security Policy", "Employee FAQ"],
    workflows: ["Reset password", "Unlock account", "Request system access"],
    hasRequiredConnections: true,
    instructions: "You are a friendly and knowledgeable IT HelpDesk Advisor.\n\n## Your Role\nHelp employees troubleshoot and resolve common technical issues. Provide clear, step-by-step guidance that non-technical users can follow.\n\n## Guidelines\n- Always greet users warmly and acknowledge their issue\n- Ask clarifying questions to understand the problem before suggesting solutions\n- Provide numbered step-by-step instructions when walking through solutions\n- Use simple, non-technical language whenever possible\n- If a solution doesn't work, offer alternative approaches\n- Know when to escalate: if an issue requires physical access, admin privileges, or is beyond self-service, direct users to submit a ticket\n\n## Common Issues You Handle\n- Password resets and account lockouts\n- VPN connection problems\n- Software installation requests\n- Email and calendar issues\n- Printer and peripheral setup\n- Network connectivity troubleshooting\n\n## Escalation\nIf you cannot resolve an issue or it requires hands-on IT support, help the user create a support ticket with all relevant details.",
    conversationStarters: [
      "I forgot my password",
      "My account is locked",
      "I need access to a system",
    ],
    guardrails: ["payroll questions", "HR policy questions"],
    iconId: "headphones",
    iconColorId: "blue",
    capabilities: { webSearch: true, imageGeneration: false, useAllWorkspaceContent: false },
  },
  "2": {
    name: "Onboarding Compliance Checker",
    description: "Answers from compliance docs and ensures new hires complete required training.",
    role: "A compliance-focused onboarding assistant",
    responsibilities: "Guiding new employees through required compliance training, answering questions about company policies, and tracking completion status.",
    completionCriteria: "When the employee confirms understanding of all required compliance items.",
    agentType: "knowledge",
    knowledgeSources: ["HR Policies", "Code of Conduct", "IT Security Policy", "Employee FAQ"],
    workflows: [],
    hasRequiredConnections: true,
    instructions: "You are a compliance onboarding assistant.\n\nYou ONLY answer from the connected compliance documents.\n\nDo not make up information - if something isn't in the documents, say so.",
    conversationStarters: [
      "What compliance training do I need?",
      "Tell me about the code of conduct",
      "What are the security policies?",
      "How do I report compliance issues?",
    ],
    guardrails: ["IT troubleshooting", "benefits questions", "payroll"],
    iconId: "shield-check",
    iconColorId: "emerald",
    capabilities: { webSearch: false, imageGeneration: false, useAllWorkspaceContent: false },
  },
  "3": {
    name: "Password Reset Bot",
    description: "Automates password resets for employees.",
    role: "An automated password reset assistant",
    responsibilities: "Verifying user identity and executing password resets through the AD workflow.",
    completionCriteria: "When the password reset is complete and the user confirms they can log in.",
    agentType: "workflow",
    knowledgeSources: [],
    workflows: ["Password Reset"],
    hasRequiredConnections: true,
    instructions: "You help employees reset their passwords.\n\nAlways verify the user's identity before initiating a reset.\n\nExplain each step of the process clearly.",
    conversationStarters: [
      "I need to reset my password",
      "I'm locked out of my account",
      "Can you help me change my password?",
      "My password expired",
    ],
    guardrails: ["other IT issues", "software installation", "VPN setup"],
    iconId: "key",
    iconColorId: "purple",
    capabilities: { webSearch: false, imageGeneration: false, useAllWorkspaceContent: false },
  },
};

export default function AgentBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: agentId } = useParams<{ id: string }>();
  const agentName = location.state?.agentName || "Untitled Agent";
  const duplicatedConfig = location.state?.duplicatedConfig as AgentConfig | undefined;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if we're editing an existing agent
  const isEditing = !!agentId;
  const savedAgent = agentId ? MOCK_SAVED_AGENTS[agentId] : null;
  const isDuplicate = !!duplicatedConfig;

  // Default to configure tab
  const [activeTab, setActiveTab] = useState<"configure" | "access">("configure");
  const [showTestModal, setShowTestModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [step, setStep] = useState<ConversationStep>(isEditing || isDuplicate ? "done" : "start");
  const [isTyping, setIsTyping] = useState(false);
  const [_statusMessage, _setStatusMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<AgentConfig>(duplicatedConfig || savedAgent || {
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
    capabilities: { webSearch: true, imageGeneration: false, useAllWorkspaceContent: false },
  });

  // Legacy button states (for old flow)
  const [showConfirmButtons, setShowConfirmButtons] = useState(false);
  const [_showKnowledgeButtons, _setShowKnowledgeButtons] = useState(false);
  const [_showWorkflowButtons, _setShowWorkflowButtons] = useState(false);

  // Selection UI states (new flow)
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [selectedType, setSelectedType] = useState<"answer" | "knowledge" | "workflow" | null>(null);
  const [_suggestedType, _setSuggestedType] = useState<"answer" | "knowledge" | "workflow">("answer");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [_selectedWorkflows, _setSelectedWorkflows] = useState<string[]>([]);
  const [_sourceSearchQuery, _setSourceSearchQuery] = useState("");
  const [_suggestedSourceIds, _setSuggestedSourceIds] = useState<string[]>([]);
  const [showTypeConfirmation, setShowTypeConfirmation] = useState(false);
  const [showTriggerPhrases, setShowTriggerPhrases] = useState(false);
  const [suggestedTriggerPhrases, setSuggestedTriggerPhrases] = useState<string[]>([]);
  const [showGuardrails, setShowGuardrails] = useState(true);
  const [guardrailInput, setGuardrailInput] = useState("");

  // Test tab state
  const [testMessages, setTestMessages] = useState<Message[]>([]);
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
  const [showConfirmTypeChangeModal, setShowConfirmTypeChangeModal] = useState(false);
  const [pendingAgentType, setPendingAgentType] = useState<"answer" | "knowledge" | "workflow" | null>(null);

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
  const [workflowToUnlink, setWorkflowToUnlink] = useState<{ id: string; name: string; linkedAgentName: string } | null>(null);

  // Knowledge picker state
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState("");

  // Access tab state
  const [accessSearchQuery, setAccessSearchQuery] = useState("");
  const [showAccessDropdown, setShowAccessDropdown] = useState(false);
  const [addedAccessItems, setAddedAccessItems] = useState<Array<{
    id: string;
    type: "team" | "user";
    name: string;
    email?: string;
    initials?: string;
    color: string;
    bgClass: string;
    textClass: string;
  }>>([]);

  // Create new workflow modal state
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("");

  // Add skill modal state
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Instructions expanded modal state
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  // Conversation starters customization toggle
  const [showCustomStarters, setShowCustomStarters] = useState(true);

  // Description visibility toggle
  const [showDescription, setShowDescription] = useState(false);

  // Knowledge collapsible toggle
  const [showKnowledge, setShowKnowledge] = useState(false);

  // Track when skills were just added to show "updated" message
  const [instructionsUpdatedFromSkills, setInstructionsUpdatedFromSkills] = useState(false);
  const prevWorkflowsLength = useRef(config.workflows.length);

  // Detect when skills are added and auto-populate instructions
  useEffect(() => {
    if (config.workflows.length > prevWorkflowsLength.current) {
      // Skills were added - generate instructions content
      const skillNames = config.workflows.map((w) => w.name);
      const generatedInstructions = `# What you do
Help users with ${skillNames.join(", ")}. Guide them through each process step-by-step.

# Skills available
${skillNames.map((name) => `- ${name}`).join("\n")}

# How you work
1) Understand - Ask clarifying questions to understand what the user needs
2) Execute - Use your skills to complete the task
3) Confirm - Verify the task was completed successfully`;

      setConfig((prev) => ({ ...prev, instructions: generatedInstructions }));
      setInstructionsUpdatedFromSkills(true);
      // Auto-hide message after 5 seconds
      const timer = setTimeout(() => setInstructionsUpdatedFromSkills(false), 5000);
      return () => clearTimeout(timer);
    }
    prevWorkflowsLength.current = config.workflows.length;
  }, [config.workflows.length, config.workflows]);

  // Builder mode toggle - can be set via URL ?mode=chat|wizard|wizard-float|canvas
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get("mode") as "chat" | "wizard" | "wizard-float" | "canvas" | null;
  const [builderMode, setBuilderMode] = useState<"chat" | "wizard" | "wizard-float" | "canvas">(
    modeParam && ["chat", "wizard", "wizard-float", "canvas"].includes(modeParam) ? modeParam : "chat"
  );

  // Auto-save with 1.5s debounce
  const { status: saveStatus, isDirty, error: saveError } = useAutoSave({
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

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hi! I can help you build a new agent.\nFirst, what kind of agent are you building today?`,
    },
  ]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, showConfirmButtons, showTypeSelector, showSourceSelector, showTypeConfirmation, showTriggerPhrases, showGuardrails]);

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
  }, [showTestModal, testMessages.length, step, config.name, config.description]);

  // Handle test message submission
  const handleTestSendMessage = () => {
    if (!testInput.trim() || isTestTyping) return;

    const userMessage: Message = {
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
    setTimeout(() => {
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
    }, 1000 + Math.random() * 1000);
  };

  // Generate simulated test response based on agent config
  const generateTestResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    // Check if agent has minimal config
    const hasSkills = config.workflows.length > 0;
    const hasKnowledge = config.knowledgeSources.length > 0;
    const hasInstructions = config.instructions && config.instructions.trim().length > 0;

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
    if (input.includes("find skill") || input.includes("add skill") || input.includes("more skill") || input.includes("what skill") || input.includes("need skill") || input.includes("skills to add")) {
      const currentSkills = hasSkills
        ? `**Current skills:**\n${config.workflows.map(s => `• ${s}`).join("\n")}\n\n`
        : "";

      return `${currentSkills}**Suggested skills for ${config.name || "this agent"}:**\n• Check VPN status\n• Submit IT ticket\n• Software installation request\n• Hardware replacement request\n• Email configuration help\n\n**To add skills:**\n1. Click "+ Add skill" in Configure\n2. Browse or search available skills\n3. Select and add`;
    }

    // Check if this matches any of the agent's skills/workflows
    const hasPasswordReset = config.workflows.some(w => w.toLowerCase().includes("password"));
    const hasUnlockAccount = config.workflows.some(w => w.toLowerCase().includes("unlock"));
    const hasRequestAccess = config.workflows.some(w => w.toLowerCase().includes("access"));
    const hasPTO = config.workflows.some(w => w.toLowerCase().includes("pto"));
    const hasBirthday = config.workflows.some(w => w.toLowerCase().includes("birthday"));

    // Password reset flow
    if (hasPasswordReset && (input.includes("password") || input.includes("forgot") || input.includes("reset"))) {
      return `I can help you reset your password. Let me verify your identity first.\n\n**To reset your password, I'll need:**\n• Your employee ID or email address\n• Answer to your security question\n\nOnce verified, I'll send a password reset link to your registered email. The link expires in 15 minutes.\n\nWould you like me to proceed with the password reset?`;
    }

    // Account unlock flow
    if (hasUnlockAccount && (input.includes("locked") || input.includes("unlock") || input.includes("can't log in") || input.includes("cannot log in"))) {
      return `I see you're having trouble accessing your account. Let me help you unlock it.\n\n**Account Status Check:**\n• Checking Active Directory status...\n• Account appears to be locked due to multiple failed login attempts\n\n**To unlock your account:**\n1. I'll verify your identity\n2. Unlock your AD account\n3. You can then log in with your existing password\n\nShall I proceed with unlocking your account?`;
    }

    // System access request flow
    if (hasRequestAccess && (input.includes("access") || input.includes("permission") || input.includes("system"))) {
      return `I can help you request access to a system.\n\n**Available systems:**\n• Salesforce CRM\n• Jira Project Management\n• Confluence Wiki\n• GitHub Enterprise\n• AWS Console\n\nPlease specify which system you need access to, and I'll initiate the access request workflow. Your manager will receive a notification for approval.\n\nWhich system do you need access to?`;
    }

    // PTO check flow
    if (hasPTO && (input.includes("pto") || input.includes("time off") || input.includes("vacation") || input.includes("leave"))) {
      return `Let me check your PTO balance.\n\n**Your Time Off Summary:**\n• Available PTO: 12 days\n• Used this year: 8 days\n• Pending requests: 0 days\n\nWould you like to submit a new time off request?`;
    }

    // Birthday lookup flow
    if (hasBirthday && (input.includes("birthday") || input.includes("coworker"))) {
      return `I can help you look up an employee's birthday.\n\nPlease provide the employee's name or email, and I'll find their birthday for you. Note: Only work anniversary dates are shared publicly; birth dates require the employee's consent to share.\n\nWhose birthday would you like to look up?`;
    }

    // Generic skill-based response if agent has skills but no specific match
    if (hasSkills) {
      return `I'm ${config.name || "your assistant"}, and I can help you with:\n\n${config.workflows.map(s => `• ${s}`).join("\n")}\n\nBased on your message, it looks like you might need help with one of these. Could you tell me more specifically what you need?`;
    }

    // Knowledge-based response
    if (hasKnowledge) {
      return `I can help answer questions based on my knowledge sources:\n\n${config.knowledgeSources.slice(0, 3).map(s => `• ${s}`).join("\n")}${config.knowledgeSources.length > 3 ? `\n• ...and ${config.knowledgeSources.length - 3} more` : ""}\n\nCould you be more specific about what you'd like to know?`;
    }

    // Default response with instructions
    return `Thanks for your question about "${userInput}"\n\nAs ${config.name || "your assistant"}, I'm configured to help based on my instructions.\n\n[This is a preview. In production, I'll provide real answers based on my configuration.]`;
  };

  // Generate debug trace for a user message
  const generateDebugTrace = (userInput: string): DebugTraceStep[] => {
    const input = userInput.toLowerCase();
    const hasSkills = config.workflows.length > 0;
    const hasKnowledge = config.knowledgeSources.length > 0;
    const matchedGuardrail = config.guardrails.find(g => g && input.includes(g.toLowerCase()));
    const matchedSkill = config.workflows.find(w => {
      const skillLower = w.toLowerCase();
      return input.includes(skillLower) ||
        (skillLower.includes("password") && input.includes("password")) ||
        (skillLower.includes("unlock") && input.includes("unlock")) ||
        (skillLower.includes("access") && input.includes("access"));
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
          decision: matchedSkill ? "execute_skill" : hasKnowledge ? "search_knowledge" : "direct_response"
        }
      },
      {
        id: "plan",
        type: "intent",
        label: "Plan & Execute",
        description: "Identify the appropriate tools and initiate their execution",
        status: "success",
        duration: 180 + Math.floor(Math.random() * 100),
        input: { message: userInput },
        output: {
          plan: matchedSkill ? ["search_knowledge", "execute_skill", "respond"] : hasKnowledge ? ["search_knowledge", "respond"] : ["respond"],
          confidence: 0.87 + Math.random() * 0.1
        }
      }
    ];

    // Add knowledge search step if agent has knowledge
    if (hasKnowledge) {
      const knowledgeFailed = isTimeoutTest || isConnectionError;
      trace.push({
        id: "knowledge",
        type: "knowledge",
        label: "Company search",
        description: knowledgeFailed
          ? (isTimeoutTest ? "Search timed out" : "Connection failed")
          : isNoResults
            ? "No relevant company knowledge found"
            : "Checking for any relevant company knowledge",
        status: knowledgeFailed ? "error" : "success",
        duration: isTimeoutTest ? 30000 : (800 + Math.floor(Math.random() * 400)),
        input: { query: userInput, sources: config.knowledgeSources },
        output: knowledgeFailed ? undefined : {
          documentsFound: isNoResults ? 0 : Math.floor(Math.random() * 5) + 1,
          sources: config.knowledgeSources.slice(0, 2)
        },
        error: isTimeoutTest
          ? "The knowledge search took too long to respond. Try again or check your data source connection."
          : isConnectionError
            ? "Couldn't connect to the knowledge source. The service may be temporarily unavailable."
            : undefined
      });
    }

    // Add skill execution step if matched
    if (matchedSkill) {
      const skillFailed = isConnectionError && !isTimeoutTest;
      trace.push({
        id: "skill",
        type: "skill",
        label: `Skill: ${matchedSkill}`,
        description: skillFailed ? "Skill execution failed" : "Execute matched skill",
        status: skillFailed ? "error" : "success",
        duration: skillFailed ? 150 : (600 + Math.floor(Math.random() * 300)),
        input: { skill: matchedSkill, params: { userInput } },
        output: skillFailed ? undefined : { executed: true, result: "Action completed" },
        error: skillFailed ? `The "${matchedSkill}" skill couldn't complete. The connected service isn't responding.` : undefined
      });
    }

    // Determine if any previous step failed
    const hasPreviousError = trace.some(t => t.status === "error");

    // Add guardrail check only if there are guardrails
    if (config.guardrails.filter(Boolean).length > 0) {
      trace.push({
        id: "guardrail",
        type: "guardrail",
        label: "Guardrail",
        description: matchedGuardrail ? `Blocked topic: ${matchedGuardrail}` : "Verify response meets safety guidelines",
        status: matchedGuardrail ? "error" : "success",
        duration: 45 + Math.floor(Math.random() * 30),
        input: { guardrails: config.guardrails.filter(Boolean) },
        output: {
          passed: !matchedGuardrail,
          blocked: matchedGuardrail || null,
          checkedRules: config.guardrails.filter(Boolean).length
        },
        error: matchedGuardrail ? `Message blocked by guardrail: ${matchedGuardrail}` : undefined
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
        tokenCount: Math.floor(Math.random() * 200) + 50
      }
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
    config: AgentConfig
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
    if (desc.includes("onboarding") || role.includes("onboarding") || responsibilities.includes("onboarding") || responsibilities.includes("new employee")) {
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
    if (desc.includes("hr") || desc.includes("benefits") || role.includes("hr") || responsibilities.includes("pto") || responsibilities.includes("benefits")) {
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
    if (desc.includes("it") || desc.includes("technical") || role.includes("it") || responsibilities.includes("password") || responsibilities.includes("access")) {
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
  const generateOverallUnderstanding = (agentConfig: AgentConfig, agentType: "answer" | "knowledge" | "workflow"): string => {
    const role = agentConfig.role || "assistant";
    const responsibilities = agentConfig.responsibilities || "helping users";
    const completion = agentConfig.completionCriteria || "when the task is complete";

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
    const text = `${agentConfig.description} ${agentConfig.role} ${agentConfig.responsibilities}`.toLowerCase();

    // Score each source based on tag matches
    const scored = AVAILABLE_KNOWLEDGE_SOURCES.map((source) => {
      let score = 0;
      source.tags.forEach((tag) => {
        if (text.includes(tag)) score += 2;
      });
      // Also check name/description
      if (text.includes(source.name.toLowerCase())) score += 3;
      source.description.toLowerCase().split(" ").forEach((word) => {
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

  const addAssistantMessage = (content: string, options?: { showButtons?: boolean }) => {
    setIsTyping(true);
    setShowConfirmButtons(false);

    setTimeout(() => {
      const newMessage: Message = {
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
          `Got it. Let's define who this agent is.\n\n**How would you describe the role or persona of this agent?**\nFor example: "a friendly HR advisor" or "an on-call IT specialist."`
        );
        break;

      case "role":
        setConfig((prev) => ({ ...prev, role: input }));
        setStep("responsibilities");
        addAssistantMessage(
          `Nice. Now let's get specific.\n\n**What should this agent help with day to day?**\nYou can list the types of questions or situations it should handle.`
        );
        break;

      case "responsibilities":
        setConfig((prev) => ({ ...prev, responsibilities: input }));
        setStep("completion");
        addAssistantMessage(
          `Almost there.\n\n**When should this agent consider its job complete?**\nFor example, when the question is answered, when next steps are provided, or when it needs to hand off to a human.`
        );
        break;

      case "completion":
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
    const nameMatch = input.match(/(?:change|set|update|rename)\s+(?:the\s+)?(?:agent\s+)?name\s+(?:to\s+)?["']?([^"']+)["']?/i) ||
                      input.match(/(?:call\s+(?:it|this|the\s+agent)\s+)["']?([^"']+)["']?/i);
    if (nameMatch) {
      const newName = nameMatch[1].trim();
      setConfig((prev) => ({ ...prev, name: newName }));
      changes.push(`name to "${newName}"`);
      handled = true;
    }

    // Description change
    const descMatch = input.match(/(?:change|set|update)\s+(?:the\s+)?description\s+(?:to\s+)?["']?([^"']+)["']?/i) ||
                      input.match(/(?:make\s+(?:the\s+)?description)\s+["']?([^"']+)["']?/i);
    if (descMatch) {
      const newDesc = descMatch[1].trim();
      setConfig((prev) => ({ ...prev, description: newDesc }));
      changes.push(`description`);
      handled = true;
    }

    // Add conversation starter
    const starterMatch = input.match(/(?:add|create)\s+(?:a\s+)?(?:conversation\s+)?starter[:\s]+["']?([^"']+)["']?/i) ||
                         input.match(/add\s+["']([^"']+)["']\s+(?:as\s+)?(?:a\s+)?(?:conversation\s+)?starter/i);
    if (starterMatch) {
      const newStarter = starterMatch[1].trim();
      if (config.conversationStarters.length < 6 && !config.conversationStarters.includes(newStarter)) {
        setConfig((prev) => ({ ...prev, conversationStarters: [...prev.conversationStarters, newStarter] }));
        changes.push(`conversation starter "${newStarter}"`);
        handled = true;
      }
    }

    // Remove conversation starter
    const removeStarterMatch = input.match(/(?:remove|delete)\s+(?:the\s+)?(?:conversation\s+)?starter[:\s]+["']?([^"']+)["']?/i);
    if (removeStarterMatch) {
      const toRemove = removeStarterMatch[1].trim().toLowerCase();
      const idx = config.conversationStarters.findIndex(s => s.toLowerCase().includes(toRemove));
      if (idx !== -1) {
        const removed = config.conversationStarters[idx];
        setConfig((prev) => ({
          ...prev,
          conversationStarters: prev.conversationStarters.filter((_, i) => i !== idx)
        }));
        changes.push(`removed starter "${removed}"`);
        handled = true;
      }
    }

    // Add guardrail
    const guardrailMatch = input.match(/(?:add|create)\s+(?:a\s+)?guardrail[:\s]+["']?([^"']+)["']?/i) ||
                           input.match(/(?:don't|do\s+not|shouldn't)\s+(?:answer|help\s+with|handle)\s+["']?([^"']+)["']?/i);
    if (guardrailMatch) {
      const newGuardrail = guardrailMatch[1].trim();
      if (!config.guardrails.includes(newGuardrail)) {
        setConfig((prev) => ({ ...prev, guardrails: [...prev.guardrails, newGuardrail] }));
        changes.push(`guardrail for "${newGuardrail}"`);
        handled = true;
      }
    }

    // Enable/disable web search
    if (lowerInput.includes("enable") && lowerInput.includes("web search")) {
      setConfig((prev) => ({ ...prev, capabilities: { ...prev.capabilities, webSearch: true } }));
      changes.push("enabled web search");
      handled = true;
    }
    if (lowerInput.includes("disable") && lowerInput.includes("web search")) {
      setConfig((prev) => ({ ...prev, capabilities: { ...prev.capabilities, webSearch: false } }));
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
    const instructionsMatch = input.match(/(?:change|set|update)\s+(?:the\s+)?instructions?\s+(?:to\s+)?["']?(.+)["']?$/i);
    if (instructionsMatch) {
      const newInstructions = instructionsMatch[1].trim();
      setConfig((prev) => ({ ...prev, instructions: newInstructions }));
      changes.push("instructions");
      handled = true;
    }

    // Handle skill-related questions
    if (lowerInput.includes("skill") || lowerInput.includes("find skill") || lowerInput.includes("add skill")) {
      const currentSkills = config.workflows.length > 0
        ? `**Current skills:**\n${config.workflows.map(s => `• ${s}`).join("\n")}\n\n`
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
        `4. Select skills and click "Add"`
      );
      return;
    }

    // Provide feedback
    if (handled && changes.length > 0) {
      const changeList = changes.join(", ");
      addAssistantMessage(`✓ Updated ${changeList}. The preview has been refreshed.\n\nWhat else would you like to change?`);
    } else {
      // Try to be helpful with unhandled input
      addAssistantMessage(
        `I can help you update your agent! Try commands like:\n\n` +
        `• "Change the name to [new name]"\n` +
        `• "Add a conversation starter: [question]"\n` +
        `• "Add a guardrail: [topic to avoid]"\n` +
        `• "Enable/disable web search"\n` +
        `• "Change the type to [answer/knowledge/workflow]"\n\n` +
        `Or switch to the **Configure** tab to make changes directly.`
      );
    }
  };

  const _handleConfirm = () => {
    setShowConfirmButtons(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Yes, continue",
    };
    setMessages((prev) => [...prev, userMessage]);

    // Move to type-specific requirements step
    setStep("knowledge_sources");

    if (config.agentType === "answer") {
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `Great! To help this agent answer questions effectively, would you like to connect any knowledge sources?\n\nThis could include HR docs, policy guides, FAQs, or other reference materials.`,
          },
        ]);
        setIsTyping(false);
        _setShowKnowledgeButtons(true);
      }, 800);
    } else if (config.agentType === "knowledge") {
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `Since this is a **Knowledge Agent**, it will only answer from specific documents — no guessing or inference.\n\n**Which documents should this agent use?**\nThis is required for Knowledge Agents to ensure accuracy and compliance.`,
          },
        ]);
        setIsTyping(false);
        _setShowKnowledgeButtons(true);
      }, 800);
    } else if (config.agentType === "workflow") {
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `Since this is a **Workflow Agent**, it needs to connect to workflows to perform actions.\n\n**Which workflows should this agent have access to?**\nThis is required for Workflow Agents to execute tasks.`,
          },
        ]);
        setIsTyping(false);
        _setShowWorkflowButtons(true);
      }, 800);
    }
  };

  const _handleAddKnowledgeSources = () => {
    _setShowKnowledgeButtons(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Add knowledge sources",
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate adding knowledge sources
    setConfig((prev) => ({
      ...prev,
      knowledgeSources: ["HR Policies", "Benefits Guide", "PTO Handbook"],
      hasRequiredConnections: true,
    }));

    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `I've connected the following knowledge sources:\n• HR Policies\n• Benefits Guide\n• PTO Handbook\n\nYour agent is now configured and ready. You can review the settings in the Configure tab or click Publish when ready.`,
        },
      ]);
      setIsTyping(false);
      setStep("done");
    }, 1000);
  };

  const _handleSkipKnowledgeSources = () => {
    _setShowKnowledgeButtons(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Skip for now",
    };
    setMessages((prev) => [...prev, userMessage]);

    // For Answer Agents, skipping is allowed
    if (config.agentType === "answer") {
      setConfig((prev) => ({ ...prev, hasRequiredConnections: true }));
      addAssistantMessage(
        "No problem! You can add knowledge sources later in the Configure tab.\n\nYour agent is ready. Click Publish when you're done."
      );
      setStep("done");
    } else {
      // For Knowledge Agents, this is required
      addAssistantMessage(
        "Knowledge sources are required for Knowledge Agents. Please select at least one document to continue."
      );
      _setShowKnowledgeButtons(true);
    }
  };

  const _handleAddWorkflows = () => {
    _setShowWorkflowButtons(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Connect workflows",
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate adding workflows
    setConfig((prev) => ({
      ...prev,
      workflows: ["Password Reset", "Access Request"],
      hasRequiredConnections: true,
    }));

    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `I've connected the following workflows:\n• Password Reset\n• Access Request\n\nYour agent is now configured and ready. You can review the settings in the Configure tab or click Publish when ready.`,
        },
      ]);
      setIsTyping(false);
      setStep("done");
    }, 1000);
  };

  // Handler for type selection confirmation (new flow)
  const _handleTypeSelectionConfirm = () => {
    if (!selectedType) return;

    setShowTypeSelector(false);
    setConfig((prev) => ({ ...prev, agentType: selectedType }));

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `Selected: ${AGENT_TYPE_INFO[selectedType].label}`,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Move to confirmation step with Overall Understanding
    setStep("confirm_type");
    setIsTyping(true);
    _setStatusMessage("Generating agent understanding...");

    setTimeout(() => {
      setIsTyping(false);
      _setStatusMessage(null);

      const understanding = generateOverallUnderstanding(config, selectedType);
      const typeLabel = AGENT_TYPE_INFO[selectedType].label;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Got it! You're building a **${typeLabel}**.\n\n**Agent Overall Understanding:** ${understanding}\n\nIs this accurate? Please confirm if this correctly captures your agent, or let me know what needs to be adjusted.`,
        },
      ]);
      setShowTypeConfirmation(true);
    }, 1000);
  };

  // Handler for confirming the agent type understanding
  const _handleTypeConfirmationConfirm = () => {
    setShowTypeConfirmation(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Yes, that's correct",
    };
    setMessages((prev) => [...prev, userMessage]);

    // Move to trigger phrases step
    setStep("trigger_phrases");
    setIsTyping(true);
    _setStatusMessage("Generating example phrases...");

    // Generate trigger phrases based on config
    const phrases = generateTriggerPhrases(config);
    setSuggestedTriggerPhrases(phrases);

    setTimeout(() => {
      setIsTyping(false);
      _setStatusMessage(null);

      const typeLabel = selectedType ? AGENT_TYPE_INFO[selectedType].shortLabel : "agent";
      const phrasesList = phrases.map((p, i) => `${i + 1}. "${p}"`).join("\n");

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `**Example phrases users might say:**\n\n${phrasesList}\n\nThese examples cover different ways users might request your ${typeLabel.toLowerCase()}.\n\nDo these examples capture how users would request your agent? You can add, remove, or modify these in the Configure tab.`,
        },
      ]);
      setShowTriggerPhrases(true);
    }, 1000);
  };

  // Handler for continuing after trigger phrases
  const _handleTriggerPhrasesConfirm = () => {
    setShowTriggerPhrases(false);

    // Save the suggested phrases to config as conversation starters
    setConfig((prev) => ({
      ...prev,
      conversationStarters: suggestedTriggerPhrases.slice(0, 4), // Take first 4 as starters
    }));

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Looks good, continue",
    };
    setMessages((prev) => [...prev, userMessage]);

    // Move to guardrails step
    setStep("guardrails");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);

      const agentContext = config.description.toLowerCase().includes("onboarding")
        ? "onboarding"
        : config.role.toLowerCase().includes("hr")
        ? "HR"
        : "this";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Now I need to understand the boundaries of your ${agentContext} agent.\n\n**What types of requests should this agent NOT handle?** For example:\n\n• Should it avoid HR policy questions?\n• Should it not handle IT troubleshooting?\n• Are there specific topics outside of ${agentContext} it should redirect?\n\nPlease tell me what types of requests should be excluded, or say 'none' if it should handle all ${agentContext}-related requests.`,
        },
      ]);
      setShowGuardrails(true);
      setGuardrailInput("");
    }, 800);
  };

  // Handler for guardrails input submission
  const handleGuardrailsSubmit = () => {
    setShowGuardrails(false);

    const input = guardrailInput.trim();
    const isNone = input.toLowerCase() === "none" || input === "";

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: isNone ? "None - handle all related requests" : input,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Parse guardrails from input (split by commas, newlines, or bullet points)
    const guardrails = isNone
      ? []
      : input.split(/[,\n•]/).map(s => s.trim()).filter(s => s.length > 0);

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
  const _handleGuardrailsSkip = () => {
    setGuardrailInput("none");
    handleGuardrailsSubmit();
  };

  // Handler for adjusting the agent type (goes back to selection)
  const _handleTypeConfirmationAdjust = () => {
    setShowTypeConfirmation(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "I'd like to adjust this",
    };
    setMessages((prev) => [...prev, userMessage]);

    // Go back to type selection
    setStep("select_type");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `No problem! Let's pick a different agent type, or tell me more about what you need:`,
        },
      ]);
      setShowTypeSelector(true);
    }, 600);
  };

  // Handler for source/workflow selection confirmation
  const _handleSourceSelectionConfirm = () => {
    const isWorkflowAgent = selectedType === "workflow";
    const isKnowledgeAgent = selectedType === "knowledge";
    const selected = isWorkflowAgent ? _selectedWorkflows : selectedSources;

    // Validate required selections
    if ((isWorkflowAgent || isKnowledgeAgent) && selected.length === 0) {
      // Show error - selection required
      return;
    }

    setShowSourceSelector(false);

    const selectedNames = isWorkflowAgent
      ? _selectedWorkflows.map((id) => AVAILABLE_WORKFLOWS.find((w) => w.id === id)?.name).filter(Boolean)
      : selectedSources.map((id) => AVAILABLE_KNOWLEDGE_SOURCES.find((s) => s.id === id)?.name).filter(Boolean);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: selected.length > 0
        ? `Selected: ${selectedNames.join(", ")}`
        : "Skip for now",
    };
    setMessages((prev) => [...prev, userMessage]);

    // Update config
    if (isWorkflowAgent) {
      setConfig((prev) => ({
        ...prev,
        workflows: selectedNames as string[],
        hasRequiredConnections: true,
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        knowledgeSources: selectedNames as string[],
        hasRequiredConnections: true,
      }));
    }

    setIsTyping(true);
    _setStatusMessage("Finalizing configuration...");

    setTimeout(() => {
      setIsTyping(false);
      _setStatusMessage(null);

      const resourceType = isWorkflowAgent ? "workflows" : "knowledge sources";
      const resourceList = selectedNames.length > 0
        ? `\n${selectedNames.map((n) => `• ${n}`).join("\n")}`
        : "";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: selected.length > 0
            ? `I've connected the following ${resourceType}:${resourceList}\n\nYour agent is now configured and ready. You can review the settings in the Configure tab or click Publish when ready.`
            : `No problem! You can add ${resourceType} later in the Configure tab.\n\nYour agent is ready. Click Publish when you're done.`,
        },
      ]);
      setStep("done");
    }, 1000);
  };

  // Toggle source selection
  const _toggleSourceSelection = (id: string) => {
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const _handleChangeType = () => {
    setShowConfirmButtons(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Change agent type",
    };
    setMessages((prev) => [...prev, userMessage]);

    // Cycle through types
    const types: Array<"answer" | "knowledge" | "workflow"> = ["answer", "knowledge", "workflow"];
    const currentIndex = types.indexOf(config.agentType || "answer");
    const nextType = types[(currentIndex + 1) % types.length];

    setConfig((prev) => ({ ...prev, agentType: nextType }));

    const typeInfo = AGENT_TYPE_INFO[nextType];
    addAssistantMessage(
      `How about this instead:\n\n**${typeInfo.label}**\n\nIt will focus on ${typeInfo.description}.\nDoes that sound right?`,
      { showButtons: true }
    );
  };

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

    const changes: Array<{ field: string; label: string; from: string; to: string; type: "added" | "removed" | "changed" }> = [];

    // Name
    if (config.name !== publishedConfig.name) {
      changes.push({ field: "name", label: "Name", from: publishedConfig.name, to: config.name, type: "changed" });
    }

    // Description
    if (config.description !== publishedConfig.description) {
      changes.push({ field: "description", label: "Description", from: publishedConfig.description || "(empty)", to: config.description || "(empty)", type: "changed" });
    }

    // Skills (workflows)
    const addedSkills = config.workflows.filter(s => !publishedConfig.workflows.includes(s));
    const removedSkills = publishedConfig.workflows.filter(s => !config.workflows.includes(s));
    addedSkills.forEach(skill => {
      changes.push({ field: "skills", label: "Skill added", from: "", to: skill, type: "added" });
    });
    removedSkills.forEach(skill => {
      changes.push({ field: "skills", label: "Skill removed", from: skill, to: "", type: "removed" });
    });

    // Knowledge sources
    const addedKnowledge = config.knowledgeSources.filter(k => !publishedConfig.knowledgeSources.includes(k));
    const removedKnowledge = publishedConfig.knowledgeSources.filter(k => !config.knowledgeSources.includes(k));
    addedKnowledge.forEach(source => {
      changes.push({ field: "knowledge", label: "Knowledge added", from: "", to: source, type: "added" });
    });
    removedKnowledge.forEach(source => {
      changes.push({ field: "knowledge", label: "Knowledge removed", from: source, to: "", type: "removed" });
    });

    // Instructions
    if (config.instructions !== publishedConfig.instructions) {
      changes.push({ field: "instructions", label: "Instructions", from: "(modified)", to: "(modified)", type: "changed" });
    }

    // Conversation starters
    const startersChanged = JSON.stringify(config.conversationStarters) !== JSON.stringify(publishedConfig.conversationStarters);
    if (startersChanged) {
      changes.push({ field: "starters", label: "Conversation starters", from: `${publishedConfig.conversationStarters.length} items`, to: `${config.conversationStarters.length} items`, type: "changed" });
    }

    // Guardrails
    const guardrailsChanged = JSON.stringify(config.guardrails) !== JSON.stringify(publishedConfig.guardrails);
    if (guardrailsChanged) {
      changes.push({ field: "guardrails", label: "Guardrails", from: `${publishedConfig.guardrails.length} items`, to: `${config.guardrails.length} items`, type: "changed" });
    }

    // Capabilities
    if (config.capabilities.webSearch !== publishedConfig.capabilities.webSearch) {
      changes.push({ field: "webSearch", label: "Web search", from: publishedConfig.capabilities.webSearch ? "Enabled" : "Disabled", to: config.capabilities.webSearch ? "Enabled" : "Disabled", type: "changed" });
    }
    if (config.capabilities.useAllWorkspaceContent !== publishedConfig.capabilities.useAllWorkspaceContent) {
      changes.push({ field: "workspaceContent", label: "Workspace knowledge", from: publishedConfig.capabilities.useAllWorkspaceContent ? "Enabled" : "Disabled", to: config.capabilities.useAllWorkspaceContent ? "Enabled" : "Disabled", type: "changed" });
    }

    // Icon
    if (config.iconId !== publishedConfig.iconId || config.iconColorId !== publishedConfig.iconColorId) {
      changes.push({ field: "icon", label: "Icon", from: "(changed)", to: "(changed)", type: "changed" });
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

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

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

    // Show success toast
    toast.success("Agent published successfully", {
      description: `${config.name} is now available for users.`
    });

    // Navigate back to agents list with published agent data
    navigate("/agents", {
      state: {
        publishedAgent: {
          id: isEditing ? agentId : Date.now().toString(),
          name: config.name,
          description: config.description,
          agentType: config.agentType,
          iconId: config.iconId,
          iconColorId: config.iconColorId,
        }
      }
    });
  };


  const handleSendMessage = () => {
    if (!inputValue.trim() || isTyping || showConfirmButtons) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const input = inputValue.trim();
    setInputValue("");

    processUserInput(input);
  };

  const _handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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

  // Mode switcher bar - hidden for screenshots, access via URL ?mode=chat|wizard|wizard-float|canvas
  const ModeSwitcherBar = () => (
    <div className="hidden flex items-center justify-center gap-3 px-4 py-2 bg-white border-b">
      <span className="text-xs text-muted-foreground">Builder variation:</span>
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setBuilderMode("chat")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            builderMode === "chat"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="size-3.5" />
          Chat
        </button>
        <button
          onClick={() => setBuilderMode("wizard")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            builderMode === "wizard"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="size-3.5" />
          Wizard
        </button>
        <button
          onClick={() => setBuilderMode("wizard-float")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            builderMode === "wizard-float"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="size-3.5" />
          Wizard + AI
        </button>
        <button
          onClick={() => setBuilderMode("canvas")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            builderMode === "canvas"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Workflow className="size-3.5" />
          Canvas
        </button>
      </div>
    </div>
  );

  // If wizard mode is selected, render the WizardAgentBuilder
  if (builderMode === "wizard") {
    return (
      <div className="flex flex-col h-screen">
        <ModeSwitcherBar />
        <div className="flex-1 overflow-hidden">
          <WizardAgentBuilder
            initialConfig={{
            name: config.name,
            description: config.description,
            role: config.role,
            completionCriteria: config.completionCriteria,
            iconId: config.iconId,
            iconColorId: config.iconColorId,
            agentType: config.agentType,
          }}
          onBack={handleBack}
          onPublish={(wizardConfig) => {
            setConfig((prev) => ({
              ...prev,
              name: wizardConfig.name,
              description: wizardConfig.description,
              role: wizardConfig.role,
              completionCriteria: wizardConfig.completionCriteria,
              iconId: wizardConfig.iconId,
              iconColorId: wizardConfig.iconColorId,
              agentType: wizardConfig.agentType,
            }));
            setShowPublishModal(true);
          }}
          isEditing={isEditing}
          />
        </div>
      </div>
    );
  }

  // If wizard-float mode is selected, render the WizardFloatBuilder
  if (builderMode === "wizard-float") {
    return (
      <div className="flex flex-col h-screen">
        <ModeSwitcherBar />
        <div className="flex-1 overflow-hidden">
          <WizardFloatBuilder
          initialConfig={{
            name: config.name,
            description: config.description,
            role: config.role,
            completionCriteria: config.completionCriteria,
            iconId: config.iconId,
            iconColorId: config.iconColorId,
            agentType: config.agentType,
          }}
          onBack={handleBack}
          onPublish={(wizardConfig) => {
            setConfig((prev) => ({
              ...prev,
              name: wizardConfig.name,
              description: wizardConfig.description,
              role: wizardConfig.role,
              completionCriteria: wizardConfig.completionCriteria,
              iconId: wizardConfig.iconId,
              iconColorId: wizardConfig.iconColorId,
              agentType: wizardConfig.agentType,
            }));
            setShowPublishModal(true);
          }}
          isEditing={isEditing}
          />
        </div>
      </div>
    );
  }

  // If canvas mode is selected, render the CanvasBuilder
  if (builderMode === "canvas") {
    return (
      <div className="flex flex-col h-screen">
        <ModeSwitcherBar />
        <div className="flex-1 overflow-hidden">
          <CanvasBuilder
            initialConfig={{
              name: config.name,
              description: config.description,
            }}
            onBack={handleBack}
            onPublish={(canvasConfig) => {
              setConfig((prev) => ({
                ...prev,
                name: canvasConfig.name,
                description: canvasConfig.description,
              }));
              setShowPublishModal(true);
            }}
            isEditing={isEditing}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-muted/50">
      <ModeSwitcherBar />

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
          <Badge variant={isEditing || step === "done" ? "default" : "secondary"}>
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
            onClick={() => navigate(isEditing ? `/agents/${agentId}/test` : "/agents/test", {
              state: { agentConfig: config }
            })}
            disabled={!config.name || config.name === "my agent" || (!config.description && !config.instructions && !config.conversationStarters.some(s => s.trim()))}
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
            <Button onClick={handlePublish} disabled={!config.name || (!config.instructions && !config.description)}>
              Publish
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden p-4 gap-4 justify-center">
        {/* Left panel - Configure/Access */}
        <div className="flex flex-col flex-1 max-w-3xl bg-white rounded-xl">
          {/* Tabs with Preview toggle */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="w-20" /> {/* Spacer for centering */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "configure" | "access")}
            >
              <TabsList className="bg-muted/50">
                <TabsTrigger value="configure" className="px-8">Configure</TabsTrigger>
                <TabsTrigger value="access" className="px-8">Access</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowPreview(!showPreview)}
            >
              <MessageSquare className="size-4" />
              {showPreview ? "Hide" : "Preview"}
            </Button>
          </div>

          {/* HIDDEN: Chat Assistant Tab - preserved for future AI-contextual features
          {activeTab === "chat" && (
            <>
              {/* Chat messages *}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                ... chat content hidden ...
              </div>
            </>
          )}
          */}

          {activeTab === "configure" ? (
            /* Configure tab content - Clean design matching Figma */
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
                          ICON_COLORS.find(c => c.id === config.iconColorId)?.bg || "bg-violet-200"
                        )}
                        aria-label="Change agent icon"
                      >
                        {(() => {
                          const iconData = AVAILABLE_ICONS.find(i => i.id === config.iconId);
                          const colorData = ICON_COLORS.find(c => c.id === config.iconColorId);
                          const IconComponent = iconData?.icon || Bot;
                          return <IconComponent className={cn("size-6", colorData?.text || "text-white")} />;
                        })()}
                      </button>
                      <Button variant="ghost" size="icon" className="size-9" onClick={() => setShowIconPicker(!showIconPicker)}>
                        <ChevronDown className="size-4" />
                      </Button>

                      {/* Icon Picker Dropdown */}
                      {showIconPicker && (
                        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border z-50 p-4">
                          {/* Color selection */}
                          <div className="mb-4">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Color</p>
                            <div className="flex gap-2">
                              {ICON_COLORS.map((color) => (
                                <button
                                  key={color.id}
                                  onClick={() => setConfig(prev => ({ ...prev, iconColorId: color.id }))}
                                  className={cn(
                                    "size-10 rounded-full transition-all",
                                    color.bg,
                                    config.iconColorId === color.id
                                      ? "ring-2 ring-offset-2 ring-primary"
                                      : "hover:scale-110"
                                  )}
                                  aria-label={`Select ${color.id} color`}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Icon selection */}
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">Icon</p>
                            <div className="relative mb-3">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input
                                placeholder="Find by type, role, or expertise"
                                value={iconSearchQuery}
                                onChange={(e) => setIconSearchQuery(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                            <div className="grid grid-cols-6 gap-1 max-h-[240px] overflow-y-auto">
                              {AVAILABLE_ICONS
                                .filter(icon => {
                                  if (!iconSearchQuery) return true;
                                  const query = iconSearchQuery.toLowerCase();
                                  return icon.id.includes(query) || icon.keywords.some(k => k.includes(query));
                                })
                                .map((iconData) => {
                                  const IconComponent = iconData.icon;
                                  return (
                                    <button
                                      key={iconData.id}
                                      onClick={() => {
                                        setConfig(prev => ({ ...prev, iconId: iconData.id }));
                                        setShowIconPicker(false);
                                        setIconSearchQuery("");
                                      }}
                                      className={cn(
                                        "size-10 rounded-lg flex items-center justify-center transition-colors",
                                        config.iconId === iconData.id
                                          ? "bg-primary/10 text-primary"
                                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
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
                    <Label htmlFor="agent-description" className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="agent-description"
                      value={config.description}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, description: e.target.value }))
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
                        Help users understand what this agent can help them with by adding skills
                      </p>
                    </div>
                    <Button
                      variant="secondary"
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
                          const skillData = AVAILABLE_SKILLS.find(s => s.name === workflow);
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
                                  const updated = config.workflows.filter((_, i) => i !== index);
                                  setConfig((prev) => ({ ...prev, workflows: updated }));
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
                    <Label htmlFor="instructions" className="text-sm font-medium">
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
                          setConfig((prev) => ({ ...prev, instructions: e.target.value }))
                        }
                        placeholder="Describe instructions..."
                        className="min-h-[60px] resize-none text-sm border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <button
                        className="absolute top-2 right-2 p-2 text-muted-foreground hover:text-foreground"
                        aria-label="Expand instructions"
                        onClick={() => setShowInstructionsModal(true)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 2H14V6M6 14H2V10M14 2L9 7M2 14L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                    {/* Footer bar */}
                    <div className="bg-muted/50 border-t px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Update instructions as needed...
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm">Default personality</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-medium mb-1">Adds the following guidelines to the system prompt:</p>
                              <ul className="list-disc pl-4 text-xs space-y-0.5">
                                <li>Do not restate your identity unless explicitly requested by the user.</li>
                                <li>Provide helpful, accurate, and informative responses to user questions.</li>
                                <li>Ask clarifying questions when needed to better understand the task or provide more relevant information.</li>
                                <li>Maintain a polite, professional, and respectful tone at all times.</li>
                                <li>Keep responses clear, concise, and focused on the user's intent.</li>
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  {/* Updated from skills message */}
                  {instructionsUpdatedFromSkills && (
                    <p className="text-xs text-primary mt-2">
                      Updated based on skills
                    </p>
                  )}
                </div>

                {/* Knowledge Section */}
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Knowledge</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Give your agent general knowledge around its topic
                    </p>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                        <div
                          className="border rounded-md px-3 py-2.5 flex items-center gap-2 cursor-pointer hover:border-muted-foreground/50 transition-colors"
                          onClick={() => {
                            if (!config.capabilities.useAllWorkspaceContent) {
                              const input = document.getElementById("knowledge-search-input");
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
                              config.capabilities.useAllWorkspaceContent && "opacity-50 cursor-not-allowed"
                            )}
                            value={knowledgeSearchQuery}
                            onChange={(e) => setKnowledgeSearchQuery(e.target.value)}
                            disabled={config.capabilities.useAllWorkspaceContent}
                          />
                        </div>

                        {/* Dropdown results */}
                        {knowledgeSearchQuery.trim() && !config.capabilities.useAllWorkspaceContent && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-[300px] overflow-y-auto z-20">
                            {AVAILABLE_KNOWLEDGE_SOURCES
                              .filter((source) => {
                                const query = knowledgeSearchQuery.toLowerCase();
                                return (
                                  source.name.toLowerCase().includes(query) ||
                                  source.description.toLowerCase().includes(query) ||
                                  source.tags.some((tag) => tag.toLowerCase().includes(query))
                                );
                              })
                              .map((source) => {
                                const isAlreadyAdded = config.knowledgeSources.includes(source.name);
                                return (
                                  <button
                                    key={source.id}
                                    className={cn(
                                      "w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/50 transition-colors",
                                      isAlreadyAdded && "opacity-50"
                                    )}
                                    onClick={() => {
                                      if (isAlreadyAdded) return;
                                      setConfig((prev) => ({
                                        ...prev,
                                        knowledgeSources: [...prev.knowledgeSources, source.name],
                                      }));
                                      setKnowledgeSearchQuery("");
                                    }}
                                    disabled={isAlreadyAdded}
                                  >
                                    <div className={cn(
                                      "size-5 rounded flex items-center justify-center flex-shrink-0",
                                      source.type === "upload" ? "bg-amber-100" : "bg-blue-100"
                                    )}>
                                      {source.type === "upload" ? (
                                        <FileText className="size-3 text-foreground" />
                                      ) : (
                                        <Link2 className="size-3 text-foreground" />
                                      )}
                                    </div>
                                    <span className="text-sm flex-1">{source.name}</span>
                                    {isAlreadyAdded && <Check className="size-4 text-primary" />}
                                  </button>
                                );
                              })}
                            {AVAILABLE_KNOWLEDGE_SOURCES.filter((source) => {
                              const query = knowledgeSearchQuery.toLowerCase();
                              return (
                                source.name.toLowerCase().includes(query) ||
                                source.description.toLowerCase().includes(query) ||
                                source.tags.some((tag) => tag.toLowerCase().includes(query))
                              );
                            }).length === 0 && (
                              <div className="px-4 py-6 text-center text-muted-foreground">
                                <p className="text-sm">No matching sources found</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Knowledge container with documents and toggles */}
                      <div className="border rounded-lg">
                        {/* Documents section - only show when not using all workspace */}
                        {!config.capabilities.useAllWorkspaceContent && config.knowledgeSources.length > 0 && (
                          <div className="p-2">
                            <p className="text-sm text-muted-foreground px-2 py-1">
                              Documents ({config.knowledgeSources.length})
                            </p>
                            <div className="px-2 space-y-1">
                              {config.knowledgeSources.map((sourceName, index) => {
                                const sourceData = AVAILABLE_KNOWLEDGE_SOURCES.find((s) => s.name === sourceName);
                                const isConnection = sourceData?.type === "connection";
                                return (
                                  <div
                                    key={index}
                                    className="flex items-center gap-2.5 py-1"
                                  >
                                    <div className={cn(
                                      "size-5 rounded flex items-center justify-center flex-shrink-0",
                                      isConnection ? "bg-blue-100" : "bg-amber-100"
                                    )}>
                                      {isConnection ? (
                                        <Link2 className="size-3 text-foreground" />
                                      ) : (
                                        <FileText className="size-3 text-foreground" />
                                      )}
                                    </div>
                                    <span className="text-xs flex-1">{sourceName}</span>
                                    <button
                                      onClick={() => {
                                        const updated = config.knowledgeSources.filter((_, i) => i !== index);
                                        setConfig((prev) => ({ ...prev, knowledgeSources: updated }));
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

                        {/* Toggle options */}
                        <div className="px-4">
                          <div className="flex items-start justify-between py-3 gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium">Search the web for information</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Let the agent search and reference information found on the websites
                              </p>
                            </div>
                            <Switch
                              checked={config.capabilities.webSearch}
                              onCheckedChange={(checked) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  capabilities: { ...prev.capabilities, webSearch: !!checked },
                                }))
                              }
                            />
                          </div>
                          <div className="border-t" />
                          <div className="flex items-start justify-between py-3 gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium">Enable all workspace knowledge</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Let the agent use all shared integrations, files, and other assets in this workspace
                              </p>
                            </div>
                            <Switch
                              checked={config.capabilities.useAllWorkspaceContent}
                              onCheckedChange={(checked) => {
                                setConfig((prev) => ({
                                  ...prev,
                                  capabilities: { ...prev.capabilities, useAllWorkspaceContent: !!checked },
                                }));
                                if (checked) {
                                  setKnowledgeSearchQuery("");
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                </div>

                {/* Conversation Starters Section */}
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-foreground">Conversation starters</label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      By default, starters are generated from skills. Add custom ones below.
                    </p>
                  </div>
                    {/* Input with inline tags */}
                      <div className="border rounded-md min-h-9 px-3 py-1.5 flex items-center gap-1 flex-wrap">
                        {/* Added starters as solid badges */}
                        {config.conversationStarters.map((starter, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-md text-xs whitespace-nowrap"
                          >
                            <span>{starter}</span>
                            <button
                              onClick={() => {
                                const updated = config.conversationStarters.filter((_, i) => i !== index);
                                setConfig((prev) => ({ ...prev, conversationStarters: updated }));
                              }}
                              className="text-foreground hover:text-destructive"
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
                              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                e.preventDefault();
                                setConfig((prev) => ({
                                  ...prev,
                                  conversationStarters: [...prev.conversationStarters, e.currentTarget.value.trim()],
                                }));
                                e.currentTarget.value = "";
                              }
                            }}
                          />
                        )}
                      </div>
                </div>

                {/* Guardrails Section */}
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-foreground">Guardrails</label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Topics or requests the agent should NOT handle
                    </p>
                  </div>

                      {config.guardrails.length > 0 && (
                        <div className="space-y-2">
                          {config.guardrails.map((guardrail, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                value={guardrail}
                                onChange={(e) => {
                                  const updated = [...config.guardrails];
                                  updated[index] = e.target.value;
                                  setConfig((prev) => ({ ...prev, guardrails: updated }));
                                }}
                                placeholder="e.g., HR policy questions"
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-9 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  const updated = config.guardrails.filter((_, i) => i !== index);
                                  setConfig((prev) => ({ ...prev, guardrails: updated }));
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
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

              </div>
            </div>
          ) : (
            /* Access tab content - Postman-style sharing */
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <h2 className="text-base font-semibold">Share agent</h2>

                {/* Add people/teams search */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Add people or teams..."
                      className="pl-9"
                      value={accessSearchQuery}
                      onChange={(e) => {
                        setAccessSearchQuery(e.target.value);
                        setShowAccessDropdown(e.target.value.length > 0);
                      }}
                      onFocus={() => accessSearchQuery.length > 0 && setShowAccessDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAccessDropdown(false), 150)}
                    />
                  </div>

                  {/* Search dropdown suggestions */}
                  {showAccessDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg bg-white p-1 z-10">
                  <p className="text-xs font-medium text-muted-foreground px-3 py-2">Teams</p>
                  {[
                    { id: "it", name: "IT", color: "blue", bgClass: "bg-blue-100", textClass: "text-blue-600" },
                    { id: "hr", name: "HR", color: "emerald", bgClass: "bg-emerald-100", textClass: "text-emerald-600" },
                    { id: "finance", name: "Finance", color: "amber", bgClass: "bg-amber-100", textClass: "text-amber-600" },
                  ].filter(t => !addedAccessItems.find(a => a.id === t.id)).map(team => (
                    <button
                      key={team.id}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded-md text-left"
                      onClick={() => {
                        setAddedAccessItems(prev => [...prev, { ...team, type: "team" }]);
                        setAccessSearchQuery("");
                        setShowAccessDropdown(false);
                      }}
                    >
                      <div className={`size-8 rounded-full ${team.bgClass} flex items-center justify-center`}>
                        <Users className={`size-4 ${team.textClass}`} />
                      </div>
                      <span className="text-sm">{team.name}</span>
                    </button>
                  ))}
                  <div className="border-t my-1" />
                  <p className="text-xs font-medium text-muted-foreground px-3 py-2">People</p>
                  {[
                    { id: "jd", name: "John Doe", email: "john.doe@acme.com", initials: "JD", color: "purple", bgClass: "bg-purple-100", textClass: "text-purple-600" },
                    { id: "js", name: "Jane Smith", email: "jane.smith@acme.com", initials: "JS", color: "rose", bgClass: "bg-rose-100", textClass: "text-rose-600" },
                  ].filter(u => !addedAccessItems.find(a => a.id === u.id)).map(user => (
                    <button
                      key={user.id}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded-md text-left"
                      onClick={() => {
                        setAddedAccessItems(prev => [...prev, { ...user, type: "user" }]);
                        setAccessSearchQuery("");
                        setShowAccessDropdown(false);
                      }}
                    >
                      <div className={`size-8 rounded-full ${user.bgClass} flex items-center justify-center`}>
                        <span className={`text-xs font-medium ${user.textClass}`}>{user.initials}</span>
                      </div>
                      <div>
                        <p className="text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </button>
                  ))}
                  </div>
                  )}
                </div>

                {/* Current user (owner) */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-600">EW</span>
                    </div>
                    <span className="font-medium text-sm">Erica Wilhelmy (You)</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Owner</span>
                </div>

                {/* Added teams/users */}
                {addedAccessItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      {item.type === "team" ? (
                        <div className={`size-10 rounded-full ${item.bgClass} flex items-center justify-center`}>
                          <Users className={`size-5 ${item.textClass}`} />
                        </div>
                      ) : (
                        <div className={`size-10 rounded-full ${item.bgClass} flex items-center justify-center`}>
                          <span className={`text-sm font-medium ${item.textClass}`}>{item.initials}</span>
                        </div>
                      )}
                      {item.type === "team" ? (
                        <span className="font-medium text-sm">{item.name}</span>
                      ) : (
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.email}</p>
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                          Can view
                          <ChevronDown className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem>
                          Can edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center justify-between">
                          Can view
                          <Check className="size-4" />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setAddedAccessItems(prev => prev.filter(a => a.id !== item.id))}
                        >
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {/* General access section */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-medium text-muted-foreground">General access</h3>

                  {/* Workspace access */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                        <Landmark className="size-5 text-muted-foreground" />
                      </div>
                      <span className="font-medium text-sm">Acme workspace</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                          Can view
                          <ChevronDown className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem>
                          Can edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center justify-between">
                          Can view
                          <Check className="size-4" />
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - Preview (toggleable) */}
        {showPreview && <div className="w-[400px] flex-shrink-0 flex flex-col bg-white rounded-xl border border-border p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading text-xl">Preview</h2>
            <div className="flex items-center gap-1">
              {testMessages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    setTestMessages([]);
                    setTestInput("");
                  }}
                >
                  <RotateCcw className="size-3" />
                  Reset
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setShowPreview(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Debug trace panel - hidden for preview, only used in test page */}
          {false && (
            <div className="border-b bg-muted/30 max-h-[200px] overflow-y-auto">
              {debugTrace.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                  className={cn(
                    "w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors",
                    expandedStep === step.id && "bg-muted/50"
                  )}
                >
                  {step.status === "success" ? (
                    <CheckCircle2 className="size-4 text-emerald-600 flex-shrink-0" />
                  ) : step.status === "error" ? (
                    <XCircle className="size-4 text-red-600 flex-shrink-0" />
                  ) : step.status === "running" ? (
                    <Loader2 className="size-4 text-blue-600 flex-shrink-0 animate-spin" />
                  ) : (
                    <div className="size-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{step.label}</span>
                      {step.duration && <span className="text-[10px] text-muted-foreground/60">{step.duration}ms</span>}
                    </div>
                    <p className="text-sm truncate">{step.description}</p>
                  </div>
                  <ChevronRight className={cn(
                    "size-4 text-muted-foreground/50 flex-shrink-0 transition-transform",
                    expandedStep === step.id && "rotate-90"
                  )} />
                </button>
              ))}
            </div>
          )}
          {/* Chat content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {testMessages.length === 0 ? (
                /* Preview state - shows agent card as you build */
                <div className="flex-1 flex flex-col justify-center">
                  {/* Agent icon and name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "size-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      ICON_COLORS.find(c => c.id === config.iconColorId)?.bg || "bg-slate-800"
                    )}>
                      {(() => {
                        const iconData = AVAILABLE_ICONS.find(i => i.id === config.iconId);
                        const colorData = ICON_COLORS.find(c => c.id === config.iconColorId);
                        const IconComponent = iconData?.icon || Bot;
                        return <IconComponent className={cn("size-6", colorData?.text || "text-white")} />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium truncate">{config.name || "Untitled Agent"}</h3>
                      {config.agentType && (
                        <span className="text-xs text-muted-foreground">
                          {AGENT_TYPE_INFO[config.agentType].shortLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {config.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {config.description}
                    </p>
                  )}

                  {/* Conversation starters */}
                  {(() => {
                    const customStarters = config.conversationStarters.filter(s => s.trim());
                    const autoStarters: string[] = [];
                    config.workflows.forEach((skillName) => {
                      const skill = AVAILABLE_SKILLS.find(s => s.name === skillName);
                      if (skill?.starters) {
                        autoStarters.push(...skill.starters);
                      }
                    });
                    const displayStarters = customStarters.length > 0 ? customStarters : autoStarters;

                    if (displayStarters.length === 0) return null;

                    return (
                      <div className="space-y-2 mb-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Try asking
                        </p>
                        <div className="space-y-1.5">
                          {displayStarters.slice(0, 4).map((starter, index) => (
                            <button
                              key={index}
                              onClick={() => handleTestStarterClick(starter)}
                              className="w-full text-left px-3 py-2 text-sm border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-colors truncate cursor-pointer"
                            >
                              {starter}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Status indicator when nothing configured */}
                  {!config.description && !config.conversationStarters.some(s => s.trim()) && config.workflows.length === 0 && (
                    <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg text-sm text-muted-foreground mt-4">
                      <Clock className="size-4" />
                      <span>Configure your agent to see preview</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Chat messages */
                <>
                  {testMessages.map((message) => (
                    <div key={message.id} className={cn(
                      "flex gap-3",
                      message.role === "user" && "justify-end"
                    )}>
                      {message.role === "assistant" ? (
                        <>
                          <div className={cn(
                            "size-7 rounded-full flex items-center justify-center flex-shrink-0",
                            ICON_COLORS.find(c => c.id === config.iconColorId)?.bg || "bg-slate-800"
                          )}>
                            {(() => {
                              const iconData = AVAILABLE_ICONS.find(i => i.id === config.iconId);
                              const colorData = ICON_COLORS.find(c => c.id === config.iconColorId);
                              const IconComponent = iconData?.icon || Bot;
                              return <IconComponent className={cn("size-4", colorData?.text || "text-white")} />;
                            })()}
                          </div>
                          <div className="flex-1 max-w-[85%]">
                            <p className="text-sm whitespace-pre-wrap">
                              {renderMessageContent(message.content)}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%]">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTestTyping && (
                    <div className="flex gap-3">
                      <div className={cn(
                        "size-7 rounded-full flex items-center justify-center flex-shrink-0",
                        ICON_COLORS.find(c => c.id === config.iconColorId)?.bg || "bg-slate-800"
                      )}>
                        {(() => {
                          const iconData = AVAILABLE_ICONS.find(i => i.id === config.iconId);
                          const colorData = ICON_COLORS.find(c => c.id === config.iconColorId);
                          const IconComponent = iconData?.icon || Bot;
                          return <IconComponent className={cn("size-4", colorData?.text || "text-white")} />;
                        })()}
                      </div>
                      <div className="flex gap-1 items-center py-2">
                        <span className="size-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                        <span className="size-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <span className="size-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                    </div>
                  )}
                  <div ref={testMessagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="relative">
                <Textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={handleTestKeyDown}
                  placeholder="Ask anything..."
                  className="min-h-[48px] max-h-[100px] pr-12 resize-none rounded-lg text-sm"
                  disabled={isTestTyping}
                />
                <Button
                  size="icon"
                  onClick={handleTestSendMessage}
                  disabled={!testInput.trim() || isTestTyping}
                  aria-label="Send message"
                  className="absolute bottom-2 right-2 size-7 rounded-md"
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>}
      </div>

      {/* Change Agent Type Modal */}
      {showChangeTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowChangeTypeModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Change Agent Type</h2>
              <button
                onClick={() => setShowChangeTypeModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Select a new agent type. This will affect available configuration options.
            </p>

            <div className="space-y-2">
              {(["answer", "knowledge", "workflow"] as const).map((type) => {
                const typeInfo = AGENT_TYPE_INFO[type];
                return (
                  <label
                    key={type}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      pendingAgentType === type
                        ? "border-primary ring-1 ring-primary bg-white"
                        : "border-muted bg-white hover:border-muted-foreground/30"
                    )}
                  >
                    <input
                      type="radio"
                      name="change-agent-type"
                      checked={pendingAgentType === type}
                      onChange={() => setPendingAgentType(type)}
                      className="mt-1.5"
                    />
                    {/* Icon box */}
                    <div className={cn(
                      "size-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      typeInfo.iconBg
                    )}>
                      {type === "answer" && <MessageSquare className={cn("size-5", typeInfo.iconColor)} />}
                      {type === "knowledge" && <BookOpen className={cn("size-5", typeInfo.iconColor)} />}
                      {type === "workflow" && <Workflow className={cn("size-5", typeInfo.iconColor)} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{typeInfo.label}</span>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {typeInfo.shortDesc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Show what will change */}
            {pendingAgentType && pendingAgentType !== config.agentType && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800 mb-2">What will change:</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  {pendingAgentType === "workflow" && config.knowledgeSources.length > 0 && (
                    <li>• Knowledge sources will be removed ({config.knowledgeSources.length} sources)</li>
                  )}
                  {pendingAgentType === "knowledge" && config.workflows.length > 0 && (
                    <li>• Actions/workflows will be removed ({config.workflows.length} workflow)</li>
                  )}
                  {config.agentType === "workflow" && pendingAgentType !== "workflow" && (
                    <li>• Workflow configuration will be cleared</li>
                  )}
                  {config.agentType === "knowledge" && pendingAgentType !== "knowledge" && (
                    <li>• Knowledge-only settings will be adjusted</li>
                  )}
                  <li>• Agent behavior and capabilities will change</li>
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowChangeTypeModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (pendingAgentType && pendingAgentType !== config.agentType) {
                    if (isEditing) {
                      // Show double confirm for existing agents
                      setShowChangeTypeModal(false);
                      setShowConfirmTypeChangeModal(true);
                    } else {
                      // Direct change for new agents
                      setConfig((prev) => ({
                        ...prev,
                        agentType: pendingAgentType,
                        // Clear knowledge sources if switching to workflow
                        knowledgeSources: pendingAgentType === "workflow" ? [] : prev.knowledgeSources,
                        // Clear workflows if switching to knowledge
                        workflows: pendingAgentType === "knowledge" ? [] : prev.workflows,
                      }));
                      setShowChangeTypeModal(false);
                    }
                  }
                }}
                disabled={!pendingAgentType || pendingAgentType === config.agentType}
              >
                {isEditing ? "Continue" : "Confirm Change"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Double Confirm Type Change Modal (for existing agents) */}
      {showConfirmTypeChangeModal && pendingAgentType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConfirmTypeChangeModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="size-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium">Confirm Type Change</h2>
                <p className="text-sm text-muted-foreground">This action affects a saved agent</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current type:</span>
                <Badge variant="secondary" className="gap-1">
                  {config.agentType === "answer" && <MessageSquare className="size-3" />}
                  {config.agentType === "knowledge" && <FileText className="size-3" />}
                  {config.agentType === "workflow" && <Workflow className="size-3" />}
                  {config.agentType && AGENT_TYPE_INFO[config.agentType].shortLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-center">
                <ArrowLeft className="size-4 text-muted-foreground rotate-180" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New type:</span>
                <Badge variant="default" className="gap-1">
                  {pendingAgentType === "answer" && <MessageSquare className="size-3" />}
                  {pendingAgentType === "knowledge" && <FileText className="size-3" />}
                  {pendingAgentType === "workflow" && <Workflow className="size-3" />}
                  {AGENT_TYPE_INFO[pendingAgentType].shortLabel}
                </Badge>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-800 mb-1">Warning</p>
              <p className="text-sm text-red-700">
                Changing the agent type for <strong>{config.name}</strong> will modify how this agent works.
                Users who interact with this agent may experience different behavior.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmTypeChangeModal(false);
                  setShowChangeTypeModal(true);
                }}
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    agentType: pendingAgentType,
                    // Clear knowledge sources if switching to workflow
                    knowledgeSources: pendingAgentType === "workflow" ? [] : prev.knowledgeSources,
                    // Clear workflows if switching to knowledge
                    workflows: pendingAgentType === "knowledge" ? [] : prev.workflows,
                  }));
                  setShowConfirmTypeChangeModal(false);
                  setPendingAgentType(null);
                }}
              >
                Confirm Change
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowPublishModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-8 space-y-6">
            {/* Close button */}
            <button
              onClick={() => setShowPublishModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            {/* Centered icon and title */}
            <div className="flex flex-col items-center text-center pt-2">
              <div className={cn(
                "size-20 rounded-2xl flex items-center justify-center mb-4",
                ICON_COLORS.find((c) => c.id === config.iconColorId)?.bg || "bg-slate-800"
              )}>
                {(() => {
                  const IconComponent = AVAILABLE_ICONS.find((i) => i.id === config.iconId)?.icon || Squirrel;
                  const colorClass = ICON_COLORS.find((c) => c.id === config.iconColorId)?.text || "text-white";
                  return <IconComponent className={cn("size-10", colorClass)} />;
                })()}
              </div>
              <h2 className="text-xl font-semibold mb-1">Ready to publish?</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                <span className="font-medium text-foreground">{config.name}</span> will be available for users to interact with.
              </p>
            </div>

            {/* Summary stats */}
            <div className="bg-muted/40 rounded-xl p-4 space-y-3">
              {config.workflows.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Skills</span>
                  <span className="font-medium">{config.workflows.length} configured</span>
                </div>
              )}
              {config.knowledgeSources.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Knowledge Sources</span>
                  <span className="font-medium">{config.knowledgeSources.length} connected</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Conversation Starters</span>
                <span className="font-medium">
                  {config.conversationStarters.filter(s => s.trim()).length} configured
                </span>
              </div>
              {config.guardrails.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Guardrails</span>
                  <span className="font-medium">{config.guardrails.length} set</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowPublishModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmPublish} className="flex-1">
                <Check className="size-4 mr-1.5" />
                Publish
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish Confirmation Modal */}
      {showUnpublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowUnpublishModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-8 space-y-6">
            {/* Close button */}
            <button
              onClick={() => setShowUnpublishModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            {/* Centered icon and title */}
            <div className="flex flex-col items-center text-center pt-2">
              <div className={cn(
                "size-20 rounded-2xl flex items-center justify-center mb-4 bg-amber-100"
              )}>
                <Clock className="size-10 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold mb-1">Unpublish this agent?</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                <span className="font-medium text-foreground">{config.name}</span> will no longer be available to users. You can republish it anytime.
              </p>
            </div>

            {/* Warning info */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <p className="text-sm text-amber-800 font-medium">What happens when you unpublish:</p>
              <ul className="text-sm text-amber-700 space-y-1.5 ml-4 list-disc">
                <li>Users will no longer be able to access this agent</li>
                <li>Existing conversations will be preserved</li>
                <li>All configuration and settings will be saved</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowUnpublishModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  console.log("Unpublishing agent:", config.name);
                  setShowUnpublishModal(false);
                  // Navigate back to agents page
                  navigate("/agents");
                }}
                className="flex-1"
              >
                Unpublish
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Changes Modal with Diff */}
      {showPublishChangesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowPublishChangesModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
            {/* Close button */}
            <button
              onClick={() => setShowPublishChangesModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            {/* Header */}
            <div>
              <h2 className="text-lg font-semibold">Publish changes</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Review the changes before publishing updates to <span className="font-medium text-foreground">{config.name}</span>
              </p>
            </div>

            {/* Changes list */}
            <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
              {configChanges.map((change, index) => (
                <div key={index} className="px-4 py-3 flex items-start gap-3">
                  <div className={cn(
                    "size-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    change.type === "added" ? "bg-emerald-100" : change.type === "removed" ? "bg-red-100" : "bg-blue-100"
                  )}>
                    {change.type === "added" ? (
                      <Plus className="size-3.5 text-emerald-600" />
                    ) : change.type === "removed" ? (
                      <X className="size-3.5 text-red-600" />
                    ) : (
                      <ArrowLeft className="size-3.5 text-blue-600 rotate-180" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{change.label}</p>
                    {change.type === "changed" ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {change.from !== "(modified)" && change.from !== "(changed)" ? (
                          <><span className="line-through">{change.from}</span> → {change.to}</>
                        ) : (
                          "Content modified"
                        )}
                      </p>
                    ) : change.type === "added" ? (
                      <p className="text-xs text-emerald-600 mt-0.5">{change.to}</p>
                    ) : (
                      <p className="text-xs text-red-600 mt-0.5 line-through">{change.from}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {configChanges.filter(c => c.type === "added").length > 0 && (
                  <span className="text-emerald-600 font-medium mr-3">
                    +{configChanges.filter(c => c.type === "added").length} added
                  </span>
                )}
                {configChanges.filter(c => c.type === "removed").length > 0 && (
                  <span className="text-red-600 font-medium mr-3">
                    -{configChanges.filter(c => c.type === "removed").length} removed
                  </span>
                )}
                {configChanges.filter(c => c.type === "changed").length > 0 && (
                  <span className="text-blue-600 font-medium">
                    {configChanges.filter(c => c.type === "changed").length} modified
                  </span>
                )}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPublishChangesModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  console.log("Publishing changes:", configChanges);
                  setShowPublishChangesModal(false);
                  toast.success("Changes published", {
                    description: `${configChanges.length} changes applied to ${config.name}`
                  });
                }}
                className="flex-1"
              >
                Publish changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Expanded Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowInstructionsModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Close button */}
            <button
              onClick={() => setShowInstructionsModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
            >
              <X className="size-5" />
            </button>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-6">
              <Textarea
                value={config.instructions}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, instructions: e.target.value }))
                }
                placeholder="Describe instructions..."
                className="min-h-[400px] resize-none text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              />
            </div>

            {/* Footer bar */}
            <div className="bg-muted/50 border-t px-6 py-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Update instructions as needed...
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-sm">Default personality</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="size-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="font-medium mb-1">Adds the following guidelines to the system prompt:</p>
                      <ul className="list-disc pl-4 text-xs space-y-0.5">
                        <li>Do not restate your identity unless explicitly requested by the user.</li>
                        <li>Provide helpful, accurate, and informative responses to user questions.</li>
                        <li>Ask clarifying questions when needed to better understand the task or provide more relevant information.</li>
                        <li>Maintain a polite, professional, and respectful tone at all times.</li>
                        <li>Keep responses clear, concise, and focused on the user's intent.</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Workflow Modal (v3/Jarvis) */}
      {showCreateWorkflowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowCreateWorkflowModal(false);
              setNewWorkflowDescription("");
            }}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-medium">New workflow</h2>
              <button
                onClick={() => {
                  setShowCreateWorkflowModal(false);
                  setNewWorkflowDescription("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Chat input area */}
              <div className="bg-muted/30 rounded-xl p-8 min-h-[200px] flex flex-col items-center justify-center">
                <h3 className="text-xl font-medium mb-4">Describe your workflow</h3>
                <div className="w-full max-w-lg relative">
                  <Textarea
                    value={newWorkflowDescription}
                    onChange={(e) => setNewWorkflowDescription(e.target.value)}
                    placeholder="Every time I receive an email, review the content and..."
                    className="min-h-[80px] resize-none pr-12"
                  />
                  <button
                    className="absolute right-3 bottom-3 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
                    disabled={!newWorkflowDescription.trim()}
                    onClick={() => {
                      toast.info("Workflow creation with AI coming in v3");
                    }}
                  >
                    <Send className="size-4" />
                  </button>
                </div>
                <button
                  className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  onClick={() => {
                    toast.info("Start from scratch coming in v3");
                  }}
                >
                  Start from scratch
                  <ChevronDown className="size-4 -rotate-90" />
                </button>
              </div>

              {/* Example templates */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Start from an example</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="flex items-start gap-3 p-4 border rounded-xl text-left hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setNewWorkflowDescription("Before each meeting, prepare a concise pre-read with key context from past meetings");
                    }}
                  >
                    <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="size-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Prepare me for meetings</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Before each meeting, you'll receive a concise pre-read with key context from past meeting...
                      </p>
                    </div>
                  </button>
                  <button
                    className="flex items-start gap-3 p-4 border rounded-xl text-left hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setNewWorkflowDescription("Automatically look at incoming emails and determine if they should be replied to");
                    }}
                  >
                    <div className="size-10 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="size-5 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Draft email replies</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Automatically looks at incoming emails and determines if they should be replied to. If so, ...
                      </p>
                    </div>
                  </button>
                  <button
                    className="flex items-start gap-3 p-4 border rounded-xl text-left hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setNewWorkflowDescription("Reset a user's password in Active Directory after verifying their identity");
                    }}
                  >
                    <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Key className="size-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Password reset</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Verify user identity and reset their password in Active Directory...
                      </p>
                    </div>
                  </button>
                  <button
                    className="flex items-start gap-3 p-4 border rounded-xl text-left hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setNewWorkflowDescription("Provision new hire accounts across all required systems");
                    }}
                  >
                    <div className="size-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Users className="size-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">New hire onboarding</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Provision accounts and access for new employees across all required systems...
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Skill Modal */}
      {showAddSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowAddSkillModal(false);
              setSkillSearchQuery("");
              setSelectedSkills([]);
            }}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-medium">Add skills</h2>
              <button
                onClick={() => {
                  setShowAddSkillModal(false);
                  setSkillSearchQuery("");
                  setSelectedSkills([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search skills..."
                  className="pl-9"
                  value={skillSearchQuery}
                  onChange={(e) => setSkillSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Skills list */}
            <div className="flex-1 overflow-y-auto p-2">
              {AVAILABLE_SKILLS
                .filter((skill) => {
                  if (!skillSearchQuery) return true;
                  const query = skillSearchQuery.toLowerCase();
                  return (
                    skill.name.toLowerCase().includes(query) ||
                    skill.author.toLowerCase().includes(query)
                  );
                })
                .map((skill) => {
                  const isAlreadyAdded = config.workflows.includes(skill.name);
                  const isLinkedToOther = skill.linkedAgent !== null;
                  const isSelected = selectedSkills.includes(skill.name);
                  const SkillIcon = skill.icon;
                  const isDisabled = isAlreadyAdded || isLinkedToOther;

                  return (
                    <div
                      key={skill.id}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                        isDisabled ? "opacity-60" : "hover:bg-muted/50 cursor-pointer",
                        isSelected && !isDisabled && "bg-primary/5 border border-primary/20"
                      )}
                      onClick={() => {
                        if (isDisabled) return;
                        setSelectedSkills((prev) =>
                          prev.includes(skill.name)
                            ? prev.filter((s) => s !== skill.name)
                            : [...prev, skill.name]
                        );
                      }}
                    >
                      <div className={cn(
                        "size-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isSelected && !isDisabled ? "bg-primary/10" : "bg-purple-50"
                      )}>
                        <SkillIcon className={cn(
                          "size-5",
                          isSelected && !isDisabled ? "text-primary" : "text-purple-600"
                        )} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{skill.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isLinkedToOther ? (
                            <>Used by <span className="font-medium">{skill.linkedAgent}</span></>
                          ) : (
                            skill.author
                          )}
                        </p>
                      </div>
                      {isAlreadyAdded ? (
                        <span className="text-xs text-muted-foreground">Added</span>
                      ) : isLinkedToOther ? (
                        <span className="text-xs text-primary cursor-pointer">Duplicate in Actions</span>
                      ) : (
                        <Switch
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setSelectedSkills((prev) =>
                              checked
                                ? [...prev, skill.name]
                                : prev.filter((s) => s !== skill.name)
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                  );
                })}
              {AVAILABLE_SKILLS.filter((skill) => {
                if (!skillSearchQuery) return true;
                const query = skillSearchQuery.toLowerCase();
                return (
                  skill.name.toLowerCase().includes(query) ||
                  skill.author.toLowerCase().includes(query)
                );
              }).length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No skills found matching "{skillSearchQuery}"
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedSkills.length} skill{selectedSkills.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddSkillModal(false);
                    setSkillSearchQuery("");
                    setSelectedSkills([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={selectedSkills.length === 0}
                  onClick={() => {
                    // Collect starters from selected skills
                    const newStarters: string[] = [];
                    selectedSkills.forEach((skillName) => {
                      const skill = AVAILABLE_SKILLS.find(s => s.name === skillName);
                      if (skill?.starters) {
                        // Add first starter from each skill (up to limit)
                        skill.starters.slice(0, 1).forEach((starter) => {
                          if (!newStarters.includes(starter)) {
                            newStarters.push(starter);
                          }
                        });
                      }
                    });

                    setConfig((prev) => {
                      // Filter out starters already in config
                      const existingStarters = prev.conversationStarters;
                      const startersToAdd = newStarters.filter(s => !existingStarters.includes(s));
                      // Keep within 6 limit
                      const availableSlots = 6 - existingStarters.length;
                      const finalNewStarters = startersToAdd.slice(0, availableSlots);

                      return {
                        ...prev,
                        workflows: [...prev.workflows, ...selectedSkills],
                        conversationStarters: [...existingStarters, ...finalNewStarters],
                      };
                    });
                    setShowAddSkillModal(false);
                    setSkillSearchQuery("");
                    setSelectedSkills([]);
                  }}
                >
                  Add {selectedSkills.length > 0 ? `(${selectedSkills.length})` : ""}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unlink Workflow Confirmation Modal */}
      {showUnlinkConfirm && workflowToUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowUnlinkConfirm(false);
              setWorkflowToUnlink(null);
            }}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Unlink Workflow</h2>
              <button
                onClick={() => {
                  setShowUnlinkConfirm(false);
                  setWorkflowToUnlink(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>{workflowToUnlink.name}</strong> is currently linked to <strong>{workflowToUnlink.linkedAgentName}</strong>.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  Unlinking this workflow will remove it from the other agent. Each workflow can only be connected to one agent at a time.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUnlinkConfirm(false);
                  setWorkflowToUnlink(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Add the workflow to this agent
                  setConfig((prev) => ({
                    ...prev,
                    workflows: [...prev.workflows, workflowToUnlink.name],
                  }));
                  setShowUnlinkConfirm(false);
                  setWorkflowToUnlink(null);
                  toast.success(`${workflowToUnlink.name} unlinked from ${workflowToUnlink.linkedAgentName} and added to this agent`);
                }}
              >
                Unlink & Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
