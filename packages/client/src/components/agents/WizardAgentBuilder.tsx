/**
 * WizardAgentBuilder - Form-based agent builder with live preview
 *
 * Alternative to the chat-driven builder. Features:
 * - Left panel: Structured form fields
 * - Right panel: Live agent preview
 * - Bottom: Chat assistant for help
 * - Tabs: Plan | Build | Validate
 */

import { useState, useEffect, useRef } from "react";
// Removed useNavigate - test chat is now inline
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Send,
  ChevronDown,
  HelpCircle,
  Clock,
  Squirrel,
  Bot,
  Headphones,
  ShieldCheck,
  Key,
  BookOpen,
  Plus,
  Trash2,
  X,
  CheckCircle,
  FileText,
  KeyRound,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateActionModal } from "./CreateActionModal";

// Icon options for the agent
const ICON_OPTIONS = [
  { id: "squirrel", icon: Squirrel, label: "Squirrel" },
  { id: "bot", icon: Bot, label: "Bot" },
  { id: "headphones", icon: Headphones, label: "Support" },
  { id: "shield-check", icon: ShieldCheck, label: "Security" },
  { id: "key", icon: Key, label: "Access" },
  { id: "book-open", icon: BookOpen, label: "Knowledge" },
];

const ICON_COLORS = [
  { id: "slate", bg: "bg-slate-800", text: "text-white" },
  { id: "blue", bg: "bg-blue-600", text: "text-white" },
  { id: "emerald", bg: "bg-emerald-600", text: "text-white" },
  { id: "purple", bg: "bg-purple-600", text: "text-white" },
  { id: "orange", bg: "bg-orange-500", text: "text-white" },
];

interface AgentConfig {
  name: string;
  description: string;
  instructions: string;
  role: string;
  completionCriteria: string;
  iconId: string;
  iconColorId: string;
  agentType: "answer" | "knowledge" | "workflow" | null;
  conversationStarters: string[];
  knowledgeSources: string[];
  actions: string[];
  guardrails: string[];
  interactionStyle: string;
  contextSwitching: boolean;
  ticketCreation: boolean;
}

interface WizardAgentBuilderProps {
  initialConfig?: Partial<AgentConfig>;
  onBack: () => void;
  onPublish: (config: AgentConfig) => void;
  isEditing?: boolean;
}

type WizardStep = "setup" | "knowledge" | "actions" | "publish";

