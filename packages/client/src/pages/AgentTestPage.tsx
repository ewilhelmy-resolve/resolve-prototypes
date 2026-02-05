/**
 * AgentTestPage - Full-page test mode for agents
 *
 * Features:
 * - Full-screen chat interface
 * - Test scenarios panel (suggested prompts)
 * - Guardrails indicator
 * - Reset and publish controls
 * - Supports both URL params (/agents/:id/test) and navigation state
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
  Lightbulb,
  ShieldAlert,
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
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
    instructions: "Help users with IT-related questions. Be patient and thorough.",
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
  feedbackExpanded?: boolean;
}

export default function AgentTestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: agentId } = useParams<{ id: string }>();

  // Try to load config from: 1) navigation state, 2) URL params
  const stateConfig = (location.state?.config || location.state?.agentConfig) as AgentConfig | undefined;
  const urlConfig = agentId ? MOCK_SAVED_AGENTS[agentId] : undefined;
  const config = stateConfig || urlConfig;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFeedback = (messageId: string, feedback: "up" | "down") => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              feedback,
              feedbackExpanded: feedback === "down",
            }
          : msg
      )
    );
  };

  const handleFeedbackTextChange = (messageId: string, text: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, feedbackText: text } : msg
      )
    );
  };

  const handleEditInstructions = (feedbackText?: string) => {
    // Navigate back to builder with feedback context
    if (agentId) {
      navigate(`/agents/${agentId}`, {
        state: {
          focusInstructions: true,
          feedback: feedbackText
        }
      });
    } else {
      navigate(-1);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle no config (direct navigation without ID or state)
  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Bot className="size-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No agent configuration found.</p>
          <p className="text-sm text-muted-foreground">
            Navigate here from the agent builder or use a valid agent ID.
          </p>
          <Button onClick={() => navigate("/agents")}>Back to Agents</Button>
        </div>
      </div>
    );
  }

  const Icon = ICON_MAP[config.iconId] || Bot;
  const color = COLOR_MAP[config.iconColorId] || COLOR_MAP.slate;

  // Generate suggested test prompts based on agent config
  const testSuggestions = [
    ...config.conversationStarters.filter((s) => s.trim()),
    ...(config.workflows.length > 0 ? [`Can you help me with ${config.workflows[0].toLowerCase()}?`] : []),
    ...(config.guardrails.length > 0 ? [`What can you tell me about ${config.guardrails[0]}?`] : []),
  ].slice(0, 5);

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

    // Simulate agent response based on configuration
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: generateResponse(input.trim(), config),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
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
    // Navigate back to builder - would trigger publish in real implementation
    if (agentId) {
      navigate(`/agents/${agentId}`, { state: { triggerPublish: true } });
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Back to editor">
            <ArrowLeft className="size-4" />
          </Button>
          <div className={cn("size-8 rounded-lg flex items-center justify-center", color.bg)}>
            <Icon className={cn("size-4", color.text)} />
          </div>
          <div>
            <span className="font-medium">{config.name}</span>
            <span className="text-xs text-muted-foreground ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
              Test Mode
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="size-4" />
            Reset
          </Button>
          <Button size="sm" onClick={handlePublish} className="gap-2">
            <CheckCircle className="size-4" />
            Publish
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
              {/* Welcome message */}
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-4">
                  <div className={cn("size-16 rounded-xl flex items-center justify-center mx-auto", color.bg)}>
                    <Icon className={cn("size-8", color.text)} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{config.name}</h2>
                    <p className="text-muted-foreground mt-1">{config.description}</p>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Test your agent by sending messages below. Responses are simulated based on the agent's configuration.
                  </p>
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

                  {/* Feedback UI for assistant messages */}
                  {msg.role === "assistant" && (
                    <div className="ml-11 space-y-2">
                      {/* Thumbs up/down buttons - hide after feedback given */}
                      {!msg.feedback && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground mr-2">How was this response?</span>
                          <button
                            onClick={() => handleFeedback(msg.id, "up")}
                            className="p-1.5 rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
                            aria-label="Good response"
                          >
                            <ThumbsUp className="size-4" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, "down")}
                            className="p-1.5 rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
                            aria-label="Bad response"
                          >
                            <ThumbsDown className="size-4" />
                          </button>
                        </div>
                      )}

                      {/* Thumbs up feedback response */}
                      {msg.feedback === "up" && (
                        <div className="flex items-center gap-2 text-sm text-emerald-600">
                          <ThumbsUp className="size-4" />
                          <span>Thanks for the feedback!</span>
                        </div>
                      )}

                      {/* Thumbs down feedback with improvement suggestions */}
                      {msg.feedback === "down" && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                          <div className="flex items-center gap-2 text-sm text-amber-700">
                            <ThumbsDown className="size-4" />
                            <span>Thanks for the feedback!</span>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-amber-800">
                              What could be better?
                            </label>
                            <Textarea
                              placeholder="e.g., Tone was too formal, missed key info..."
                              value={msg.feedbackText || ""}
                              onChange={(e) => handleFeedbackTextChange(msg.id, e.target.value)}
                              className="mt-1.5 text-sm bg-white border-amber-200 focus:border-amber-400 resize-none"
                              rows={2}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-amber-700">
                              Tip: Edit your agent's instructions to improve responses
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
                              onClick={() => handleEditInstructions(msg.feedbackText)}
                            >
                              <Pencil className="size-3" />
                              Edit Instructions
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
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

          {/* Input area */}
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
                Test conversation - responses are simulated based on agent configuration
              </p>
            </div>
          </div>
        </div>

        {/* Right panel - Test Scenarios */}
        <div className="w-80 border-l bg-white p-4 overflow-y-auto hidden lg:block">
          {/* Test suggestions */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="size-4 text-amber-500" />
              <h3 className="font-medium text-sm">Try these prompts</h3>
            </div>
            <div className="space-y-2">
              {testSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 group"
                >
                  <ChevronRight className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="line-clamp-2">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Guardrails indicator */}
          {config.guardrails.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="size-4 text-red-500" />
                <h3 className="font-medium text-sm">Guardrails active</h3>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-xs text-red-700 mb-2">Agent will decline questions about:</p>
                <div className="flex flex-wrap gap-1">
                  {config.guardrails.map((guardrail, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded"
                    >
                      {guardrail}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Agent capabilities */}
          <div>
            <h3 className="font-medium text-sm mb-3">Agent capabilities</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Type</span>
                <span className="font-medium text-foreground capitalize">{config.agentType || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Knowledge sources</span>
                <span className="font-medium text-foreground">{config.knowledgeSources.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Skills</span>
                <span className="font-medium text-foreground">{config.workflows.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Starters</span>
                <span className="font-medium text-foreground">
                  {config.conversationStarters.filter((s) => s.trim()).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
