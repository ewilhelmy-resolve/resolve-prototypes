/**
 * AgentTestPage - Full-page test & iterate experience
 *
 * Flow:
 * 1. Pick a prompt → agent responds
 * 2. Rate response (Good/OK/Poor)
 * 3. If not Good, give feedback → agent retries
 * 4. When Good after iterations, suggest config improvements
 * 5. Apply or skip, then test another or publish
 *
 * ## Wiring to real backend (TODO)
 *
 * Currently uses mock `generateResponse()` and `generateConfigSuggestion()`.
 * To connect to the real agent execution backend:
 *
 * ### 1. Message send/receive — same SSE flow as chat
 *
 * The agent test page should use the same communication pattern as
 * `/chat` and `/iframe/chat`: send a message via POST, receive responses
 * via SSE (new_message events from RabbitMQ → SSE service).
 *
 * Replace `handleStartTest` and `handleFeedbackSubmit` internals:
 * - POST to agent execution endpoint (e.g. `POST /api/agents/:id/execute`)
 *   with `{ prompt, conversationId, feedbackHistory? }`
 * - Response arrives via SSE `new_message` events (same as regular chat)
 * - Use `useConversationStore` + `SSEProvider` to receive messages
 * - OR use `ChatV2Content` component which handles store→render automatically
 *
 * ### 2. Conversation lifecycle — endpoint TBD
 *
 * Agent test conversations may load from a different endpoint than regular
 * conversations (e.g. `GET /api/agents/:id/conversations` or similar).
 * The conversation creation may also differ — currently the page doesn't
 * persist conversations, but when wired it should:
 * - Create conversation on first message (`POST /api/agents/:id/conversations`)
 * - Load existing test conversations for the agent
 * - Use `source: 'agent-test'` to distinguish from regular chat
 *
 * ### 3. Config suggestions — LLM-powered
 *
 * Replace `generateConfigSuggestion()` with a real API call:
 * - `POST /api/agents/:id/suggest` with `{ feedbackHistory, currentConfig }`
 * - Backend sends feedbackHistory to LLM, gets instruction improvements
 * - Returns `{ message, updateType, updateValue }` same shape as current mock
 *
 * ### 4. Publish — already has the pattern
 *
 * `handlePublish` should call `PATCH /api/agents/:id` with the updated config.
 * The `useAgent` hook from `@/hooks/api/useAgents` already provides the query;
 * add a mutation hook for updates.
 *
 * ### 5. Rendering upgrade path
 *
 * When ready to support reasoning steps, completion cards, and rich metadata
 * in agent test responses, replace the manual message rendering (lines ~468-650)
 * with `ChatV2MessageRenderer` from `@/components/chat/`. It renders all
 * message types (reasoning, sources, tasks, completion) from `ChatMessage[]`
 * and works without SSE/stores when passed data as props.
 */

import confetti from "canvas-confetti";
import {
	ArrowLeft,
	Bot,
	BotMessageSquare,
	Check,
	ChevronUp,
	Database,
	Loader2,
	RefreshCw,
	SendHorizontal,
	ThumbsDown,
	ThumbsUp,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AGENT_COLOR_MAP, AGENT_ICON_MAP } from "@/constants/agents";
import { useAgent } from "@/hooks/api/useAgents";
// TODO: Uncomment these when wiring to real backend
// import { useCreateConversation, useSendMessage } from "@/hooks/api/useConversations";
// import { useSSEContext } from "@/contexts/SSEContext";
// import { useConversationStore } from "@/stores/conversationStore";
// import { ChatV2MessageRenderer } from "@/components/chat/ChatV2MessageRenderer";
// import { groupMessages } from "@/lib/messageGrouping";
import { cn } from "@/lib/utils";
import type { AgentConfig, ConfigSuggestion, TestMessage } from "@/types/agent";

// =============================================================================
// TODO: useAgentChat — replace mock functions with this hook
//
// This hook mirrors the /chat flow (useMessageHandler + useConversationManager)
// but scoped to agent test conversations. SSE is already available since
// AgentTestPage is inside RoleProtectedRoute which wraps SSEProvider.
//
// Usage: replace `handleStartTest` internals with `sendMessage()` below.
// Response arrives via SSE → conversationStore.addMessage() → chatMessages.
// =============================================================================
//
// function useAgentChat(agentId: string | undefined) {
//   const { latestUpdate } = useSSEContext();
//   const {
//     messages,
//     chatMessages,
//     currentConversationId,
//     addMessage,
//     updateMessage,
//     setCurrentConversation,
//     setSending,
//     isSending,
//   } = useConversationStore();
//
//   const createConversation = useCreateConversation();
//   const sendMessageMutation = useSendMessage();
//
//   // Handle SSE message_update events (status changes: processing → completed)
//   useEffect(() => {
//     if (latestUpdate) {
//       updateMessage(latestUpdate.messageId, {
//         status: latestUpdate.status,
//         error_message: latestUpdate.errorMessage,
//       });
//     }
//   }, [latestUpdate, updateMessage]);
//
//   // SSE new_message events are handled automatically by SSEContext →
//   // conversationStore.addMessage() → groupMessages() → chatMessages updates.
//   // No additional wiring needed for receiving messages.
//
//   const sendMessage = async (content: string) => {
//     if (!content.trim() || isSending) return;
//
//     let conversationId = currentConversationId;
//
//     // TODO: Agent test conversations may use a different create endpoint
//     // e.g. POST /api/agents/:id/conversations instead of POST /api/conversations
//     // For now, using the same endpoint with a distinguishing title.
//     if (!conversationId) {
//       const conversation = await createConversation.mutateAsync({
//         title: `Agent Test: ${content.substring(0, 30)}`,
//       });
//       conversationId = conversation.id;
//       setCurrentConversation(conversationId);
//     }
//
//     // TODO: Agent test messages may POST to a different endpoint
//     // e.g. POST /api/agents/:id/execute { prompt, conversationId }
//     // For now, using the same send endpoint — the webhook will route
//     // to Actions Platform which triggers the agent workflow.
//     await sendMessageMutation.mutateAsync({
//       conversationId,
//       content,
//       tempId: `msg_${Date.now()}`,
//     });
//   };
//
//   // Derived state — is the agent currently responding?
//   const isStreaming = messages.some(
//     (msg) => msg.status === "processing" || msg.status === "pending",
//   );
//
//   return {
//     // Store-managed messages (grouped, with reasoning/completion rendering)
//     chatMessages,       // Pass to ChatV2MessageRenderer
//     messages,           // Raw messages for status checks
//     isStreaming,
//     isSending,
//     currentConversationId,
//
//     // Actions
//     sendMessage,        // Replaces handleStartTest internals
//
//     // TODO: Add these when agent-specific endpoints exist:
//     // loadAgentConversations — GET /api/agents/:id/conversations
//     // suggestConfigImprovement — POST /api/agents/:id/suggest
//     // publishConfig — PATCH /api/agents/:id
//   };
// }
// =============================================================================