export function WizardAgentBuilder({
  initialConfig,
  onBack,
  onPublish,
  isEditing = false,
}: WizardAgentBuilderProps) {
  const [activeStep, setActiveStep] = useState<WizardStep>("setup");
  const [config, setConfig] = useState<AgentConfig>({
    name: initialConfig?.name || "Untitled Agent",
    description: initialConfig?.description || "",
    instructions: initialConfig?.instructions || "",
    role: initialConfig?.role || "",
    completionCriteria: initialConfig?.completionCriteria || "",
    iconId: initialConfig?.iconId || "squirrel",
    iconColorId: initialConfig?.iconColorId || "slate",
    agentType: initialConfig?.agentType || null,
    conversationStarters: initialConfig?.conversationStarters || [
      "What can you help me with?",
      "How do I get started?",
      "",
      "",
    ],
    knowledgeSources: initialConfig?.knowledgeSources || [],
    actions: initialConfig?.actions || [],
    guardrails: initialConfig?.guardrails || [""],
    interactionStyle: initialConfig?.interactionStyle || "Conversational and friendly",
    contextSwitching: initialConfig?.contextSwitching ?? true,
    ticketCreation: initialConfig?.ticketCreation ?? false,
  });

  const [showIconPicker, setShowIconPicker] = useState(false);

  // Test chat state
  const [testMessages, setTestMessages] = useState<{ id: string; role: "user" | "assistant"; content: string }[]>([]);
  const [testInput, setTestInput] = useState("");
  const [isTestLoading, setIsTestLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (activeStep === "publish") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [testMessages, activeStep]);

  // Determine if steps are complete
  const isSetupComplete = Boolean(config.name && config.description);
  const steps: WizardStep[] = ["setup", "knowledge", "actions", "publish"];
  const stepIndex = steps.indexOf(activeStep);

  const goToNextStep = () => {
    if (stepIndex < steps.length - 1) {
      setActiveStep(steps[stepIndex + 1]);
    }
  };

  const goToPrevStep = () => {
    if (stepIndex > 0) {
      setActiveStep(steps[stepIndex - 1]);
    } else {
      onBack();
    }
  };

  // Get current icon component
  const CurrentIcon = ICON_OPTIONS.find((i) => i.id === config.iconId)?.icon || Squirrel;
  const currentColor = ICON_COLORS.find((c) => c.id === config.iconColorId) || ICON_COLORS[0];

  // Handle test chat send
  const handleTestSend = async (message?: string) => {
    const content = message || testInput.trim();
    if (!content || isTestLoading) return;

    const userMsg = { id: Date.now().toString(), role: "user" as const, content };
    setTestMessages((prev) => [...prev, userMsg]);
    setTestInput("");
    setIsTestLoading(true);

    // Simulate response
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));

    const response = generateTestResponse(content, config);
    const assistantMsg = { id: (Date.now() + 1).toString(), role: "assistant" as const, content: response };
    setTestMessages((prev) => [...prev, assistantMsg]);
    setIsTestLoading(false);
  };

  const handleResetChat = () => {
    setTestMessages([]);
    setTestInput("");
  };

  return (
    <div className="h-full flex flex-col bg-muted/40">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <span className="font-medium">{config.name || "Untitled Agent"}</span>
          <Badge variant="secondary" className="text-xs">
            {isEditing ? "Published" : "Draft"}
          </Badge>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <HelpCircle className="size-4" />
            Help
          </Button>
        </div>
      </div>

      {/* Main content - cards on neutral background */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left panel - Form with steps (rounded card) */}
        <div className="flex-1 flex flex-col bg-white rounded-xl overflow-hidden">
          {/* Step Navigation inside left panel */}
          <div className="py-4 px-8">
            <div className="flex items-center gap-3">
              {[
                { id: "setup", label: "Setup", num: 1 },
                { id: "knowledge", label: "Knowledge", num: 2 },
                { id: "actions", label: "Actions", num: 3 },
                { id: "publish", label: "Publish", num: 4 },
              ].map((step) => {
                const isActive = activeStep === step.id;
                const isPast = stepIndex > steps.indexOf(step.id as WizardStep);

                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id as WizardStep)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      isActive
                        ? "bg-blue-50 text-foreground border border-blue-100"
                        : isPast
                        ? "bg-white border border-slate-200 text-foreground"
                        : "bg-white border border-slate-200 text-foreground/80"
                    )}
                  >
                    <span className={cn(
                      "size-5 rounded-full flex items-center justify-center text-[10px] font-semibold",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isPast
                        ? "bg-primary/20 text-primary"
                        : "bg-slate-200 text-slate-500"
                    )}>
                      {isPast ? <CheckCircle className="size-3" /> : step.num}
                    </span>
                    <span>{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[720px] px-8 py-8">
              {activeStep === "setup" && (
                <SetupStep
                  config={config}
                  setConfig={setConfig}
                  showIconPicker={showIconPicker}
                  setShowIconPicker={setShowIconPicker}
                  CurrentIcon={CurrentIcon}
                  currentColor={currentColor}
                />
              )}
              {activeStep === "knowledge" && (
                <KnowledgeStep
                  config={config}
                  setConfig={setConfig}
                />
              )}
              {activeStep === "actions" && (
                <ActionsStep
                  config={config}
                  setConfig={setConfig}
                />
              )}
              {activeStep === "publish" && (
                <PublishStep
                  config={config}
                  setConfig={setConfig}
                  onGoToStep={setActiveStep}
                />
              )}

              {/* Actions below content */}
              <div className="flex items-center justify-between mt-8">
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={goToPrevStep}>
                    {activeStep === "setup" ? "Cancel" : "Back"}
                  </Button>
                  <SaveIndicator />
                </div>
                <div className="flex items-center gap-3">
                  {/* Skip button for optional steps */}
                  {(activeStep === "knowledge" || activeStep === "actions") && (
                    <Button variant="ghost" onClick={goToNextStep}>
                      Skip
                    </Button>
                  )}
                  {activeStep === "publish" ? (
                    <Button onClick={() => onPublish(config)} disabled={!isSetupComplete} className="gap-2">
                      <CheckCircle className="size-4" />
                      Publish Agent
                    </Button>
                  ) : (
                    <Button onClick={goToNextStep}>
                      Continue
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel - Preview (static) or Test Chat (on Publish) */}
        <div className="w-[400px] flex flex-col bg-white rounded-xl">
          {activeStep === "publish" ? (
            <>
              {/* Test Chat Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-medium">Test your agent</h2>
                {testMessages.length > 0 && (
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8" onClick={handleResetChat}>
                    <RotateCcw className="size-3.5" />
                    Reset
                  </Button>
                )}
              </div>

              {/* Test Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {testMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className={cn("size-14 rounded-xl flex items-center justify-center mb-3", currentColor.bg)}>
                      <CurrentIcon className={cn("size-7", currentColor.text)} />
                    </div>
                    <h3 className="font-medium mb-1">{config.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-[280px]">
                      {config.description || "Test your agent before publishing"}
                    </p>
                    {config.conversationStarters.some(s => s.trim()) && (
                      <div className="space-y-2 w-full">
                        <p className="text-xs text-muted-foreground">Try asking:</p>
                        {config.conversationStarters
                          .filter(s => s.trim())
                          .slice(0, 3)
                          .map((starter, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleTestSend(starter)}
                              className="w-full text-left px-3 py-2 text-sm border rounded-lg hover:bg-muted/50 transition-colors truncate"
                            >
                              {starter}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
                      >
                        {msg.role === "assistant" && (
                          <div className={cn("size-7 rounded-lg flex items-center justify-center flex-shrink-0", currentColor.bg)}>
                            <CurrentIcon className={cn("size-3.5", currentColor.text)} />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] px-3 py-2 rounded-2xl text-sm",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isTestLoading && (
                      <div className="flex gap-2">
                        <div className={cn("size-7 rounded-lg flex items-center justify-center flex-shrink-0", currentColor.bg)}>
                          <CurrentIcon className={cn("size-3.5", currentColor.text)} />
                        </div>
                        <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-md">
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Test Chat Input */}
              <div className="p-4 border-t">
                <div className="relative">
                  <Input
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleTestSend();
                      }
                    }}
                    placeholder="Type a message..."
                    className="pr-10"
                    disabled={isTestLoading}
                  />
                  <Button
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                    onClick={() => handleTestSend()}
                    disabled={!testInput.trim() || isTestLoading}
                  >
                    <Send className="size-3.5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Static Preview Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-medium">Preview</h2>
                {/* Show Test button when enough config is done */}
                {isSetupComplete && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setActiveStep("publish")}
                  >
                    <Send className="size-3.5" />
                    Test
                  </Button>
                )}
              </div>

              {/* Static Preview Content */}
              <div className="flex-1 p-4 flex flex-col overflow-y-auto">
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("size-12 rounded-xl flex items-center justify-center flex-shrink-0", currentColor.bg)}>
                      <CurrentIcon className={cn("size-6", currentColor.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium truncate">{config.name || "Untitled Agent"}</h3>
                    </div>
                  </div>

                  {config.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{config.description}</p>
                  )}

                  {config.conversationStarters.some(s => s.trim()) && (
                    <div className="space-y-2 mb-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Try asking</p>
                      <div className="space-y-1.5">
                        {config.conversationStarters.filter(s => s.trim()).slice(0, 4).map((starter, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setActiveStep("publish");
                              // Slight delay to let state update, then send the starter
                              setTimeout(() => handleTestSend(starter), 100);
                            }}
                            disabled={!isSetupComplete}
                            className={cn(
                              "w-full text-left px-3 py-2 text-sm border rounded-lg truncate transition-colors",
                              isSetupComplete
                                ? "hover:bg-muted/50 hover:border-primary/30 cursor-pointer"
                                : "text-muted-foreground cursor-default"
                            )}
                          >
                            {starter}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!config.description && !config.conversationStarters.some(s => s.trim()) && (
                    <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg text-sm text-muted-foreground mt-4">
                      <Clock className="size-4" />
                      <span>Configure your agent to see preview</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto">
                  {isSetupComplete ? (
                    <Button
                      className="w-full gap-2"
                      onClick={() => setActiveStep("publish")}
                    >
                      <Send className="size-4" />
                      Test Agent
                    </Button>
                  ) : (
                    <>
                      <div className="relative">
                        <Textarea
                          placeholder="Ask anything..."
                          className="min-h-[60px] pr-12 resize-none rounded-xl border-muted-foreground/20 text-sm opacity-50"
                          disabled
                        />
                        <Button size="icon" disabled className="absolute bottom-2 right-2 size-7 rounded-lg">
                          <Send className="size-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Add name and description to test
                      </p>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Save indicator component
function SaveIndicator() {
  const [isSaving, setIsSaving] = useState(false);

  // Simulate periodic saves
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSaving(true);
      setTimeout(() => setIsSaving(false), 800);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full text-xs text-muted-foreground">
      <span className={cn(
        "size-2 rounded-full transition-colors",
        isSaving ? "bg-gray-400" : "bg-green-500"
      )} />
      <span>{isSaving ? "Saving..." : "Saved"}</span>
    </div>
  );
}

// Interaction style options
const INTERACTION_STYLE_OPTIONS = [
  "Conversational and friendly",
  "Professional",
  "Concise",
  "Comical",
  "Like Spock",
  "Shakespearean",
];

// Setup Step - Name, Description, Instructions, Conversation Starters, Behavior
function SetupStep({
  config,
  setConfig,
  showIconPicker,
  setShowIconPicker,
  CurrentIcon,
  currentColor,
}: {
  config: AgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<AgentConfig>>;
  showIconPicker: boolean;
  setShowIconPicker: (v: boolean) => void;
  CurrentIcon: React.ElementType;
  currentColor: { id: string; bg: string; text: string };
}) {
  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Name</label>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={config.name === "Untitled Agent" ? "" : config.name}
            onChange={(e) => setConfig((prev) => ({ ...prev, name: e.target.value || "Untitled Agent" }))}
            placeholder="e.g., HR Assistant, IT HelpDesk"
            className="flex-1"
          />
          {/* Icon picker button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowIconPicker(!showIconPicker)}
              className={cn(
                "size-10 rounded-lg flex items-center justify-center transition-colors border",
                currentColor.bg
              )}
              aria-label="Change agent icon"
            >
              <CurrentIcon className={cn("size-5", currentColor.text)} />
            </button>
            <ChevronDown className="size-3 text-muted-foreground absolute -bottom-0.5 -right-0.5" />

            {/* Icon Picker Dropdown */}
            {showIconPicker && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border shadow-lg p-4 z-50 w-80">
                {/* Color selection */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Color</p>
                  <div className="flex gap-2">
                    {ICON_COLORS.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => setConfig((prev) => ({ ...prev, iconColorId: color.id }))}
                        className={cn(
                          "size-10 rounded-full transition-all",
                          color.bg,
                          config.iconColorId === color.id
                            ? "ring-2 ring-offset-2 ring-primary"
                            : "hover:scale-110"
                        )}
                      />
                    ))}
                  </div>
                </div>
                {/* Icon selection */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Icon</p>
                  <div className="grid grid-cols-6 gap-2">
                    {ICON_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setConfig((prev) => ({ ...prev, iconId: opt.id }));
                            setShowIconPicker(false);
                          }}
                          className={cn(
                            "size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors",
                            config.iconId === opt.id && "bg-muted ring-1 ring-primary"
                          )}
                        >
                          <Icon className="size-4" />
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

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Description</label>
        <p className="text-xs text-muted-foreground">
          A brief summary of what this agent does
        </p>
        <Textarea
          value={config.description}
          onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what this agent does..."
          className="min-h-[76px] resize-none"
        />
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Instructions</label>
        <p className="text-xs text-muted-foreground">
          Describe the agent's role, what it should do, and when its job is complete.
        </p>
        <Textarea
          value={config.instructions}
          onChange={(e) => setConfig((prev) => ({ ...prev, instructions: e.target.value }))}
          placeholder={`You are a virtual agent designed to help users with [specific task].

Your responsibilities:
• Help users understand and complete [process/workflow]
• Guide them through required fields and steps
• Answer questions about [topic/domain]

Your job is complete when:
• The user has successfully submitted their request
• All required information has been collected
• The user confirms they have what they need`}
          className="min-h-[200px] resize-none"
        />
      </div>

      {/* Conversation Starters */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-foreground">Conversation starters</label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Suggested prompts shown to users when starting a conversation
          </p>
        </div>

        {config.conversationStarters.filter(s => s.trim()).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {config.conversationStarters.filter(s => s.trim()).map((starter, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-muted rounded-full text-sm"
              >
                <span>{starter}</span>
                <button
                  onClick={() => {
                    const updated = config.conversationStarters.filter((_, i) => i !== index);
                    setConfig((prev) => ({ ...prev, conversationStarters: updated }));
                  }}
                  className="size-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted-foreground/10 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <Input
            placeholder="Add a conversation starter..."
            className="pr-16"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                e.preventDefault();
                if (config.conversationStarters.filter(s => s.trim()).length < 6) {
                  setConfig((prev) => ({
                    ...prev,
                    conversationStarters: [...prev.conversationStarters.filter(s => s.trim()), e.currentTarget.value.trim()],
                  }));
                  e.currentTarget.value = "";
                }
              }
            }}
            disabled={config.conversationStarters.filter(s => s.trim()).length >= 6}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {config.conversationStarters.filter(s => s.trim()).length}/6
          </span>
        </div>
      </div>

      {/* Interaction Style */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Interaction style</label>
        <div className="flex flex-wrap gap-2">
          {INTERACTION_STYLE_OPTIONS.map((style) => (
            <button
              key={style}
              onClick={() => setConfig((prev) => ({ ...prev, interactionStyle: style }))}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm transition-colors border",
                config.interactionStyle === style
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white hover:bg-muted border-input"
              )}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Behavior Toggles */}
      <div className="border rounded-xl divide-y">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <span className="text-sm font-medium">Context Switching</span>
            <p className="text-xs text-muted-foreground">Allow the agent to handle topic changes</p>
          </div>
          <Switch
            checked={config.contextSwitching}
            onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, contextSwitching: checked }))}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <span className="text-sm font-medium">Ticket Creation</span>
            <p className="text-xs text-muted-foreground">Allow the agent to create support tickets</p>
          </div>
          <Switch
            checked={config.ticketCreation}
            onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, ticketCreation: checked }))}
          />
        </div>
      </div>
    </div>
  );
}

