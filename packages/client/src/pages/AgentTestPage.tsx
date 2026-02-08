/**
 * AgentTestPage - Test & Iterate mode for agents
 *
 * Features:
 * - Left panel: Editable config (inline iteration)
 * - Right panel: Chat test interface
 * - No back-to-form flow - iterate in place
 * - Publish is just confirmation
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Send,
  Loader2,
  Squirrel,
  Bot,
  Headphones,
  ShieldCheck,
  Key,
  BookOpen,
  RotateCcw,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  ClipboardList,
  LineChart,
  Briefcase,
  Users,
  Landmark,
  Truck,
  Award,
  Settings,
  AlertCircle,
  Rocket,
  GraduationCap,
  Heart,
  Zap,
  Globe,
  Lock,
  Mail,
  Phone,
  Star,
  Target,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Wrench,
  Calendar,
  Coffee,
  Database,
  Folder,
  Home,
  Layers,
  Map,
  Package,
  ShoppingCart,
  MessageSquare,
  Sparkles,
  Shield,
  Play,
  X,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Icon mapping - extended
const ICON_MAP: Record<string, React.ElementType> = {
  squirrel: Squirrel,
  bot: Bot,
  headphones: Headphones,
  "shield-check": ShieldCheck,
  key: Key,
  "book-open": BookOpen,
  "trending-up": TrendingUp,
  "clipboard-list": ClipboardList,
  "line-chart": LineChart,
  briefcase: Briefcase,
  users: Users,
  landmark: Landmark,
  truck: Truck,
  award: Award,
  settings: Settings,
  "alert-circle": AlertCircle,
  rocket: Rocket,
  "graduation-cap": GraduationCap,
  heart: Heart,
  zap: Zap,
  globe: Globe,
  lock: Lock,
  mail: Mail,
  phone: Phone,
  star: Star,
  target: Target,
  "thumbs-up": ThumbsUp,
  wrench: Wrench,
  calendar: Calendar,
  coffee: Coffee,
  database: Database,
  folder: Folder,
  home: Home,
  layers: Layers,
  map: Map,
  package: Package,
  "shopping-cart": ShoppingCart,
};

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  slate: { bg: "bg-slate-800", text: "text-white" },
  blue: { bg: "bg-blue-600", text: "text-white" },
  emerald: { bg: "bg-emerald-600", text: "text-white" },
  purple: { bg: "bg-purple-600", text: "text-white" },
  orange: { bg: "bg-orange-500", text: "text-white" },
  rose: { bg: "bg-rose-500", text: "text-white" },
};

// Mock saved agents for URL-based loading
const MOCK_SAVED_AGENTS: Record<string, AgentConfig> = {
  "1": {
    name: "HelpDesk Advisor",
    description: "Answers IT support questions",
    instructions: "Help users with IT-related questions. Be patient and thorough. Always verify the user's identity before making changes to their account.",
    role: "IT Support Specialist",
    completionCriteria: "When the user's issue is resolved or escalated",
    iconId: "headphones",
    iconColorId: "blue",
    agentType: "answer",
    conversationStarters: ["I need to reset my password", "My VPN isn't connecting", "How do I request software?"],
    knowledgeSources: ["IT Knowledge Base", "Software Catalog"],
    workflows: ["Reset password", "Unlock account", "Request system access"],
    guardrails: ["salary", "performance reviews"],
  },
  "2": {
    name: "Onboarding Compliance Checker",
    description: "Answers from compliance docs",
    instructions: "Only answer from approved compliance documents. Be accurate.",
    role: "Compliance Specialist",
    completionCriteria: "When compliance question is answered with documentation",
    iconId: "shield-check",
    iconColorId: "emerald",
    agentType: "knowledge",
    conversationStarters: ["Is my I-9 complete?", "What background checks are required?", "Where do I submit tax forms?"],
    knowledgeSources: ["Compliance Handbook", "HR Policies"],
    workflows: ["Verify I-9 forms", "Check background status", "Review tax docs"],
    guardrails: ["personal opinions", "legal advice"],
  },
  "3": {
    name: "Password Reset Bot",
    description: "Automates password resets",
    instructions: "Guide users through password reset workflow.",
    role: "Automation Assistant",
    completionCriteria: "When password is successfully reset",
    iconId: "key",
    iconColorId: "purple",
    agentType: "workflow",
    conversationStarters: ["I forgot my password", "Reset my AD password", "I'm locked out"],
    knowledgeSources: [],
    workflows: ["Password Reset"],
    guardrails: [],
  },
};

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
  workflows: string[];
  guardrails: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  feedback?: "up" | "down" | null;
  feedbackText?: string;
}

export default function AgentTestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: agentId } = useParams<{ id: string }>();

  // Try to load config from: 1) navigation state, 2) URL params
  const stateConfig = (location.state?.config || location.state?.agentConfig) as AgentConfig | undefined;
  const urlConfig = agentId ? MOCK_SAVED_AGENTS[agentId] : undefined;
  const initialConfig = stateConfig || urlConfig;

  // Editable config state
  const [config, setConfig] = useState<AgentConfig | null>(initialConfig || null);
  const [hasChanges, setHasChanges] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Panel state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["instructions", "starters"])
  );

  // Publish dialog
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle no config
  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Bot className="size-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No agent configuration found.</p>
          <Button onClick={() => navigate("/agents")}>Back to Agents</Button>
        </div>
      </div>
    );
  }

  const Icon = ICON_MAP[config.iconId] || Bot;
  const color = COLOR_MAP[config.iconColorId] || COLOR_MAP.slate;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const updateConfig = (updates: Partial<AgentConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...updates } : prev));
    setHasChanges(true);
  };

  const handleFeedback = (messageId: string, feedback: "up" | "down") => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: generateResponse(input.trim(), config),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  const handleBack = () => {
    if (agentId) {
      navigate(`/agents/${agentId}`);
    } else {
      navigate(-1);
    }
  };

  const handlePublish = () => {
    setShowPublishDialog(true);
  };

  const confirmPublish = () => {
    // Would publish the agent here
    setShowPublishDialog(false);
    navigate("/agents", { state: { published: true, agentName: config.name } });
  };

  const handleStarterClick = (starter: string) => {
    setInput(starter);
    inputRef.current?.focus();
  };

  const addStarter = () => {
    updateConfig({
      conversationStarters: [...config.conversationStarters, ""],
    });
  };

  const updateStarter = (index: number, value: string) => {
    const newStarters = [...config.conversationStarters];
    newStarters[index] = value;
    updateConfig({ conversationStarters: newStarters });
  };

  const removeStarter = (index: number) => {
    updateConfig({
      conversationStarters: config.conversationStarters.filter((_, i) => i !== index),
    });
  };

  const addGuardrail = () => {
    updateConfig({
      guardrails: [...config.guardrails, ""],
    });
  };

  const updateGuardrail = (index: number, value: string) => {
    const newGuardrails = [...config.guardrails];
    newGuardrails[index] = value;
    updateConfig({ guardrails: newGuardrails });
  };

  const removeGuardrail = (index: number) => {
    updateConfig({
      guardrails: config.guardrails.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className={cn("size-8 rounded-lg flex items-center justify-center", color.bg)}>
            <Icon className={cn("size-4", color.text)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{config.name}</span>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Test & Iterate
            </Badge>
            {hasChanges && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Unsaved changes
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="size-4" />
            Reset Chat
          </Button>
          <Button size="sm" onClick={handlePublish} className="gap-2">
            <CheckCircle className="size-4" />
            Publish
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Editable Config */}
        <div className="w-80 border-r bg-white overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b">
            <h2 className="font-medium flex items-center gap-2">
              <Settings className="size-4" />
              Agent Configuration
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Edit settings and test immediately
            </p>
          </div>

          <div className="divide-y">
            {/* Basic Info */}
            <Collapsible
              open={expandedSections.has("basic")}
              onOpenChange={() => toggleSection("basic")}
            >
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium">Basic Info</span>
                <ChevronRight
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    expandedSections.has("basic") && "rotate-90"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <Input
                    value={config.name}
                    onChange={(e) => updateConfig({ name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <Textarea
                    value={config.description}
                    onChange={(e) => updateConfig({ description: e.target.value })}
                    className="mt-1 resize-none"
                    rows={2}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Instructions */}
            <Collapsible
              open={expandedSections.has("instructions")}
              onOpenChange={() => toggleSection("instructions")}
            >
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">System Prompt</span>
                  <Sparkles className="size-3 text-amber-500" />
                </div>
                <ChevronRight
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    expandedSections.has("instructions") && "rotate-90"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <Textarea
                  value={config.instructions}
                  onChange={(e) => updateConfig({ instructions: e.target.value })}
                  placeholder="Describe how the agent should behave..."
                  className="resize-none text-sm"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This guides how the agent responds. Be specific about tone, boundaries, and behavior.
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* Conversation Starters */}
            <Collapsible
              open={expandedSections.has("starters")}
              onOpenChange={() => toggleSection("starters")}
            >
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Conversation Starters</span>
                  <Badge variant="secondary" className="text-xs">
                    {config.conversationStarters.filter((s) => s.trim()).length}
                  </Badge>
                </div>
                <ChevronRight
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    expandedSections.has("starters") && "rotate-90"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 space-y-2">
                {config.conversationStarters.map((starter, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={starter}
                      onChange={(e) => updateStarter(index, e.target.value)}
                      placeholder="e.g., How do I reset my password?"
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => removeStarter(index)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={addStarter}
                >
                  <Plus className="size-3" />
                  Add Starter
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Guardrails */}
            <Collapsible
              open={expandedSections.has("guardrails")}
              onOpenChange={() => toggleSection("guardrails")}
            >
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Guardrails</span>
                  <Shield className="size-3 text-red-500" />
                </div>
                <ChevronRight
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    expandedSections.has("guardrails") && "rotate-90"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Topics the agent will decline to discuss
                </p>
                {config.guardrails.map((guardrail, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={guardrail}
                      onChange={(e) => updateGuardrail(index, e.target.value)}
                      placeholder="e.g., salary information"
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => removeGuardrail(index)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={addGuardrail}
                >
                  <Plus className="size-3" />
                  Add Guardrail
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Knowledge & Skills (read-only summary) */}
            <div className="px-4 py-3">
              <h3 className="text-sm font-medium mb-3">Connected Resources</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <BookOpen className="size-3" />
                    Knowledge Sources
                  </span>
                  <span className="font-medium text-foreground">{config.knowledgeSources.length}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Zap className="size-3" />
                    Skills
                  </span>
                  <span className="font-medium text-foreground">{config.workflows.length}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Edit knowledge and skills in the full builder
              </p>
            </div>
          </div>
        </div>

        {/* Right panel - Chat Test */}
        <div className="flex-1 flex flex-col">
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
              {/* Welcome / Empty state */}
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-4">
                  <div className={cn("size-16 rounded-xl flex items-center justify-center mx-auto", color.bg)}>
                    <Icon className={cn("size-8", color.text)} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{config.name}</h2>
                    <p className="text-muted-foreground mt-1">{config.description}</p>
                  </div>

                  {/* Quick test prompts */}
                  {config.conversationStarters.filter((s) => s.trim()).length > 0 && (
                    <div className="pt-4">
                      <p className="text-sm text-muted-foreground mb-3">Try a conversation starter:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {config.conversationStarters
                          .filter((s) => s.trim())
                          .slice(0, 4)
                          .map((starter, index) => (
                            <button
                              key={index}
                              onClick={() => handleStarterClick(starter)}
                              className="px-3 py-1.5 text-sm border rounded-full hover:bg-muted transition-colors"
                            >
                              {starter}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 pt-4 text-sm text-muted-foreground">
                    <Play className="size-4" />
                    <span>Send a message to test your agent</span>
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div
                    className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {msg.role === "assistant" && (
                      <div className={cn("size-8 rounded-lg flex items-center justify-center flex-shrink-0", color.bg)}>
                        <Icon className={cn("size-4", color.text)} />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] px-4 py-3 rounded-2xl",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>

                  {/* Feedback for assistant messages */}
                  {msg.role === "assistant" && (
                    <div className="ml-11 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Was this helpful?</span>
                      <button
                        onClick={() => handleFeedback(msg.id, "up")}
                        className={cn(
                          "p-1 rounded transition-colors",
                          msg.feedback === "up"
                            ? "text-emerald-600 bg-emerald-50"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <ThumbsUp className="size-3" />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, "down")}
                        className={cn(
                          "p-1 rounded transition-colors",
                          msg.feedback === "down"
                            ? "text-red-600 bg-red-50"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <ThumbsDown className="size-3" />
                      </button>
                      {msg.feedback === "down" && (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <Pencil className="size-3" />
                          Try adjusting the system prompt
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className={cn("size-8 rounded-lg flex items-center justify-center flex-shrink-0", color.bg)}>
                    <Icon className={cn("size-4", color.text)} />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t bg-white px-4 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message to test your agent..."
                  className="flex-1 px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                  <Send className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Responses are simulated based on your configuration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Confirmation Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="size-5 text-emerald-600" />
              Publish Agent
            </DialogTitle>
            <DialogDescription>
              Review your agent configuration before publishing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Agent summary */}
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className={cn("size-10 rounded-lg flex items-center justify-center", color.bg)}>
                <Icon className={cn("size-5", color.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{config.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{config.description}</p>
              </div>
            </div>

            {/* Config summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">Starters</span>
                <span className="font-medium">{config.conversationStarters.filter((s) => s.trim()).length}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">Guardrails</span>
                <span className="font-medium">{config.guardrails.filter((g) => g.trim()).length}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">Knowledge</span>
                <span className="font-medium">{config.knowledgeSources.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">Skills</span>
                <span className="font-medium">{config.workflows.length}</span>
              </div>
            </div>

            {hasChanges && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                <AlertCircle className="size-4" />
                You have unsaved changes that will be published
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPublish} className="gap-2">
              <Rocket className="size-4" />
              Publish Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Generate simulated response based on agent configuration
function generateResponse(input: string, config: AgentConfig): string {
  const lowerInput = input.toLowerCase();

  // Check guardrails first
  for (const guardrail of config.guardrails) {
    if (guardrail && lowerInput.includes(guardrail.toLowerCase())) {
      return `I'm sorry, but I'm not able to help with questions about ${guardrail}. This topic is outside my configured scope. Is there something else I can assist you with?`;
    }
  }

  // Check for skill/workflow matches
  for (const workflow of config.workflows) {
    const workflowLower = workflow.toLowerCase();
    if (lowerInput.includes(workflowLower) ||
        (workflowLower.includes("password") && lowerInput.includes("password")) ||
        (workflowLower.includes("unlock") && lowerInput.includes("unlock")) ||
        (workflowLower.includes("access") && lowerInput.includes("access"))) {
      return `I can help you with "${workflow}". Let me guide you through the process.\n\n**To proceed, I'll need:**\n• Your employee ID or email\n• Verification of your identity\n\nOnce verified, I'll initiate the ${workflow.toLowerCase()} workflow. Would you like to continue?`;
    }
  }

  // Knowledge-based response
  if (config.knowledgeSources.length > 0) {
    return `Based on ${config.knowledgeSources[0]}, here's what I found regarding "${input.slice(0, 40)}${input.length > 40 ? "..." : ""}":\n\nThis information comes from our verified documentation. ${config.instructions ? `\n\nNote: ${config.instructions.slice(0, 100)}${config.instructions.length > 100 ? "..." : ""}` : ""}\n\nWould you like more details on any specific aspect?`;
  }

  // Generic helpful response
  return `Thanks for your question about "${input.slice(0, 30)}${input.length > 30 ? "..." : ""}". As ${config.name}, I'm here to help.\n\n${config.description}\n\nCould you provide more details so I can better assist you?`;
}