type TestPhase =
	| "idle"
	| "awaiting-rating"
	| "awaiting-feedback"
	| "processing"
	| "awaiting-suggestion-response";

export default function AgentTestPage() {
	const { t } = useTranslation("agents");
	const navigate = useNavigate();
	const location = useLocation();
	const { id: agentId } = useParams<{ id: string }>();

	const stateConfig = (location.state?.config || location.state?.agentConfig) as
		| AgentConfig
		| undefined;
	const { data: apiConfig } = useAgent(agentId);
	const initialConfig = stateConfig || apiConfig;

	const [config, setConfig] = useState<AgentConfig | null>(
		initialConfig || null,
	);

	// Seed config from API when accessed via direct URL (no navigation state)
	useEffect(() => {
		if (apiConfig && !config && !stateConfig) {
			setConfig(apiConfig);
		}
	}, [apiConfig, config, stateConfig]);
	const [messages, setMessages] = useState<TestMessage[]>([]);
	const [input, setInput] = useState("");
	const [feedbackInput, setFeedbackInput] = useState("");
	const [phase, setPhase] = useState<TestPhase>("idle");
	const [isLoading, setIsLoading] = useState(false);
	const [feedbackHistory, setFeedbackHistory] = useState<string[]>([]);
	const [currentPrompt, setCurrentPrompt] = useState("");
	const [hasChanges, setHasChanges] = useState(false);
	const [showPublishDialog, setShowPublishDialog] = useState(false);
	const [expandedSources, setExpandedSources] = useState<string | null>(null);
	const [showInstructionsPreview, setShowInstructionsPreview] = useState(false);
	// Laptop Loan demo: tracks which of the 5 scripted turns we're on.
	const [laptopDemoStep, setLaptopDemoStep] = useState(0);

	const chatEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Demo mode
	const [demoMode, setDemoMode] = useState(false);
	const [demoStep, setDemoStep] = useState(0);

	const isLaptopLoanDemo = config?.name === "Laptop Loan Assistant";

	const DEMO_STEPS = isLaptopLoanDemo
		? [
				{ label: "Start", description: "User asks for a laptop" },
				{ label: "Start date", description: "Employee provides start date" },
				{ label: "Return date", description: "Employee provides return date" },
				{ label: "Pick laptop", description: "Employee picks a model" },
				{ label: "Delivery", description: "Employee picks delivery method" },
				{ label: "Publish", description: "Make agent live" },
			]
		: [
				{ label: "Send Prompt", description: "User asks a question" },
				{ label: "Rate Poor", description: "Thumbs down the response" },
				{ label: "Give Feedback", description: "Tell agent what's wrong" },
				{ label: "Rate Good", description: "Approve the retry" },
				{ label: "Apply Fix", description: "Apply suggestion to instructions" },
				{ label: "Publish", description: "Make agent live" },
			];

	const LAPTOP_DEMO_USER_ANSWERS = [
		"I need a loaner laptop for a trip next week.",
		"October 15",
		"October 22",
		"Dell XPS 13",
		"Mail it to my home address",
	];

	const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

	const handleDemoNext = async () => {
		// Laptop Loan scenario: each Next press sends a scripted user answer
		// and gets the next agent question. Final step opens publish.
		if (isLaptopLoanDemo) {
			if (demoStep < LAPTOP_DEMO_USER_ANSWERS.length) {
				const userAnswer = LAPTOP_DEMO_USER_ANSWERS[demoStep];
				addMessage({ type: "user", content: userAnswer });
				setIsLoading(true);
				setPhase("processing");
				await wait(600);
				const scripted = getLaptopLoanScriptedResponse(demoStep, userAnswer);
				addMessage({
					type: "agent",
					content: scripted.response,
					sourcesUsed: scripted.sources,
				});
				setLaptopDemoStep((s) => Math.min(s + 1, 5));
				setIsLoading(false);
				setPhase("idle");
				setDemoStep(demoStep + 1);
				return;
			}
			// Final step — publish
			setShowPublishDialog(true);
			setDemoStep(0);
			setDemoMode(false);
			return;
		}

		switch (demoStep) {
			case 0: {
				// Send a test prompt
				const prompt = starters[0] || "I need to reset my password";
				handleStartTest(prompt);
				setDemoStep(1);
				break;
			}
			case 1: {
				// Rate poor
				await wait(300);
				handleRating("poor");
				setDemoStep(2);
				break;
			}
			case 2: {
				// Give feedback directly (bypass state since setFeedbackInput is async)
				const demoFeedback =
					"Be more specific about the steps and include a timeline";
				const newHistory = [...feedbackHistory, demoFeedback];
				setFeedbackHistory(newHistory);
				addMessage({ type: "user-feedback", content: demoFeedback });
				setFeedbackInput("");
				setIsLoading(true);
				setPhase("processing");
				await wait(800);
				if (!config) return;
				const { response, sources } = generateResponse(
					currentPrompt,
					config,
					newHistory,
				);
				addMessage({
					type: "agent-retry",
					content: response,
					sourcesUsed: sources,
					iterationNumber: newHistory.length,
				});
				setIsLoading(false);
				setPhase("awaiting-rating");
				setDemoStep(3);
				break;
			}
			case 3: {
				// Rate good (triggers suggestion)
				await wait(300);
				handleRating("good");
				setDemoStep(4);
				break;
			}
			case 4: {
				// Apply suggestion
				await wait(300);
				handleSuggestionResponse(true);
				setDemoStep(5);
				break;
			}
			case 5: {
				// Publish
				setShowPublishDialog(true);
				setDemoStep(6);
				break;
			}
			default:
				setDemoMode(false);
				setDemoStep(0);
				break;
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	if (!config) {
		return (
			<div className="h-screen flex items-center justify-center bg-background">
				<div className="text-center space-y-4">
					<Bot className="size-12 mx-auto text-muted-foreground" />
					<p className="text-muted-foreground">{t("test.notFound")}</p>
					<Button onClick={() => navigate("/agents")}>
						{t("test.backToAgents")}
					</Button>
				</div>
			</div>
		);
	}

	const Icon = AGENT_ICON_MAP[config.iconId] || Bot;
	const color = AGENT_COLOR_MAP[config.iconColorId] || AGENT_COLOR_MAP.slate;
	const starters = config.conversationStarters
		.filter((s) => s.trim())
		.slice(0, 4);

	const addMessage = (msg: Omit<TestMessage, "id">) => {
		setMessages((prev) => [
			...prev,
			{ ...msg, id: Date.now().toString() + Math.random() },
		]);
	};

	const handleStartTest = async (prompt: string) => {
		setCurrentPrompt(prompt);
		setFeedbackHistory([]);

		addMessage({ type: "user", content: prompt });

		setIsLoading(true);
		setPhase("processing");

		// Laptop Loan demo: scripted multi-turn. Skip the rating loop entirely
		// so sales can keep typing and watch the agent walk the 5-step flow.
		if (config?.name === "Laptop Loan Assistant") {
			await new Promise((r) => setTimeout(r, 500));
			const scripted = getLaptopLoanScriptedResponse(laptopDemoStep, prompt);
			addMessage({
				type: "agent",
				content: scripted.response,
				sourcesUsed: scripted.sources,
			});
			setLaptopDemoStep((s) => Math.min(s + 1, 5));
			setIsLoading(false);
			setPhase("idle");
			return;
		}

		// TODO: Replace mock with real backend call:
		// await agentChat.sendMessage(prompt);
		// Then SSE delivers the response → conversationStore → chatMessages.
		// Remove the setTimeout + generateResponse below.
		// The phase transition to "awaiting-rating" should happen when
		// the last SSE message has turn_complete: true (watch chatMessages).
		await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));

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
					content: `Response approved after ${feedbackHistory.length} revision${feedbackHistory.length > 1 ? "s" : ""}. Consider applying the suggestion below to make this improvement permanent. When ready, **publish** to make the agent live for real users.`,
				});
				addMessage({
					type: "suggestion",
					content: suggestion.message,
					suggestion,
				});
				setPhase("awaiting-suggestion-response");
			} else {
				addMessage({
					type: "system",
					content:
						"Response approved. Test another prompt to continue validating, or **publish** when you're satisfied to make this agent live for real users.",
				});
				setPhase("idle");
			}
			setFeedbackHistory([]);
		} else if (feedbackHistory.length >= 2) {
			// After 3+ poor/ok ratings, proactively suggest config improvements
			const suggestion = generateConfigSuggestion(feedbackHistory);
			addMessage({
				type: "system",
				content:
					"This response still isn't meeting expectations. Based on your feedback, I recommend updating the agent's instructions.\n\nYou can **apply the suggestion** below, or go back to **edit the instructions** directly. Once updated, **retest** to verify the agent responds correctly. Repeat this cycle until you're satisfied, then **publish** to make the agent live.",
			});
			addMessage({
				type: "suggestion",
				content: suggestion.message,
				suggestion,
			});
			setPhase("awaiting-suggestion-response");
			setFeedbackHistory([]);
		} else {
			setPhase("awaiting-feedback");
			inputRef.current?.focus();
		}
	};

	const handleSuggestionResponse = (accepted: boolean) => {
		if (accepted) {
			const suggestionIndex = messages.findIndex(
				(m) => m.type === "suggestion" && m.suggestion && !m.suggestion.applied,
			);
			if (suggestionIndex !== -1) {
				const suggestion = messages[suggestionIndex].suggestion;
				if (!suggestion) return;
				setConfig((prev) =>
					prev
						? {
								...prev,
								instructions: `${prev.instructions}\n\n${suggestion.updateValue}`,
							}
						: prev,
				);
				setHasChanges(true);
				setMessages((prev) =>
					prev.map((m, i) =>
						i === suggestionIndex && m.suggestion
							? { ...m, suggestion: { ...m.suggestion, applied: true } }
							: m,
					),
				);
			}
			addMessage({
				type: "system",
				content: "INSTRUCTIONS_UPDATED",
			});
			setShowInstructionsPreview(true);
			setTimeout(() => setShowInstructionsPreview(false), 8000);
		} else {
			addMessage({
				type: "system",
				content:
					"Skipped. You can edit the instructions manually, then retest. When you're happy with the results, publish to go live.",
			});
		}
		setPhase("idle");
	};

	const handleFeedbackSubmit = async () => {
		if (!feedbackInput.trim()) return;

		const feedback = feedbackInput.trim();
		setFeedbackInput("");

		const newFeedbackHistory = [...feedbackHistory, feedback];
		setFeedbackHistory(newFeedbackHistory);

		addMessage({ type: "user-feedback", content: feedback });

		setIsLoading(true);
		setPhase("processing");

		// Laptop Loan demo: treat feedback as a conversational continuation and
		// return the next scripted step instead of the generic responder.
		if (config?.name === "Laptop Loan Assistant") {
			await new Promise((r) => setTimeout(r, 500));
			const scripted = getLaptopLoanScriptedResponse(laptopDemoStep, feedback);
			addMessage({
				type: "agent",
				content: scripted.response,
				sourcesUsed: scripted.sources,
			});
			setLaptopDemoStep((s) => Math.min(s + 1, 5));
			setIsLoading(false);
			setPhase("idle");
			return;
		}

		// TODO: Replace mock with real backend call:
		// await agentChat.sendMessage(feedback);
		// The backend should receive feedbackHistory context so the agent
		// can adjust its response. This could be sent as message metadata:
		// await agentChat.sendMessage(feedback, { feedbackIteration: newFeedbackHistory.length });
		// Remove the setTimeout + generateResponse below.
		await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));

		const { response, sources } = generateResponse(
			currentPrompt,
			config,
			newFeedbackHistory,
		);
		addMessage({
			type: "agent-retry",
			content: response,
			sourcesUsed: sources,
			iterationNumber: newFeedbackHistory.length,
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
		setLaptopDemoStep(0);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			// Bottom input always starts a new test (except during processing or suggestion)
			if (
				input.trim() &&
				phase !== "processing" &&
				phase !== "awaiting-suggestion-response"
			) {
				handleStartTest(input.trim());
				setInput("");
			}
		}
	};

	const handleSend = () => {
		// Bottom input always starts a new test (except during processing or suggestion)
		if (
			input.trim() &&
			phase !== "processing" &&
			phase !== "awaiting-suggestion-response"
		) {
			handleStartTest(input.trim());
			setInput("");
		}
	};

	return (
		<div className="h-screen flex flex-col bg-white">
			{/* Header */}
			<header className="flex items-center justify-between px-6 py-3 border-b bg-white">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
						<ArrowLeft className="size-4" />
					</Button>
					<div className="size-[38px] rounded-lg bg-violet-200 flex items-center justify-center">
						<BotMessageSquare className="size-5" />
					</div>
					<div className="flex items-center gap-2">
						<span className="font-semibold">{config.name}</span>
						<Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
							{t("test.testMode")}
						</Badge>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={handleReset}>
						{t("test.reset")}
					</Button>
					<Button size="sm" onClick={() => setShowPublishDialog(true)}>
						{t("test.publish")}
					</Button>
				</div>
			</header>

			{/* Instructions updated banner */}
			{showInstructionsPreview && config.instructions && (
				<div className="bg-muted/50 border-b border-border px-6 py-2.5 animate-in slide-in-from-top duration-300">
					<div className="max-w-2xl mx-auto flex items-start gap-2.5">
						<div className="size-4 rounded-full bg-foreground flex items-center justify-center shrink-0 mt-0.5">
							<Check className="size-2.5 text-background" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-xs font-medium text-foreground mb-0.5">
								{t("test.instructionsUpdated")}
							</p>
							<p className="text-[11px] text-muted-foreground line-clamp-2 font-mono leading-relaxed whitespace-pre-wrap">
								{config.instructions.slice(-200)}
							</p>
						</div>
						<button
							onClick={() => setShowInstructionsPreview(false)}
							className="text-muted-foreground hover:text-foreground shrink-0"
							aria-label={t("test.dismiss")}
						>
							<X className="size-3.5" />
						</button>
					</div>
				</div>
			)}

			{/* Chat area */}
			<div className="flex-1 overflow-y-auto">
				<div className="bg-neutral-50 h-full flex flex-col">
					<div className="bg-white flex-1 flex flex-col overflow-hidden mx-6 my-6 rounded-lg">
						{/* Chat messages scroll area */}
						<div className="flex-1 overflow-y-auto px-6 py-6">
							<div className="max-w-2xl mx-auto">
								{messages.length === 0 ? (
									/* Empty state */
									<div className="text-center py-12">
										<div className="size-[38px] rounded-lg bg-violet-200 flex items-center justify-center mx-auto mb-4">
											<BotMessageSquare className="size-5" />
										</div>
										<h2 className="text-xl font-semibold">{config.name}</h2>
										<p className="text-muted-foreground mt-1 mb-8">
											{config.description}
										</p>

										{starters.length > 0 && (
											<div className="space-y-2 max-w-md mx-auto">
												<p className="text-sm text-muted-foreground mb-3">
													{t("test.tryPrompt")}
												</p>
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
									/* Messages
									 * TODO: Replace this manual message rendering with ChatV2MessageRenderer:
									 *
									 * <ChatV2MessageRenderer
									 *   chatMessages={agentChat.chatMessages}
									 *   isStreaming={agentChat.isStreaming}
									 *   readOnly={false}
									 *   onCopy={(text) => navigator.clipboard.writeText(text)}
									 * />
									 *
									 * This gives you reasoning accordions, completion cards, sources,
									 * tasks, and all rich metadata rendering for free.
									 * Keep the rating bar + feedback textarea as an overlay below.
									 */
									<div className="flex flex-col gap-2">
										{messages.map((msg) => (
											<div key={msg.id}>
												{/* User message */}
												{msg.type === "user" && (
													<div className="flex justify-end">
														<div className="bg-[#eff6ff] text-foreground rounded-lg px-4 py-3">
															<p className="text-base">{msg.content}</p>
														</div>
													</div>
												)}

												{/* Agent response */}
												{(msg.type === "agent" ||
													msg.type === "agent-retry") && (
													<div className="space-y-2">
														{msg.type === "agent-retry" && (
															<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-[50px]">
																<RefreshCw className="size-2.5" />
																<span>
																	{t("test.revision", {
																		number: msg.iterationNumber,
																	})}
																</span>
															</div>
														)}

														<div className="flex gap-2">
															<div className="flex items-start py-2 shrink-0">
																<div className="size-[38px] rounded-lg bg-violet-200 flex items-center justify-center">
																	<BotMessageSquare className="size-6" />
																</div>
															</div>
															<div className="flex-1 min-w-0 flex flex-col gap-2">
																<p className="text-sm whitespace-pre-wrap leading-normal p-2">
																	{msg.content}
																</p>

																{/* Sources */}
																{msg.sourcesUsed &&
																	msg.sourcesUsed.length > 0 && (
																		<>
																			<button
																				onClick={() =>
																					setExpandedSources(
																						expandedSources === msg.id
																							? null
																							: msg.id,
																					)
																				}
																				className="flex items-center gap-1 bg-white rounded-md px-2 py-0.5"
																			>
																				<ChevronUp
																					className={cn(
																						"size-3 transition-transform",
																						expandedSources === msg.id
																							? ""
																							: "rotate-180",
																					)}
																				/>
																				<span className="text-xs text-foreground">
																					{t("test.sources", {
																						count: msg.sourcesUsed.length,
																					})}
																				</span>
																			</button>
																			{expandedSources === msg.id && (
																				<div className="mt-1.5 space-y-0.5">
																					{msg.sourcesUsed.map((source, i) => (
																						<div
																							key={i}
																							className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
																						>
																							{source.type === "knowledge" ? (
																								<Database className="size-2.5" />
																							) : (
																								<Zap className="size-2.5" />
																							)}
																							{source.name}
																						</div>
																					))}
																				</div>
																			)}
																		</>
																	)}

																{/* Rating bar */}
																{(phase === "awaiting-rating" ||
																	phase === "awaiting-feedback") &&
																	messages[messages.length - 1]?.id ===
																		msg.id && (
																		<div className="space-y-3">
																			<div className="bg-neutral-50 rounded-md p-2 flex items-center gap-3">
																				<span className="text-xs text-foreground">
																					{t("test.rateResponse")}
																				</span>
																				<div className="flex items-center gap-3">
																					<button
																						onClick={() => handleRating("good")}
																						className="flex items-center justify-center text-foreground hover:text-foreground/70 transition-colors"
																						title="Good response"
																					>
																						<ThumbsUp className="size-3" />
																					</button>
																					<button
																						onClick={() => handleRating("poor")}
																						className="flex items-center justify-center text-foreground hover:text-foreground/70 transition-colors"
																						title="Bad response"
																					>
																						<ThumbsDown className="size-3" />
																					</button>
																				</div>
																			</div>

																			{/* Feedback textarea */}
																			{phase === "awaiting-feedback" && (
																				<div className="space-y-2">
																					<textarea
																						value={feedbackInput}
																						onChange={(e) =>
																							setFeedbackInput(e.target.value)
																						}
																						placeholder="Help us improve. What went wrong?"
																						className="w-full h-20 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
																					/>
																					<div className="flex justify-end gap-2">
																						<button
																							onClick={() => {
																								setFeedbackInput("");
																								setPhase("awaiting-rating");
																							}}
																							className="h-8 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
																						>
																							Cancel
																						</button>
																						<button
																							onClick={handleFeedbackSubmit}
																							disabled={!feedbackInput.trim()}
																							className="h-8 px-4 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
																						>
																							Submit
																						</button>
																					</div>
																				</div>
																			)}
																		</div>
																	)}
															</div>
														</div>
													</div>
												)}

												{/* User feedback */}
												{msg.type === "user-feedback" && (
													<div className="flex justify-end">
														<div className="px-4 py-3">
															<p className="text-base italic text-muted-foreground">
																{msg.content}
															</p>
														</div>
													</div>
												)}

												{/* System message */}
												{msg.type === "system" &&
													msg.content !== "INSTRUCTIONS_UPDATED" && (
														<p className="text-[11px] text-muted-foreground text-center py-2">
															{msg.content}
														</p>
													)}
												{msg.type === "system" &&
													msg.content === "INSTRUCTIONS_UPDATED" && (
														<p className="text-[11px] text-muted-foreground text-center py-2">
															Instructions updated
														</p>
													)}

												{/* Suggestion */}
												{msg.type === "suggestion" && msg.suggestion && (
													<div className="flex gap-2.5 items-start w-full">
														<div className="shrink-0 pt-[7px]">
															<Zap className="size-[18px] text-foreground" />
														</div>
														<div className="flex-1 flex flex-col gap-2 min-w-0">
															<div className="flex flex-col gap-1 text-foreground">
																<p className="text-sm font-bold leading-5">
																	Suggested improvement
																</p>
																<p className="text-sm leading-5">
																	{msg.content}
																</p>
															</div>
															<div className="bg-neutral-50 rounded-md px-2 py-2 w-full">
																<div className="flex flex-col gap-2.5">
																	<p className="text-sm text-muted-foreground truncate">
																		INSTRUCTIONS UPDATE
																	</p>
																	<p className="text-sm text-foreground leading-5">
																		{msg.suggestion.updateValue}
																	</p>
																</div>
															</div>
															{msg.suggestion.applied && (
																<>
																	<div className="flex items-center gap-1">
																		<Check className="size-3.5 text-gray-400" />
																		<p className="text-sm italic text-gray-400">
																			Applied
																		</p>
																	</div>
																	<p className="text-sm text-foreground leading-5">
																		Retest to verify the improvement, or publish
																		if you're satisfied.
																	</p>
																	<div className="flex items-center gap-3">
																		<Button
																			variant="secondary"
																			size="sm"
																			className="h-8 text-xs rounded-md shadow-sm"
																			onClick={() => {
																				if (currentPrompt) {
																					handleStartTest(currentPrompt);
																				}
																			}}
																		>
																			Retest prompt
																		</Button>
																		<Button
																			variant="ghost"
																			size="sm"
																			className="h-8 text-xs"
																			onClick={() => inputRef.current?.focus()}
																		>
																			New prompt
																		</Button>
																	</div>
																</>
															)}
															{!msg.suggestion.applied &&
																phase === "awaiting-suggestion-response" && (
																	<div className="flex items-center gap-2">
																		<Button
																			size="sm"
																			onClick={() =>
																				handleSuggestionResponse(true)
																			}
																			className="h-8 text-xs rounded-md shadow-sm"
																		>
																			Apply to Agent Instructions
																		</Button>
																		<Button
																			variant="ghost"
																			size="sm"
																			onClick={() =>
																				handleSuggestionResponse(false)
																			}
																			className="h-8 text-xs"
																		>
																			Skip suggestion
																		</Button>
																	</div>
																)}
														</div>
													</div>
												)}
											</div>
										))}

										{/* Loading */}
										{isLoading && (
											<div className="flex gap-2">
												<div className="flex items-start py-2 shrink-0">
													<div className="size-[38px] rounded-lg bg-violet-200 flex items-center justify-center">
														<BotMessageSquare className="size-6" />
													</div>
												</div>
												<div className="flex items-center gap-2 text-muted-foreground p-2">
													<Loader2 className="size-4 animate-spin" />
												</div>
											</div>
										)}

										<div ref={chatEndRef} />
									</div>
								)}
							</div>
						</div>

						{/* Input - inside the white panel at bottom */}
						<div className="px-6 pb-4">
							<div className="max-w-2xl mx-auto">
								<div className="border rounded-md flex items-center p-3">
									<Textarea
										ref={inputRef}
										value={input}
										onChange={(e) => setInput(e.target.value)}
										onKeyDown={handleKeyDown}
										placeholder="Test another prompt..."
										className="min-h-[27px] max-h-[100px] text-base resize-none border-0 shadow-none focus-visible:ring-0 p-0"
										disabled={
											isLoading || phase === "awaiting-suggestion-response"
										}
									/>
									<Button
										size="icon"
										onClick={handleSend}
										disabled={
											!input.trim() ||
											isLoading ||
											phase === "awaiting-suggestion-response"
										}
										className="size-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0 shadow-sm"
									>
										<SendHorizontal className="size-4" />
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Publish Dialog */}
			<Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							Publish Agent
						</DialogTitle>
						<DialogDescription>
							Publishing will make this agent active and available to be matched
							with real users in this environment.
						</DialogDescription>
					</DialogHeader>

					<div className="py-4">
						<div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
							<div
								className={cn(
									"size-10 rounded-lg flex items-center justify-center",
									color.bg,
								)}
							>
								<Icon className={cn("size-5", color.text)} />
							</div>
							<div>
								<h3 className="font-medium">{config.name}</h3>
								<p className="text-sm text-muted-foreground">
									{config.description}
								</p>
							</div>
						</div>
						{hasChanges && (
							<p className="text-xs text-emerald-600 mt-3">
								✓ Includes improvements from testing
							</p>
						)}
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowPublishDialog(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={() => {
								confetti({
									particleCount: 150,
									spread: 80,
									origin: { y: 0.6 },
								});
								setTimeout(() => {
									navigate("/agents", {
										state: {
											publishedAgent: {
												id: agentId || Date.now().toString(),
												name: config.name,
												description: config.description,
												agentType: config.agentType,
												iconId: config.iconId,
												iconColorId: config.iconColorId,
												skills: config.tools,
											},
										},
									});
								}, 1200);
							}}
						>
							Publish
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{/* Demo mode trigger button */}
			{!demoMode && (
				<button
					type="button"
					onClick={() => {
						setDemoMode(true);
						setDemoStep(0);
						handleReset();
					}}
					className="fixed bottom-4 left-4 z-50 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-full shadow-lg hover:bg-violet-700 transition-colors flex items-center gap-1.5"
				>
					<Zap className="size-3" />
					Demo
				</button>
			)}

			{/* Demo stepper bar */}
			{demoMode && (
				<div className="fixed bottom-0 left-0 right-0 z-50 bg-violet-900 text-white px-6 py-3 flex items-center gap-4 shadow-2xl">
					<div className="flex items-center gap-2">
						<Zap className="size-4" />
						<span className="text-sm font-semibold">Demo</span>
					</div>
					<div className="flex-1 flex items-center gap-1">
						{DEMO_STEPS.map((s, i) => (
							<div
								key={s.label}
								className={cn(
									"flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
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
									{i < demoStep ? "✓" : i + 1}
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
							disabled={isLoading}
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
							Exit
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

// TODO: Replace with real agent execution API call.
// Wire: POST /api/agents/:id/execute { prompt, conversationId, feedbackHistory }
// Response arrives via SSE new_message events (same flow as /chat and /iframe/chat).
// The SSE → conversationStore → groupMessages → ChatMessage[] pipeline is reusable.
/**
 * Scripted multi-turn responses for the Laptop Loan Assistant sales demo.
 * Matches the 5-step flow defined in AgentBuilderPage's DEMO_SCENARIOS:
 *   0 → ask when they need the laptop
 *   1 → ask when they'll return it
 *   2 → ask which laptop
 *   3 → ask delivery method
 *   4 → confirm + request number
 *   5+ → friendly wrap-up
 */
function getLaptopLoanScriptedResponse(
	step: number,
	_input: string,
): {
	response: string;
	sources: { type: "knowledge" | "workflow"; name: string }[];
} {
	switch (step) {
		case 0:
			return {
				response:
					"Happy to help you get a loaner laptop. **What date do you first need the laptop?**",
				sources: [],
			};
		case 1:
			return {
				response: "Got it. **What date will you return it?**",
				sources: [],
			};
		case 2:
			return {
				response:
					"Thanks. **Which laptop would you like?** Here are the options:\n\n• Dell Latitude 7450\n• Dell XPS 13\n• Dell Precision 5680\n• Lenovo ThinkPad X1 Carbon\n• Lenovo ThinkPad T14",
				sources: [],
			};
		case 3:
			return {
				response:
					"Great choice. **How should we deliver it?**\n\n• Mail it to your home address\n• Hand-deliver to your desk at work",
				sources: [],
			};
		case 4: {
			const reqNum = `REQ-LAPTOP-${String(Math.floor(100000 + Math.random() * 900000))}`;
			return {
				response: `All set! I've submitted your loaner laptop request.\n\n**Confirmation number:** ${reqNum}\n\nYou'll get an email once it's processed. Anything else?`,
				sources: [
					{ type: "workflow", name: "Submit temporary Laptop request in ITSM" },
				],
			};
		}
		default:
			return {
				response:
					"Your request is already in — if you need another one, just let me know and I'll start a new request.",
				sources: [],
			};
	}
}

function generateResponse(
	input: string,
	config: AgentConfig,
	feedbackHistory: string[],
): {
	response: string;
	sources: { type: "knowledge" | "workflow"; name: string }[];
} {
	const lowerInput = input.toLowerCase();
	const iteration = feedbackHistory.length;
	const sources: { type: "knowledge" | "workflow"; name: string }[] = [];

	// Check guardrails
	for (const guardrail of config.guardrails) {
		if (guardrail && lowerInput.includes(guardrail.toLowerCase())) {
			return {
				response: `I can't help with questions about ${guardrail}. This is outside my scope.`,
				sources: [],
			};
		}
	}

	// Skill keywords and responses
	const skills: Record<string, { keywords: string[]; responses: string[] }> = {
		password: {
			keywords: ["password", "forgot", "reset password"],
			responses: [
				"I can help with password reset. Let me know if you have questions.",
				"I'll help you reset your password. This takes about 5 minutes. You'll get a confirmation email when done.",
				"Done! Your password has been reset.\n\n• Temporary password sent to your email\n• You'll be prompted to create a new one on first login\n• Link expires in 24 hours",
			],
		},
		unlock: {
			keywords: ["locked", "unlock", "locked out", "can't log in"],
			responses: [
				"I can help unlock your account.",
				"I'll help unlock your account. This usually takes 5-10 minutes.",
				"Done! Your account has been unlocked.\n\n• You can log in now\n• If you forgot your password, let me know\n• Confirmation email sent",
			],
		},
		access: {
			keywords: ["request access", "need access", "permission"],
			responses: [
				"I can help with access requests. What system do you need access to?",
				"I'll help you request access. Which system?\n\n• Salesforce\n• Jira\n• GitHub\n• SharePoint",
				"Access request submitted!\n\n• Request ID: ACC-" +
					Math.floor(10000 + Math.random() * 90000) +
					"\n• Approver notified\n• Typical approval: 1-2 business days",
			],
		},
		expense: {
			keywords: ["expense", "reimbursement", "submit expense"],
			responses: [
				"I can help with expense submissions.",
				"I'll help you submit an expense report.\n\nWhat type?\n• Travel\n• Meals\n• Office supplies",
				"Expense report started!\n\n• Draft ID: EXP-" +
					Math.floor(10000 + Math.random() * 90000) +
					"\n• Upload receipts in the portal\n• Reimbursement: 5-7 business days after approval",
			],
		},
		pto: {
			keywords: ["pto", "time off", "vacation", "days off"],
			responses: [
				"I can check your PTO balance.",
				"Looking up your time off balance...",
				"Here's your PTO balance:\n\n• Vacation: 12 days remaining\n• Sick leave: 5 days remaining\n• Personal: 2 days remaining",
			],
		},
		birthday: {
			keywords: ["birthday", "coworker birthday"],
			responses: [
				"I can look up a coworker's birthday. Whose birthday would you like to find?",
				"I'll look that up. What's their name or email?",
				"Found it! Sarah Johnson's birthday is March 15th.",
			],
		},
		i9: {
			keywords: ["i-9", "i9", "employment verification"],
			responses: [
				"I can check your I-9 status.",
				"Checking your I-9 verification status...",
				"Your I-9 Status: Complete ✓\n\n• Submitted: Jan 15, 2024\n• Verified: Jan 17, 2024",
			],
		},
		background: {
			keywords: ["background check", "background status"],
			responses: [
				"I can check your background check status.",
				"Looking up your background screening status...",
				"Background Check Status: Complete ✓\n\n• Completed: Jan 14, 2024\n• Result: Cleared",
			],
		},
	};

	// Find matching skill
	for (const [skillKey, skillData] of Object.entries(skills)) {
		if (skillData.keywords.some((k) => lowerInput.includes(k))) {
			sources.push({
				type: "workflow",
				name: skillKey.charAt(0).toUpperCase() + skillKey.slice(1),
			});
			const responseIndex = Math.min(iteration, skillData.responses.length - 1);
			return { response: skillData.responses[responseIndex], sources };
		}
	}

	// Knowledge sources
	if (config.knowledgeSources.length > 0) {
		const source = config.knowledgeSources[0];
		sources.push({ type: "knowledge", name: source });

		if (iteration === 0)
			return {
				response: `Based on ${source}, I found information about your question.`,
				sources,
			};
		if (iteration === 1)
			return {
				response: `According to ${source}:\n\nThis is covered in section 3.2. Standard procedures apply.`,
				sources,
			};
		return {
			response: `Here's what I found in ${source}:\n\n**Summary**\nYour question is addressed in our documentation.\n\n**Key points**\n• Standard procedures apply\n• Processing: 2-3 business days`,
			sources,
		};
	}

	// Generic fallback
	const lastFeedback =
		feedbackHistory[feedbackHistory.length - 1]?.toLowerCase() || "";

	if (iteration === 0)
		return {
			response: `Thanks for your question. I'm here to help.`,
			sources: [],
		};

	if (lastFeedback.includes("name") || lastFeedback.includes("ask")) {
		return {
			response: `Of course! Could you tell me more details so I can help?`,
			sources: [],
		};
	}

	if (lastFeedback.includes("helpful") || lastFeedback.includes("not")) {
		return {
			response: `I apologize. Let me be more helpful.\n\nCould you provide more details about what you're looking for?`,
			sources: [],
		};
	}

	return {
		response: `I can help with that. Could you provide more details?`,
		sources: [],
	};
}

// TODO: Replace with LLM-powered suggestion API.
// Wire: POST /api/agents/:id/suggest { feedbackHistory, currentConfig }
// Return shape stays the same: { message, updateType, updateValue }
function generateConfigSuggestion(feedbackHistory: string[]): ConfigSuggestion {
	const allFeedback = feedbackHistory.join(" ").toLowerCase();

	if (
		allFeedback.includes("step") ||
		allFeedback.includes("detail") ||
		allFeedback.includes("how")
	) {
		return {
			message: "Add step-by-step guidance to instructions",
			updateType: "instructions",
			updateValue:
				"Always provide step-by-step instructions when helping users complete tasks. Include numbered steps and expected outcomes.",
		};
	}

	if (
		allFeedback.includes("friendly") ||
		allFeedback.includes("tone") ||
		allFeedback.includes("nicer")
	) {
		return {
			message: "Improve tone in instructions",
			updateType: "instructions",
			updateValue:
				"Use a warm, friendly tone. Acknowledge user concerns with empathy before providing solutions.",
		};
	}

	if (
		allFeedback.includes("helpful") ||
		allFeedback.includes("not") ||
		allFeedback.includes("wrong") ||
		allFeedback.includes("bad")
	) {
		return {
			message: "Make agent more action-oriented",
			updateType: "instructions",
			updateValue:
				"Focus on taking concrete actions to resolve user issues. Don't just acknowledge problems - actively work to fix them.",
		};
	}

	if (
		allFeedback.includes("specific") ||
		allFeedback.includes("vague") ||
		allFeedback.includes("general")
	) {
		return {
			message: "Add specificity to responses",
			updateType: "instructions",
			updateValue:
				"Provide specific, actionable answers. Avoid generic responses. Include concrete details, numbers, and next steps.",
		};
	}

	if (
		allFeedback.includes("short") ||
		allFeedback.includes("brief") ||
		allFeedback.includes("concise")
	) {
		return {
			message: "Keep responses concise",
			updateType: "instructions",
			updateValue:
				"Keep responses brief and to the point. Lead with the answer, then provide supporting details only if needed.",
		};
	}

	// Default suggestion based on multiple poor ratings
	if (feedbackHistory.length >= 2) {
		return {
			message: "Improve response quality based on feedback patterns",
			updateType: "instructions",
			updateValue:
				"When responding: Be specific and actionable. Confirm understanding before proceeding. Provide clear next steps.",
		};
	}

	return {
		message: "Consider adding this guidance based on your feedback.",
		updateType: "instructions",
		updateValue: `When responding: ${feedbackHistory.slice(0, 2).join("; ")}`,
	};
}