// Available knowledge sources (mock data)
const AVAILABLE_KNOWLEDGE_SOURCES = [
  { id: "confluence", name: "Confluence", type: "connection", description: "Company wiki" },
  { id: "sharepoint", name: "SharePoint", type: "connection", description: "Document management" },
  { id: "gdrive", name: "Google Drive", type: "connection", description: "Cloud storage" },
  { id: "handbook", name: "Employee Handbook 2024.pdf", type: "upload", description: "HR policies" },
  { id: "it-policies", name: "IT Policies.docx", type: "upload", description: "IT guidelines" },
  { id: "benefits", name: "Benefits Guide.pdf", type: "upload", description: "Benefits info" },
];

// Mock current user ID (would come from auth context in real app)
const CURRENT_USER_ID = "user-1";

// Available workflows (mock data) - some linked to other agents
const AVAILABLE_WORKFLOWS = [
  { id: "password-reset", name: "Password Reset", description: "Reset user passwords in AD", category: "IT", linkedAgentId: "3", linkedAgentName: "Password Reset Bot", linkedAgentOwnerId: "user-2", linkedAgentOwnerName: "John Smith", linkedAgentOwnerEmail: "john.smith@company.com" },
  { id: "access-request", name: "Access Request", description: "Request system access", category: "IT", linkedAgentId: null, linkedAgentName: null, linkedAgentOwnerId: null, linkedAgentOwnerName: null, linkedAgentOwnerEmail: null },
  { id: "ticket-create", name: "Create Ticket", description: "Create support ticket", category: "Support", linkedAgentId: "5", linkedAgentName: "Support Agent", linkedAgentOwnerId: "user-1", linkedAgentOwnerName: "You", linkedAgentOwnerEmail: null },
  { id: "vpn-access", name: "VPN Access", description: "Request VPN access", category: "IT", linkedAgentId: null, linkedAgentName: null, linkedAgentOwnerId: null, linkedAgentOwnerName: null, linkedAgentOwnerEmail: null },
  { id: "software-request", name: "Software Request", description: "Request software installation", category: "IT", linkedAgentId: null, linkedAgentName: null, linkedAgentOwnerId: null, linkedAgentOwnerName: null, linkedAgentOwnerEmail: null },
];

