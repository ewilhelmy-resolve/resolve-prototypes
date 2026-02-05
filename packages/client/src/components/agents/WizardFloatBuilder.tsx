/**
 * WizardFloatBuilder - Form-based agent builder with floating AI chat
 *
 * Similar to WizardAgentBuilder but with:
 * - Right panel: Preview only (no AI Assistant tab)
 * - Left panel: Floating mini-chat at bottom (Typeform/Clay style)
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Play,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface WizardFloatBuilderProps {
  initialConfig?: Partial<AgentConfig>;
  onBack: () => void;
  onPublish: (config: AgentConfig) => void;
  isEditing?: boolean;
}

type WizardStep = "setup" | "knowledge" | "actions" | "build";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function WizardFloatBuilder({
  initialConfig,
  onBack,
  onPublish,
  isEditing = false,
}: WizardFloatBuilderProps) {
  const navigate = useNavigate();
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
    conversationStarters: initialConfig?.conversationStarters || ["", "", "", ""],
    knowledgeSources: initialConfig?.knowledgeSources || [],
    actions: initialConfig?.actions || [],
    guardrails: initialConfig?.guardrails || [""],
    interactionStyle: initialConfig?.interactionStyle || "Conversational and friendly",
    contextSwitching: initialConfig?.contextSwitching ?? true,
    ticketCreation: initialConfig?.ticketCreation ?? false,
  });

  const [showIconPicker, setShowIconPicker] = useState(false);
  const [previewChatInput, setPreviewChatInput] = useState("");
  const [previewMessages, setPreviewMessages] = useState<ChatMessage[]>([]);

  // Floating chat state
  const [floatChatInput, setFloatChatInput] = useState("");
  const [floatChatMessages, setFloatChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I can help you build your agent. Tell me what kind of agent you want to create, and I'll help configure it.",
    },
  ]);
  const floatChatRef = useRef<HTMLDivElement>(null);
  const floatInputRef = useRef<HTMLInputElement>(null);

  // Pending changes from AI (for confirmation)
  const [pendingChanges, setPendingChanges] = useState<Partial<AgentConfig> | null>(null);

  // Determine if steps are complete
  const isSetupComplete = Boolean(config.name && config.description);
  const steps: WizardStep[] = ["setup", "knowledge", "actions"];
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

  // Auto-scroll float chat to bottom
  useEffect(() => {
    if (floatChatRef.current) {
      floatChatRef.current.scrollTop = floatChatRef.current.scrollHeight;
    }
  }, [floatChatMessages]);

  const handleFloatChatSubmit = () => {
    if (!floatChatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: floatChatInput,
    };
    setFloatChatMessages((prev) => [...prev, userMessage]);
    const input = floatChatInput.toLowerCase();
    setFloatChatInput("");

    // Simulate AI understanding and proposing changes
    setTimeout(() => {
      const { response, changes } = getAIResponseWithChanges(input, config, activeStep);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
      };
      setFloatChatMessages((prev) => [...prev, assistantMessage]);

      // If AI proposes changes, set them as pending
      if (changes) {
        setPendingChanges(changes);
      }
    }, 800);
  };

  // Apply pending changes
  const applyPendingChanges = () => {
    if (pendingChanges) {
      setConfig((prev) => ({ ...prev, ...pendingChanges }));
      setPendingChanges(null);

      // Add confirmation message
      const confirmMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Done! I've updated the form with those changes. Feel free to adjust anything or ask me for more help.",
      };
      setFloatChatMessages((prev) => [...prev, confirmMessage]);
    }
  };

  // Reject pending changes
  const rejectPendingChanges = () => {
    setPendingChanges(null);

    const rejectMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "assistant",
      content: "No problem! Let me know if you'd like me to try a different approach.",
    };
    setFloatChatMessages((prev) => [...prev, rejectMessage]);
  };

  const handlePreviewChatSubmit = () => {
    if (!previewChatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: previewChatInput,
    };
    setPreviewMessages((prev) => [...prev, userMessage]);
    setPreviewChatInput("");

    // Simulate agent response based on config
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAgentPreviewResponse(previewChatInput, config),
      };
      setPreviewMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  };

  return (
    <div className="h-screen flex flex-col bg-muted/40">
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
            How agent builder works
          </Button>
          <Button
            onClick={() => onPublish(config)}
            disabled={!isSetupComplete}
            className="bg-primary"
          >
            Publish
          </Button>
        </div>
      </div>

      {/* Main content - cards on neutral background */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left panel - Form with steps (rounded card) */}
        <div className="flex-1 flex flex-col bg-white rounded-xl overflow-hidden relative">
          {/* Step Navigation inside left panel */}
          <div className="py-4 px-6">
            <div className="flex items-center gap-3">
              {[
                { id: "setup", label: "Configure", num: 1 },
                { id: "knowledge", label: "Test", num: 2 },
                { id: "actions", label: "Enable", num: 3 },
              ].map((step) => {
                const isActive = activeStep === step.id;
                const isPast = stepIndex > ["setup", "knowledge", "actions"].indexOf(step.id);
                const isClickable = step.id === "setup" || isSetupComplete;

                return (
                  <button
                    key={step.id}
                    onClick={() => isClickable && setActiveStep(step.id as WizardStep)}
                    disabled={!isClickable}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      isActive
                        ? "bg-blue-50 text-foreground border border-blue-100"
                        : isPast
                        ? "bg-white border border-slate-200 text-foreground"
                        : "bg-white border border-slate-200 text-muted-foreground",
                      !isClickable && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <span>{step.num}.</span>
                    <span>{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form content */}
          <div className="flex-1 overflow-y-auto py-6 pb-24">
            <div className="max-w-[520px] mx-auto px-6">
              {/* Configure step - all configuration in one */}
              {activeStep === "setup" && (
                <ConfigureStep
                  config={config}
                  setConfig={setConfig}
                  showIconPicker={showIconPicker}
                  setShowIconPicker={setShowIconPicker}
                  CurrentIcon={CurrentIcon}
                  currentColor={currentColor}
                />
              )}
              {/* Test step */}
              {activeStep === "knowledge" && (
                <TestStep
                  config={config}
                  currentColor={currentColor}
                  CurrentIcon={CurrentIcon}
                  onTest={() => {
                    navigate("/agents/test", { state: { config } });
                  }}
                />
              )}
              {/* Enable step */}
              {activeStep === "actions" && (
                <EnableStep
                  config={config}
                  onPublish={() => onPublish(config)}
                />
              )}
            </div>
          </div>

          {/* Static Footer inside card */}
          <div className="px-6 py-4 border-t bg-white">
            <div className="max-w-[520px] mx-auto flex items-center justify-end">
              {/* Navigation buttons */}
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={goToPrevStep}>
                  {activeStep === "setup" ? "Cancel" : "Back"}
                </Button>
                {activeStep === "actions" ? (
                  <Button onClick={() => onPublish(config)} className="gap-2">
                    <CheckCircle className="size-4" />
                    Enable Agent
                  </Button>
                ) : (
                  <Button onClick={goToNextStep} disabled={activeStep === "setup" && !isSetupComplete}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Floating AI Chat - inside left panel, centered, contextual to current step */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 w-96">
            {/* Chat messages (shown above input when there are messages) */}
            {floatChatMessages.length > 1 && (
              <div className="bg-white rounded-2xl shadow-lg border mb-3 max-h-64 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <span className="text-xs font-medium">AI Assistant</span>
                  </div>
                  <button
                    onClick={() => setFloatChatMessages([floatChatMessages[0]])}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                <div ref={floatChatRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                  {floatChatMessages.slice(1).map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] px-3 py-2 rounded-xl text-sm",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Floating input bar */}
            <div className="bg-white rounded-full shadow-lg border flex items-center gap-2 pl-4 pr-2 py-2">
              <Sparkles className="size-4 text-primary flex-shrink-0" />
              <input
                ref={floatInputRef}
                type="text"
                value={floatChatInput}
                onChange={(e) => setFloatChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleFloatChatSubmit();
                  }
                }}
                placeholder={getStepPlaceholder(activeStep)}
                className="flex-1 text-sm bg-transparent border-0 outline-none placeholder:text-muted-foreground/60"
              />
              <Button
                size="icon"
                className="size-8 rounded-full"
                onClick={handleFloatChatSubmit}
                disabled={!floatChatInput.trim()}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>

        </div>

        {/* Right panel - Preview only (rounded card) */}
        <div className="w-[400px] flex flex-col bg-white rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Preview</h3>
          </div>

          {/* Preview Content */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            {/* Agent name and description */}
            <div className="mb-6">
              <div className={cn("size-10 rounded-lg flex items-center justify-center mb-3", currentColor.bg)}>
                <CurrentIcon className={cn("size-5", currentColor.text)} />
              </div>
              <h3 className="font-semibold text-xl mb-1">{config.name || "Untitled Agent"}</h3>
              {config.description && (
                <p className="text-sm text-muted-foreground">{config.description}</p>
              )}
            </div>

            {/* Preview chat area */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-3">
              {previewMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "p-3 rounded-lg max-w-[80%]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
            </div>

            {/* Preview chat input */}
            <div className="relative mb-3">
              <div className="border rounded-lg bg-white p-3">
                <Input
                  value={previewChatInput}
                  onChange={(e) => setPreviewChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handlePreviewChatSubmit();
                    }
                  }}
                  placeholder="Ask anything..."
                  className="border-0 p-0 h-auto focus-visible:ring-0"
                />
                <div className="flex items-center justify-between mt-2">
                  <button className="p-1 hover:bg-muted rounded">
                    <Plus className="size-4 text-muted-foreground" />
                  </button>
                  <Button
                    size="icon"
                    className="size-7"
                    onClick={handlePreviewChatSubmit}
                    disabled={!previewChatInput.trim()}
                  >
                    <ArrowLeft className="size-4 rotate-[135deg]" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Conversation starters as chips */}
            {config.conversationStarters.filter(s => s.trim()).length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs text-muted-foreground">Conversation starters</span>
                  <HelpCircle className="size-3 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.conversationStarters.filter(s => s.trim()).map((starter, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPreviewChatInput(starter);
                      }}
                      className="px-3 py-1.5 text-sm border rounded-full hover:bg-muted transition-colors"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Info banner */}
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <Clock className="size-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-blue-700">
                Changes to your agent will be updated here
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for AI Changes */}
      {pendingChanges && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="size-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Apply AI Suggestions?</h3>
                <p className="text-sm text-muted-foreground">Review the proposed changes below</p>
              </div>
            </div>

            {/* Changes preview */}
            <div className="px-6 py-4 bg-muted/30 border-y">
              <div className="space-y-3">
                {pendingChanges.name && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Name</p>
                    <p className="text-sm">{pendingChanges.name}</p>
                  </div>
                )}
                {pendingChanges.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm">{pendingChanges.description}</p>
                  </div>
                )}
                {pendingChanges.instructions && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Instructions</p>
                    <p className="text-sm line-clamp-3">{pendingChanges.instructions}</p>
                  </div>
                )}
                {pendingChanges.actions && pendingChanges.actions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Actions</p>
                    <div className="flex flex-wrap gap-1">
                      {pendingChanges.actions.map((action) => (
                        <span key={action} className="px-2 py-1 bg-white border rounded text-xs">
                          {action.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {pendingChanges.interactionStyle && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Style</p>
                    <p className="text-sm">{pendingChanges.interactionStyle}</p>
                  </div>
                )}
                {pendingChanges.conversationStarters && pendingChanges.conversationStarters.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Conversation Starters</p>
                    <div className="flex flex-wrap gap-1">
                      {pendingChanges.conversationStarters.filter(s => s).map((starter, idx) => (
                        <span key={idx} className="px-2 py-1 bg-white border rounded text-xs">
                          {starter}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4">
              <Button variant="outline" onClick={rejectPendingChanges}>
                No Thanks
              </Button>
              <Button onClick={applyPendingChanges} className="gap-2">
                <CheckCircle className="size-4" />
                Apply Changes
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Configure Step - Name, Description, Instructions (all config in one)
function ConfigureStep({
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
      {/* Name of agent */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Name of agent</label>
        <div className="flex items-center gap-3">
          <Input
            type="text"
            value={config.name === "Untitled Agent" ? "" : config.name}
            onChange={(e) => setConfig((prev) => ({ ...prev, name: e.target.value || "Untitled Agent" }))}
            placeholder=""
            className="flex-1"
          />
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowIconPicker(!showIconPicker)}
              className={cn(
                "size-[38px] rounded-lg flex items-center justify-center transition-colors",
                currentColor.bg
              )}
            >
              <CurrentIcon className={cn("size-5", currentColor.text)} />
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setShowIconPicker(!showIconPicker)}
            >
              <ChevronDown className="size-4" />
            </Button>

            {showIconPicker && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg border shadow-lg p-4 z-10 w-72">
                <p className="text-xs font-medium text-muted-foreground mb-3">Color</p>
                <div className="flex gap-2 mb-4">
                  {ICON_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setConfig((prev) => ({ ...prev, iconColorId: color.id }))}
                      className={cn(
                        "size-8 rounded-lg transition-all",
                        color.bg,
                        config.iconColorId === color.id && "ring-2 ring-offset-2 ring-primary"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium text-muted-foreground mb-3">Icon</p>
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
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Description</label>
        <Textarea
          value={config.description}
          onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what this agent will help your team with"
          className="min-h-[76px] resize-none"
        />
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Instructions</label>
        <Textarea
          value={config.instructions}
          onChange={(e) => setConfig((prev) => ({ ...prev, instructions: e.target.value }))}
          placeholder="Define how the agent should behave, respond, and what it should avoid."
          className="min-h-[240px] resize-none"
        />
      </div>
    </div>
  );
}

// Test Step - Test the agent before enabling
function TestStep({
  config,
  currentColor,
  CurrentIcon,
  onTest,
}: {
  config: AgentConfig;
  currentColor: { id: string; bg: string; text: string };
  CurrentIcon: React.ElementType;
  onTest: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Test your agent</h2>
        <p className="text-sm text-muted-foreground">
          Try out your agent in a test conversation before enabling it for users.
        </p>
      </div>

      {/* Agent preview card */}
      <div className="p-6 border rounded-xl bg-muted/30">
        <div className="flex items-start gap-4">
          <div className={cn("size-12 rounded-xl flex items-center justify-center", currentColor.bg)}>
            <CurrentIcon className={cn("size-6", currentColor.text)} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{config.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{config.description || "No description"}</p>
          </div>
        </div>
      </div>

      {/* Test CTA */}
      <div className="p-5 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Play className="size-6 text-violet-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1">Open test conversation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              See how your agent responds to real questions before going live.
            </p>
            <Button className="gap-2" onClick={onTest}>
              <Play className="size-4" />
              Test Agent
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enable Step - Final step to enable the agent
function EnableStep({
  config,
  onPublish,
}: {
  config: AgentConfig;
  onPublish: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Enable your agent</h2>
        <p className="text-sm text-muted-foreground">
          Review your configuration and enable the agent for your team.
        </p>
      </div>

      {/* Summary */}
      <div className="p-5 border rounded-xl bg-muted/30 space-y-4">
        <h3 className="font-medium">Configuration Summary</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{config.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Description</dt>
            <dd className="font-medium text-right max-w-[60%] truncate">{config.description || "None"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Instructions</dt>
            <dd className="font-medium">{config.instructions ? "Configured" : "None"}</dd>
          </div>
        </dl>
      </div>

      {/* Enable CTA */}
      <div className="p-5 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="size-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1">Ready to go live</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your agent is configured and tested. Enable it to make it available to your team.
            </p>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={onPublish}>
              <CheckCircle className="size-4" />
              Enable Agent
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// AI response with proposed changes (Option C - confirmation pattern)
function getAIResponseWithChanges(
  input: string,
  _config: AgentConfig,
  _activeStep: string
): { response: string; changes: Partial<AgentConfig> | null } {
  const lowerInput = input.toLowerCase();

  // Password reset agent
  if (lowerInput.includes("password") && (lowerInput.includes("reset") || lowerInput.includes("agent"))) {
    return {
      response: "I can set up a Password Reset Agent for you. This agent will help users reset their passwords through ServiceNow. Here's what I'll configure:",
      changes: {
        name: "Password Reset Assistant",
        description: "Helps employees reset their passwords quickly and securely through our IT systems.",
        instructions: "You are a helpful IT support assistant specializing in password resets. Guide users through the password reset process step by step. Always verify the user's identity before proceeding. Be patient and clear in your explanations. If the user needs help with something other than passwords, politely redirect them to the appropriate resource.",
        actions: ["password_reset"],
        interactionStyle: "Professional",
      },
    };
  }

  // IT Support / Help desk agent
  if (lowerInput.includes("it support") || lowerInput.includes("help desk") || lowerInput.includes("helpdesk")) {
    return {
      response: "I can create an IT Support Agent for you. This will be a general IT help desk assistant. Here's the configuration:",
      changes: {
        name: "IT Support Assistant",
        description: "Your friendly IT help desk assistant for technical issues, access requests, and general IT questions.",
        instructions: "You are a knowledgeable and patient IT support assistant. Help users troubleshoot common technical issues, guide them through processes, and escalate complex issues when needed. Always be friendly and avoid technical jargon when possible. If you can't solve an issue, offer to create a support ticket.",
        actions: ["password_reset", "ticket_create", "account_unlock"],
        interactionStyle: "Conversational and friendly",
      },
    };
  }

  // HR agent
  if (lowerInput.includes("hr") || lowerInput.includes("human resource") || lowerInput.includes("employee")) {
    return {
      response: "I can set up an HR Assistant for you. This agent will help employees with HR-related questions. Here's the configuration:",
      changes: {
        name: "HR Assistant",
        description: "Answers questions about company policies, benefits, time off, and other HR topics.",
        instructions: "You are a helpful HR assistant with access to company policies and benefits information. Answer employee questions accurately and empathetically. For sensitive matters like complaints or personal issues, guide employees to speak with an HR representative directly. Always maintain confidentiality.",
        interactionStyle: "Conversational and friendly",
      },
    };
  }

  // Onboarding agent
  if (lowerInput.includes("onboard") || lowerInput.includes("new hire") || lowerInput.includes("new employee")) {
    return {
      response: "I can create an Onboarding Assistant for new employees. Here's what I'll set up:",
      changes: {
        name: "Onboarding Guide",
        description: "Helps new employees get started with everything they need to know about the company.",
        instructions: "You are a welcoming onboarding assistant for new employees. Help them understand company culture, find important resources, complete required tasks, and answer common questions. Be encouraging and patient - remember they're new! Guide them through their first days and weeks.",
        conversationStarters: ["What should I do on my first day?", "How do I set up my benefits?", "Where can I find the employee handbook?", "Who should I contact for IT help?"],
        interactionStyle: "Conversational and friendly",
      },
    };
  }

  // Make it more professional
  if (lowerInput.includes("professional") || lowerInput.includes("formal")) {
    return {
      response: "I can make the agent more professional in tone. Here's the change:",
      changes: {
        interactionStyle: "Professional",
      },
    };
  }

  // Make it more friendly/casual
  if (lowerInput.includes("friendly") || lowerInput.includes("casual") || lowerInput.includes("conversational")) {
    return {
      response: "I can make the agent friendlier and more conversational. Here's the change:",
      changes: {
        interactionStyle: "Conversational and friendly",
      },
    };
  }

  // Make it concise
  if (lowerInput.includes("concise") || lowerInput.includes("brief") || lowerInput.includes("short")) {
    return {
      response: "I can make the agent more concise in its responses. Here's the change:",
      changes: {
        interactionStyle: "Concise",
      },
    };
  }

  // Add ticket creation
  if (lowerInput.includes("ticket") || lowerInput.includes("support ticket")) {
    return {
      response: "I can enable ticket creation for this agent. Users will be able to create support tickets when needed.",
      changes: {
        actions: ["ticket_create"],
        ticketCreation: true,
      },
    };
  }

  // General help responses (no changes)
  if (lowerInput.includes("help") || lowerInput.includes("how")) {
    return {
      response: "I can help you build your agent! Try telling me:\n\n• \"Create a password reset agent\"\n• \"Make an IT support assistant\"\n• \"Build an HR agent\"\n• \"Make this more professional\"\n• \"Add ticket creation\"\n\nOr describe what you want your agent to do, and I'll suggest a configuration.",
      changes: null,
    };
  }

  // Default response
  return {
    response: "I'd be happy to help configure your agent. Try telling me what kind of agent you want (like \"password reset agent\" or \"HR assistant\"), or ask me to change the style (like \"make it more professional\").",
    changes: null,
  };
}

// Helper to generate preview agent responses
function getAgentPreviewResponse(input: string, config: AgentConfig): string {
  const agentName = config.name || "Agent";

  if (!config.description && !config.instructions) {
    return `Hi! I'm ${agentName}. I'm still being configured - add a description and instructions to see how I'll respond.`;
  }

  return `Based on my instructions, I would help you with: "${input}". This is a preview of how the agent will respond once published.`;
}

// Step-contextual placeholder text for floating chat
function getStepPlaceholder(step: WizardStep): string {
  switch (step) {
    case "setup":
      return "Describe your agent idea...";
    case "knowledge":
      return "Ask about testing your agent...";
    case "actions":
      return "Ready to enable?";
    default:
      return "Ask AI to help...";
  }
}
