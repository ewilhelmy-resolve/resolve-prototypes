/**
 * AgentTestPage - Full-page test & iterate experience
 *
 * Flow:
 * 1. Pick a prompt → agent responds
 * 2. Rate response (Good/OK/Poor)
 * 3. If not Good, give feedback → agent retries
 * 4. When Good after iterations, suggest config improvements
 * 5. Apply or skip, then test another or publish
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  Headphones,
  ShieldCheck,
  Key,
  BookOpen,
  RotateCcw,
  Rocket,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Zap,
  Database,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  bot: Bot,
  headphones: Headphones,
  "shield-check": ShieldCheck,
  key: Key,
  "book-open": BookOpen,
};

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  slate: { bg: "bg-slate-800", text: "text-white" },
  blue: { bg: "bg-blue-600", text: "text-white" },
  emerald: { bg: "bg-emerald-600", text: "text-white" },
  purple: { bg: "bg-purple-600", text: "text-white" },
  orange: { bg: "bg-orange-500", text: "text-white" },
  rose: { bg: "bg-rose-500", text: "text-white" },
};

// Mock saved agents
const MOCK_SAVED_AGENTS: Record<string, AgentConfig> = {
  "1": {
    name: "HelpDesk Advisor",
    description: "Answers IT support questions",
    instructions: "Help users with IT-related questions. Be patient and thorough.",
    role: "IT Support Specialist",
    iconId: "headphones",
    iconColorId: "blue",
    agentType: "answer",
    conversationStarters: ["I need to reset my password", "My VPN isn't connecting", "How do I request software?"],
    knowledgeSources: ["IT Knowledge Base"],
    workflows: ["Reset password", "Unlock account", "Request system access"],
    guardrails: ["salary", "performance reviews"],
  },
  "2": {
    name: "Compliance Checker",
    description: "Answers from compliance docs",
    instructions: "Only answer from approved compliance documents.",
    role: "Compliance Specialist",
    iconId: "shield-check",
    iconColorId: "emerald",
    agentType: "knowledge",
    conversationStarters: ["Is my I-9 complete?", "What background checks are required?"],
    knowledgeSources: ["Compliance Handbook", "HR Policies"],
    workflows: ["Verify I-9 forms", "Check background status"],
    guardrails: ["personal opinions", "legal advice"],
  },
};

interface AgentConfig {
  name: string;
  description: string;
  instructions: string;
  role: string;
  iconId: string;
  iconColorId: string;
  agentType: "answer" | "knowledge" | "workflow" | null;
  conversationStarters: string[];
  knowledgeSources: string[];
  workflows: string[];
  guardrails: string[];
}

interface ConfigSuggestion {
  message: string;
  updateType: "instructions";
  updateValue: string;
  applied?: boolean;
}

interface TestMessage {
  id: string;
  type: "user" | "agent" | "agent-retry" | "system" | "user-feedback" | "suggestion";
  content: string;
  sourcesUsed?: { type: "knowledge" | "workflow"; name: string }[];
  iterationNumber?: number;
  suggestion?: ConfigSuggestion;
}

type TestPhase = "idle" | "awaiting-rating" | "awaiting-feedback" | "processing" | "awaiting-suggestion-response";

export default function AgentTestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: agentId } = useParams<{ id: string }>();

  const stateConfig = (location.state?.config || location.state?.agentConfig) as AgentConfig | undefined;
  const urlConfig = agentId ? MOCK_SAVED_AGENTS[agentId] : undefined;
  const initialConfig = stateConfig || urlConfig;

  const [config, setConfig] = useState<AgentConfig | null>(initialConfig || null);
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<TestPhase>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [expandedSources, setExpandedSources] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  const starters = config.conversationStarters.filter(s => s.trim()).slice(0, 4);

  const addMessage = (msg: Omit<TestMessage, "id">) => {
    setMessages(prev => [...prev, { ...msg, id: Date.now().toString() + Math.random() }]);
  };

  const handleStartTest = async (prompt: string) => {
    setCurrentPrompt(prompt);
    setFeedbackHistory([]);

    addMessage({ type: "user", content: prompt });

    setIsLoading(true);
    setPhase("processing");
    await new Promise(r => setTimeout(r, 600 + Math.random() * 600));

    const { response, sources } = generateResponse(prompt, config, []);
    addMessage({ type: "agent", content: response, sourcesUsed: sources });

    setIsLoading(false);
    setPhase("awaiting-rating");
  };

  const handleRating = async (rating: "good" | "acceptable" | "poor") => {
    if (rating === "good") {
      if (feedbackHistory.length > 0) {
        const suggestion = generateConfigSuggestion(feedbackHistory);
        addMessage({
          type: "system",
          content: `Response approved after ${feedbackHistory.length} revision${feedbackHistory.length > 1 ? "s" : ""}.`
        });
        addMessage({
          type: "suggestion",
          content: suggestion.message,
          suggestion
        });
        setPhase("awaiting-suggestion-response");
      } else {
        addMessage({
          type: "system",
          content: "Response approved. Test another prompt or publish when ready."
        });
        setPhase("idle");
      }
      setFeedbackHistory([]);
    } else {
      setPhase("awaiting-feedback");
      inputRef.current?.focus();
    }
  };

  const handleSuggestionResponse = (accepted: boolean) => {
    if (accepted) {
      const suggestionIndex = messages.findIndex(m => m.type === "suggestion" && m.suggestion && !m.suggestion.applied);
      if (suggestionIndex !== -1) {
        const suggestion = messages[suggestionIndex].suggestion!;
        setConfig(prev => prev ? {
          ...prev,
          instructions: prev.instructions + "\n\n" + suggestion.updateValue
        } : prev);
        setHasChanges(true);
        setMessages(prev => prev.map((m, i) =>
          i === suggestionIndex ? { ...m, suggestion: { ...m.suggestion!, applied: true } } : m
        ));
      }
      addMessage({ type: "system", content: "Applied! Test another prompt to verify." });
    } else {
      addMessage({ type: "system", content: "Skipped. Test another prompt or publish." });
    }
    setPhase("idle");
  };

  const handleFeedbackSubmit = async () => {
    if (!input.trim()) return;

    const feedback = input.trim();
    setInput("");

    const newFeedbackHistory = [...feedbackHistory, feedback];
    setFeedbackHistory(newFeedbackHistory);

    addMessage({ type: "user-feedback", content: feedback });

    setIsLoading(true);
    setPhase("processing");
    await new Promise(r => setTimeout(r, 600 + Math.random() * 600));

    const { response, sources } = generateResponse(currentPrompt, config, newFeedbackHistory);
    addMessage({
      type: "agent-retry",
      content: response,
      sourcesUsed: sources,
      iterationNumber: newFeedbackHistory.length
    });

    setIsLoading(false);
    setPhase("awaiting-rating");
  };

  const handleReset = () => {
    setMessages([]);
    setPhase("idle");
    setCurrentPrompt("");
    setFeedbackHistory([]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (phase === "idle" && input.trim()) {
        handleStartTest(input.trim());
        setInput("");
      } else if (phase === "awaiting-feedback" && input.trim()) {
        handleFeedbackSubmit();
      }
    }
  };

  const handleSend = () => {
    if (phase === "idle" && input.trim()) {
      handleStartTest(input.trim());
      setInput("");
    } else if (phase === "awaiting-feedback" && input.trim()) {
      handleFeedbackSubmit();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className={cn("size-8 rounded-lg flex items-center justify-center", color.bg)}>
            <Icon className={cn("size-4", color.text)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{config.name}</span>
            <Badge variant="outline" className="text-xs">Test Mode</Badge>
            {hasChanges && (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                Changes pending
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          )}
          <Button size="sm" onClick={() => setShowPublishDialog(true)} className="gap-1.5">
            <Rocket className="size-3.5" />
            Publish
          </Button>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-8 px-4">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="text-center py-12">
              <div className={cn("size-16 rounded-xl flex items-center justify-center mx-auto mb-4", color.bg)}>
                <Icon className={cn("size-8", color.text)} />
              </div>
              <h2 className="text-xl font-semibold">{config.name}</h2>
              <p className="text-muted-foreground mt-1 mb-8">{config.description}</p>

              {starters.length > 0 && (
                <div className="space-y-2 max-w-md mx-auto">
                  <p className="text-sm text-muted-foreground mb-3">Try a prompt:</p>
                  {starters.map((starter, i) => (
                    <button
                      key={i}
                      onClick={() => handleStartTest(starter)}
                      disabled={isLoading}
                      className="w-full text-left px-4 py-3 text-sm bg-white rounded-xl border hover:shadow-sm hover:border-primary/30 transition-all disabled:opacity-50"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Messages */
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {/* User message */}
                  {msg.type === "user" && (
                    <div className="flex justify-end mb-6">
                      <div className="bg-slate-800 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]">
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  )}

                  {/* Agent response */}
                  {(msg.type === "agent" || msg.type === "agent-retry") && (
                    <div className="space-y-3 mb-6">
                      {msg.type === "agent-retry" && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <RefreshCw className="size-3" />
                          <span>Revision {msg.iterationNumber}</span>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <div className={cn("size-8 rounded-lg flex items-center justify-center flex-shrink-0", color.bg)}>
                          <Icon className={cn("size-4", color.text)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 border shadow-sm">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                            {/* Sources */}
                            {msg.sourcesUsed && msg.sourcesUsed.length > 0 && (
                              <>
                                <button
                                  onClick={() => setExpandedSources(expandedSources === msg.id ? null : msg.id)}
                                  className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {expandedSources === msg.id ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                                  Sources ({msg.sourcesUsed.length})
                                </button>
                                {expandedSources === msg.id && (
                                  <div className="mt-2 space-y-1">
                                    {msg.sourcesUsed.map((source, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {source.type === "knowledge" ? <Database className="size-3" /> : <Zap className="size-3" />}
                                        {source.name}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Rating buttons */}
                          {phase === "awaiting-rating" && messages[messages.length - 1]?.id === msg.id && (
                            <div className="mt-4 flex items-center gap-4">
                              <span className="text-xs text-muted-foreground">Rate this response:</span>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => handleRating("good")}>
                                  <ThumbsUp className="size-3.5" /> Good
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => handleRating("acceptable")}>
                                  <Minus className="size-3.5" /> OK
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => handleRating("poor")}>
                                  <ThumbsDown className="size-3.5" /> Poor
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* User feedback */}
                  {msg.type === "user-feedback" && (
                    <div className="flex justify-end mb-6">
                      <div className="bg-muted rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]">
                        <p className="text-sm italic text-muted-foreground">{msg.content}</p>
                      </div>
                    </div>
                  )}

                  {/* System message */}
                  {msg.type === "system" && (
                    <p className="text-xs text-muted-foreground text-center py-3">{msg.content}</p>
                  )}

                  {/* Suggestion */}
                  {msg.type === "suggestion" && msg.suggestion && (
                    <div className="max-w-md mx-auto my-6">
                      <div className="border rounded-xl p-4 bg-white">
                        <div className="flex items-start gap-3">
                          <Zap className="size-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Suggested improvement</p>
                            <p className="text-xs text-muted-foreground mt-1">{msg.content}</p>
                            <div className="mt-3 p-2 bg-muted/50 rounded text-xs font-mono">
                              {msg.suggestion.updateValue}
                            </div>
                          </div>
                        </div>
                        {!msg.suggestion.applied && phase === "awaiting-suggestion-response" && (
                          <div className="flex gap-2 mt-4 pt-3 border-t">
                            <Button size="sm" onClick={() => handleSuggestionResponse(true)}>
                              Apply to config
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleSuggestionResponse(false)}>
                              Skip
                            </Button>
                          </div>
                        )}
                        {msg.suggestion.applied && (
                          <p className="text-xs text-emerald-600 mt-3 pt-3 border-t">✓ Applied to config</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading */}
              {isLoading && (
                <div className="flex gap-3 mb-6">
                  <div className={cn("size-8 rounded-lg flex items-center justify-center flex-shrink-0", color.bg)}>
                    <Icon className={cn("size-4", color.text)} />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                phase === "idle" ? "Type a prompt to test..." :
                phase === "awaiting-feedback" ? "What should be different?" :
                phase === "awaiting-rating" ? "Rate the response above" :
                "..."
              }
              className="min-h-[48px] max-h-[120px] pr-12 resize-none"
              disabled={isLoading || phase === "awaiting-rating" || phase === "awaiting-suggestion-response"}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading || phase === "awaiting-rating" || phase === "awaiting-suggestion-response"}
              className="absolute bottom-2 right-2"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="size-5" />
              Publish Agent
            </DialogTitle>
            <DialogDescription>
              Make this agent available to users.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className={cn("size-10 rounded-lg flex items-center justify-center", color.bg)}>
                <Icon className={cn("size-5", color.text)} />
              </div>
              <div>
                <h3 className="font-medium">{config.name}</h3>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
            </div>
            {hasChanges && (
              <p className="text-xs text-emerald-600 mt-3">✓ Includes improvements from testing</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>Cancel</Button>
            <Button onClick={() => navigate("/agents", { state: { published: true } })}>
              <Rocket className="size-4 mr-1.5" />
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Generate response based on skills
function generateResponse(
  input: string,
  config: AgentConfig,
  feedbackHistory: string[]
): { response: string; sources: { type: "knowledge" | "workflow"; name: string }[] } {
  const lowerInput = input.toLowerCase();
  const iteration = feedbackHistory.length;
  const sources: { type: "knowledge" | "workflow"; name: string }[] = [];

  // Check guardrails
  for (const guardrail of config.guardrails) {
    if (guardrail && lowerInput.includes(guardrail.toLowerCase())) {
      return { response: `I can't help with questions about ${guardrail}. This is outside my scope.`, sources: [] };
    }
  }

  // Skill keywords and responses
  const skills: Record<string, { keywords: string[]; responses: string[] }> = {
    "password": {
      keywords: ["password", "forgot", "reset password"],
      responses: [
        "I can help with password reset. Let me know if you have questions.",
        "I'll help you reset your password. This takes about 5 minutes. You'll get a confirmation email when done.",
        "Done! Your password has been reset.\n\n• Temporary password sent to your email\n• You'll be prompted to create a new one on first login\n• Link expires in 24 hours"
      ]
    },
    "unlock": {
      keywords: ["locked", "unlock", "locked out", "can't log in"],
      responses: [
        "I can help unlock your account.",
        "I'll help unlock your account. This usually takes 5-10 minutes.",
        "Done! Your account has been unlocked.\n\n• You can log in now\n• If you forgot your password, let me know\n• Confirmation email sent"
      ]
    },
    "access": {
      keywords: ["request access", "need access", "permission"],
      responses: [
        "I can help with access requests. What system do you need access to?",
        "I'll help you request access. Which system?\n\n• Salesforce\n• Jira\n• GitHub\n• SharePoint",
        "Access request submitted!\n\n• Request ID: ACC-" + Math.floor(10000 + Math.random() * 90000) + "\n• Approver notified\n• Typical approval: 1-2 business days"
      ]
    },
    "expense": {
      keywords: ["expense", "reimbursement", "submit expense"],
      responses: [
        "I can help with expense submissions.",
        "I'll help you submit an expense report.\n\nWhat type?\n• Travel\n• Meals\n• Office supplies",
        "Expense report started!\n\n• Draft ID: EXP-" + Math.floor(10000 + Math.random() * 90000) + "\n• Upload receipts in the portal\n• Reimbursement: 5-7 business days after approval"
      ]
    },
    "pto": {
      keywords: ["pto", "time off", "vacation", "days off"],
      responses: [
        "I can check your PTO balance.",
        "Looking up your time off balance...",
        "Here's your PTO balance:\n\n• Vacation: 12 days remaining\n• Sick leave: 5 days remaining\n• Personal: 2 days remaining"
      ]
    },
    "birthday": {
      keywords: ["birthday", "coworker birthday"],
      responses: [
        "I can look up a coworker's birthday. Whose birthday would you like to find?",
        "I'll look that up. What's their name or email?",
        "Found it! Sarah Johnson's birthday is March 15th."
      ]
    },
    "i9": {
      keywords: ["i-9", "i9", "employment verification"],
      responses: [
        "I can check your I-9 status.",
        "Checking your I-9 verification status...",
        "Your I-9 Status: Complete ✓\n\n• Submitted: Jan 15, 2024\n• Verified: Jan 17, 2024"
      ]
    },
    "background": {
      keywords: ["background check", "background status"],
      responses: [
        "I can check your background check status.",
        "Looking up your background screening status...",
        "Background Check Status: Complete ✓\n\n• Completed: Jan 14, 2024\n• Result: Cleared"
      ]
    }
  };

  // Find matching skill
  for (const [skillKey, skillData] of Object.entries(skills)) {
    if (skillData.keywords.some(k => lowerInput.includes(k))) {
      sources.push({ type: "workflow", name: skillKey.charAt(0).toUpperCase() + skillKey.slice(1) });
      const responseIndex = Math.min(iteration, skillData.responses.length - 1);
      return { response: skillData.responses[responseIndex], sources };
    }
  }

  // Knowledge sources
  if (config.knowledgeSources.length > 0) {
    const source = config.knowledgeSources[0];
    sources.push({ type: "knowledge", name: source });

    if (iteration === 0) return { response: `Based on ${source}, I found information about your question.`, sources };
    if (iteration === 1) return { response: `According to ${source}:\n\nThis is covered in section 3.2. Standard procedures apply.`, sources };
    return { response: `Here's what I found in ${source}:\n\n**Summary**\nYour question is addressed in our documentation.\n\n**Key points**\n• Standard procedures apply\n• Processing: 2-3 business days`, sources };
  }

  // Generic fallback
  const lastFeedback = feedbackHistory[feedbackHistory.length - 1]?.toLowerCase() || "";

  if (iteration === 0) return { response: `Thanks for your question. I'm here to help.`, sources: [] };

  if (lastFeedback.includes("name") || lastFeedback.includes("ask")) {
    return { response: `Of course! Could you tell me more details so I can help?`, sources: [] };
  }

  if (lastFeedback.includes("helpful") || lastFeedback.includes("not")) {
    return { response: `I apologize. Let me be more helpful.\n\nCould you provide more details about what you're looking for?`, sources: [] };
  }

  return { response: `I can help with that. Could you provide more details?`, sources: [] };
}

// Generate config suggestion
function generateConfigSuggestion(feedbackHistory: string[]): ConfigSuggestion {
  const allFeedback = feedbackHistory.join(" ").toLowerCase();

  if (allFeedback.includes("step") || allFeedback.includes("detail")) {
    return {
      message: "The agent should provide more detailed responses.",
      updateType: "instructions",
      updateValue: "Always provide step-by-step instructions when helping users complete tasks."
    };
  }

  if (allFeedback.includes("friendly") || allFeedback.includes("tone")) {
    return {
      message: "The agent should use a friendlier tone.",
      updateType: "instructions",
      updateValue: "Use a warm, friendly tone. Acknowledge user concerns with empathy."
    };
  }

  if (allFeedback.includes("helpful") || allFeedback.includes("not")) {
    return {
      message: "The agent should be more action-oriented.",
      updateType: "instructions",
      updateValue: "Focus on taking concrete actions to resolve user issues."
    };
  }

  return {
    message: "Consider adding this guidance based on your feedback.",
    updateType: "instructions",
    updateValue: `When responding: ${feedbackHistory.slice(0, 2).join("; ")}`
  };
}