// Knowledge Step - Dedicated step for knowledge sources
function KnowledgeStep({
  config,
  setConfig,
}: {
  config: AgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<AgentConfig>>;
}) {
  const [useAllKnowledge, setUseAllKnowledge] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSources = AVAILABLE_KNOWLEDGE_SOURCES.filter((source) => {
    const query = searchQuery.toLowerCase();
    return (
      source.name.toLowerCase().includes(query) ||
      source.description.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Add Knowledge Sources</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Give your agent access to documents, wikis, and other content it can reference when answering questions.
        </p>
      </div>

      {/* Search input with dropdown */}
      <div className="relative">
        <div className="relative">
          {searchQuery && !useAllKnowledge ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
            >
              <X className="size-4" />
            </button>
          ) : (
            <svg
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 size-4",
                useAllKnowledge ? "text-muted-foreground/50" : "text-muted-foreground"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          )}
          <Input
            placeholder="Search knowledge sources..."
            className={cn("pl-9", useAllKnowledge && "opacity-50 cursor-not-allowed")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={useAllKnowledge}
          />
        </div>

        {/* Dropdown results */}
        {searchQuery.trim() && !useAllKnowledge && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg max-h-[250px] overflow-y-auto z-20">
            {filteredSources.map((source) => {
              const isAdded = config.knowledgeSources.includes(source.name);
              return (
                <button
                  key={source.id}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                    isAdded && "opacity-50"
                  )}
                  onClick={() => {
                    if (!isAdded) {
                      setConfig((prev) => ({
                        ...prev,
                        knowledgeSources: [...prev.knowledgeSources, source.name],
                      }));
                    }
                    setSearchQuery("");
                  }}
                  disabled={isAdded}
                >
                  <div className={cn(
                    "size-9 rounded-lg flex items-center justify-center flex-shrink-0",
                    source.type === "upload" ? "bg-blue-50" : "bg-purple-50"
                  )}>
                    <FileText className={cn(
                      "size-4",
                      source.type === "upload" ? "text-blue-500" : "text-purple-500"
                    )} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{source.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {source.type === "upload" ? "Upload" : "Connection"}
                    </p>
                  </div>
                  {isAdded && <CheckCircle className="size-4 text-primary" />}
                </button>
              );
            })}
            {filteredSources.length === 0 && (
              <div className="px-4 py-6 text-center text-muted-foreground">
                <p className="text-sm">No matching sources found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty state hint - below search */}
      {!useAllKnowledge && config.knowledgeSources.length === 0 && (
        <div className="border border-dashed rounded-xl p-6 text-center">
          <BookOpen className="size-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No knowledge sources added</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Knowledge helps your agent answer questions more accurately
          </p>
        </div>
      )}

      {/* Added sources list */}
      {!useAllKnowledge && config.knowledgeSources.length > 0 && (
        <div className="border rounded-xl divide-y">
          {config.knowledgeSources.map((sourceName, index) => {
            const sourceData = AVAILABLE_KNOWLEDGE_SOURCES.find((s) => s.name === sourceName);
            return (
              <div key={index} className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "size-8 rounded flex items-center justify-center",
                    sourceData?.type === "connection" ? "bg-purple-50" : "bg-blue-50"
                  )}>
                    <FileText className={cn(
                      "size-4",
                      sourceData?.type === "connection" ? "text-purple-500" : "text-blue-500"
                    )} />
                  </div>
                  <span className="text-sm">{sourceName}</span>
                </div>
                <button
                  className="size-7 flex items-center justify-center text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setConfig((prev) => ({
                      ...prev,
                      knowledgeSources: prev.knowledgeSources.filter((_, i) => i !== index),
                    }));
                  }}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Toggle options */}
      <div className="border rounded-xl divide-y">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">Add all workspace content</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Let the agent use all shared integrations and files.
            </p>
          </div>
          <Switch
            checked={useAllKnowledge}
            onCheckedChange={(checked) => {
              setUseAllKnowledge(checked);
              if (checked) setSearchQuery("");
            }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">Search the web for information</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Let the agent search websites for answers.
            </p>
          </div>
          <Switch checked={false} />
        </div>
      </div>

    </div>
  );
}

// Actions Step - Dedicated step for workflows/actions
function ActionsStep({
  config,
  setConfig,
}: {
  config: AgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<AgentConfig>>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [workflowToUnlink, setWorkflowToUnlink] = useState<{ id: string; name: string; linkedAgentName: string } | null>(null);

  const filteredWorkflows = AVAILABLE_WORKFLOWS.filter((workflow) => {
    const query = searchQuery.toLowerCase();
    return (
      workflow.name.toLowerCase().includes(query) ||
      workflow.description.toLowerCase().includes(query) ||
      workflow.category.toLowerCase().includes(query)
    );
  });

  const handleCreateAction = (action: { name: string; description: string }) => {
    setConfig((prev) => ({
      ...prev,
      actions: [...prev.actions, action.name],
    }));
  };

  const handleSelectWorkflow = (workflow: typeof AVAILABLE_WORKFLOWS[0]) => {
    const isAdded = config.actions.includes(workflow.name);
    if (isAdded) {
      setSearchQuery("");
      return;
    }

    const isLinkedElsewhere = workflow.linkedAgentId && workflow.linkedAgentName;
    const isOwnedByCurrentUser = workflow.linkedAgentOwnerId === CURRENT_USER_ID;
    const isBlockedByOwner = isLinkedElsewhere && !isOwnedByCurrentUser;

    // Blocked - owned by someone else
    if (isBlockedByOwner) {
      return; // Button is disabled, this shouldn't be reached
    }

    // Check if linked to another agent (that we own)
    if (isLinkedElsewhere && isOwnedByCurrentUser) {
      setWorkflowToUnlink({
        id: workflow.id,
        name: workflow.name,
        linkedAgentName: workflow.linkedAgentName!,
      });
      setShowUnlinkModal(true);
      setSearchQuery("");
    } else {
      setConfig((prev) => ({
        ...prev,
        actions: [...prev.actions, workflow.name],
      }));
      setSearchQuery("");
    }
  };

  const handleConfirmUnlink = () => {
    if (workflowToUnlink) {
      setConfig((prev) => ({
        ...prev,
        actions: [...prev.actions, workflowToUnlink.name],
      }));
      setShowUnlinkModal(false);
      setWorkflowToUnlink(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Add Actions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Give your agent the ability to execute workflows and take actions on behalf of users.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 flex-shrink-0"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="size-3.5" />
          Create new action
        </Button>
      </div>

      <CreateActionModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreateAction={handleCreateAction}
      />

      {/* Unlink Confirmation Modal */}
      {showUnlinkModal && workflowToUnlink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Unlink Workflow</h3>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>{workflowToUnlink.name}</strong> is currently linked to{" "}
                <strong>{workflowToUnlink.linkedAgentName}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Unlinking this workflow will remove it from the other agent. Each workflow can only be connected to one agent at a time.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 bg-muted/30 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUnlinkModal(false);
                  setWorkflowToUnlink(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmUnlink}>
                Unlink & Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search input with dropdown */}
      <div className="relative">
        <div className="relative">
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
            >
              <X className="size-4" />
            </button>
          ) : (
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          )}
          <Input
            placeholder="Search actions..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Dropdown results */}
        {searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg max-h-[250px] overflow-y-auto z-20">
            {filteredWorkflows.map((workflow) => {
              const isAdded = config.actions.includes(workflow.name);
              const isLinkedElsewhere = !!(workflow.linkedAgentId && workflow.linkedAgentName);
              const isOwnedByCurrentUser = workflow.linkedAgentOwnerId === CURRENT_USER_ID;
              const canUnlink = isLinkedElsewhere && isOwnedByCurrentUser;
              const isBlockedByOwner = isLinkedElsewhere && !isOwnedByCurrentUser;
              return (
                <button
                  key={workflow.id}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    isAdded && "opacity-50",
                    isBlockedByOwner ? "opacity-60 cursor-not-allowed" : "hover:bg-muted/50"
                  )}
                  onClick={() => handleSelectWorkflow(workflow)}
                  disabled={isAdded || isBlockedByOwner}
                >
                  <div className="size-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="size-4 text-purple-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{workflow.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {workflow.category}
                      {isBlockedByOwner && (
                        <span className="text-red-500 ml-2">• Linked to {workflow.linkedAgentName}</span>
                      )}
                      {canUnlink && (
                        <span className="text-amber-600 ml-2">• Linked to {workflow.linkedAgentName} (your agent)</span>
                      )}
                    </p>
                  </div>
                  {isAdded && <CheckCircle className="size-4 text-primary" />}
                  {isBlockedByOwner && workflow.linkedAgentOwnerEmail && (
                    <a
                      href={`mailto:${workflow.linkedAgentOwnerEmail}?subject=Request to use ${workflow.name} workflow&body=Hi ${workflow.linkedAgentOwnerName},%0D%0A%0D%0AI would like to use the "${workflow.name}" workflow which is currently linked to your agent "${workflow.linkedAgentName}".%0D%0A%0D%0ACould you please unlink it so I can use it for my agent?%0D%0A%0D%0AThank you!`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex-shrink-0"
                    >
                      Contact
                    </a>
                  )}
                </button>
              );
            })}
            {filteredWorkflows.length === 0 && (
              <div className="px-4 py-6 text-center text-muted-foreground">
                <p className="text-sm">No matching actions found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty state hint - below search */}
      {config.actions.length === 0 && (
        <div className="border border-dashed rounded-xl p-6 text-center">
          <KeyRound className="size-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No actions added</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Actions let your agent perform tasks like resetting passwords or creating tickets
          </p>
        </div>
      )}

      {/* Added actions list */}
      {config.actions.length > 0 && (
        <div className="border rounded-xl divide-y">
          {config.actions.map((actionName, index) => (
            <div key={index} className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded bg-purple-50 flex items-center justify-center">
                  <KeyRound className="size-4 text-purple-500" />
                </div>
                <span className="text-sm">{actionName}</span>
              </div>
              <button
                className="size-7 flex items-center justify-center text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    actions: prev.actions.filter((_, i) => i !== index),
                  }));
                }}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Publish Step - Summary with validation warnings
function PublishStep({
  config,
  setConfig,
  onGoToStep,
}: {
  config: AgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<AgentConfig>>;
  onGoToStep: (step: WizardStep) => void;
}) {
  // Validation checks
  const warnings: { message: string; step: WizardStep; action: string }[] = [];

  if (!config.description) {
    warnings.push({ message: "No description provided", step: "setup", action: "Add description" });
  }
  if (!config.instructions) {
    warnings.push({ message: "No instructions configured", step: "setup", action: "Add instructions" });
  }
  if (config.knowledgeSources.length === 0) {
    warnings.push({ message: "No knowledge sources added", step: "knowledge", action: "Add knowledge" });
  }
  if (config.actions.length === 0) {
    warnings.push({ message: "No actions configured", step: "actions", action: "Add actions" });
  }
  if (!config.conversationStarters.some(s => s.trim())) {
    warnings.push({ message: "No conversation starters", step: "setup", action: "Add starters" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Publish</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review your agent configuration before publishing.
        </p>
      </div>

      {/* Validation warnings */}
      {warnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="size-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-amber-600 text-xs font-bold">!</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 mb-2">
                {warnings.length} item{warnings.length > 1 ? "s" : ""} to review
              </p>
              <ul className="space-y-1.5">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-amber-700">{warning.message}</span>
                    {warning.step !== "publish" && (
                      <button
                        onClick={() => onGoToStep(warning.step)}
                        className="text-amber-800 font-medium hover:underline"
                      >
                        {warning.action} →
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Summary card */}
      <div className="border rounded-xl divide-y">
        <div className="px-4 py-3">
          <h3 className="font-medium text-sm text-muted-foreground mb-3">Summary</h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{config.name}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Description</dt>
              <dd className={config.description ? "text-foreground" : "text-muted-foreground/50"}>
                {config.description ? "Configured" : "Not set"}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Instructions</dt>
              <dd className={config.instructions ? "text-foreground" : "text-muted-foreground/50"}>
                {config.instructions ? "Configured" : "Not set"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="px-4 py-3">
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Knowledge Sources</dt>
              <dd className={config.knowledgeSources.length > 0 ? "font-medium" : "text-muted-foreground/50"}>
                {config.knowledgeSources.length || "None"}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Actions</dt>
              <dd className={config.actions.length > 0 ? "font-medium" : "text-muted-foreground/50"}>
                {config.actions.length || "None"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="px-4 py-3">
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Interaction Style</dt>
              <dd>{config.interactionStyle}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Context Switching</dt>
              <dd>{config.contextSwitching ? "Enabled" : "Disabled"}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Ticket Creation</dt>
              <dd>{config.ticketCreation ? "Enabled" : "Disabled"}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Guardrails */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-foreground">Guardrails</label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Topics the agent should NOT handle
            </p>
          </div>
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
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>

        {config.guardrails.filter(g => g.trim()).length > 0 && (
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
                  placeholder="e.g., salary information, legal advice"
                  className="flex-1"
                />
                <button
                  className="size-8 flex items-center justify-center text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setConfig((prev) => ({
                      ...prev,
                      guardrails: prev.guardrails.filter((_, i) => i !== index),
                    }));
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Generate simulated test response based on agent config
function generateTestResponse(input: string, config: AgentConfig): string {
  const lowerInput = input.toLowerCase();
  const style = config.interactionStyle.toLowerCase();

  // Check guardrails
  for (const guardrail of config.guardrails) {
    if (guardrail && lowerInput.includes(guardrail.toLowerCase())) {
      return `I'm sorry, but I'm not able to help with questions about ${guardrail}. Is there something else I can assist you with?`;
    }
  }

  // Style-based response modifiers
  let prefix = "";
  let suffix = "";

  if (style.includes("spock")) {
    prefix = "Fascinating. ";
    suffix = " This is the logical conclusion.";
  } else if (style.includes("shakespeare")) {
    prefix = "Hark! ";
    suffix = " Pray tell if thou requirest further assistance.";
  } else if (style.includes("comical")) {
    prefix = "Alright, let me put on my thinking cap! ";
    suffix = " Hope that helps! 😄";
  } else if (style.includes("professional")) {
    suffix = " Please let me know if you have any questions.";
  } else if (style.includes("concise")) {
    // Keep it short
  } else {
    prefix = "Great question! ";
    suffix = " Is there anything else you'd like to know?";
  }

  // Generate content based on query type
  let content = "";

  if (lowerInput.includes("help") || lowerInput.includes("what can you")) {
    content = `I'm ${config.name}. ${config.description || "I'm here to assist you."}`;
  } else if (lowerInput.includes("password") || lowerInput.includes("reset")) {
    if (config.actions.some(a => a.toLowerCase().includes("password"))) {
      content = "I can help you reset your password. Please provide your email or username to proceed.";
    } else {
      content = "I don't have access to password reset functionality. Please contact IT support.";
    }
  } else if (lowerInput.includes("ticket") || lowerInput.includes("support")) {
    if (config.ticketCreation) {
      content = "I can create a support ticket for you. Please describe your issue.";
    } else {
      content = "I'm not configured to create tickets, but I can try to help answer your question directly.";
    }
  } else if (lowerInput.includes("get started") || lowerInput.includes("how do i")) {
    content = `To get started, just describe what you need help with. ${config.instructions ? "I'm here to help with your requests." : "I'll do my best to assist you."}`;
  } else {
    content = `Based on your question about "${input.slice(0, 30)}${input.length > 30 ? "..." : ""}", I can help with that. ${config.knowledgeSources.length > 0 ? `I have access to ${config.knowledgeSources.length} knowledge source(s) to provide accurate information.` : "Let me know more details about what you need."}`;
  }

  return `${prefix}${content}${suffix}`;
}
