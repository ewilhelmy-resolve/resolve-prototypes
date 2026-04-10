/**
 * ChatV2MessageRenderer.test.tsx - Unit tests for the pure message renderer
 *
 * Tests:
 * - Empty messages
 * - Simple user/assistant messages
 * - Grouped messages with reasoning, text, sources, tasks, completion cards
 * - Mixed conversations
 * - readOnly behavior (copy buttons hidden/shown)
 * - isStreaming prop propagation
 * - Multiple grouped messages
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
	ChatMessage,
	GroupedChatMessage,
	SimpleChatMessage,
} from "@/stores/conversationStore";

// Mock all ai-elements as simple divs to isolate renderer logic
vi.mock("@/components/ai-elements/actions", () => ({
	Actions: ({ children }: any) => <div data-testid="actions">{children}</div>,
	Action: ({ children, onClick }: any) => (
		<button type="button" data-testid="action" onClick={onClick}>
			{children}
		</button>
	),
}));
vi.mock("@/components/ai-elements/message", () => ({
	Message: ({ children, from }: any) => (
		<div data-testid={`message-${from}`}>{children}</div>
	),
	MessageContent: ({ children }: any) => (
		<div data-testid="message-content">{children}</div>
	),
}));
vi.mock("@/components/ai-elements/reasoning", () => ({
	Reasoning: ({ children, isStreaming }: any) => (
		<div data-testid="reasoning" data-streaming={isStreaming}>
			{children}
		</div>
	),
	ReasoningTrigger: ({ title }: any) => (
		<div data-testid="reasoning-trigger">{title}</div>
	),
	ReasoningContent: ({ children }: any) => (
		<div data-testid="reasoning-content">{children}</div>
	),
}));
vi.mock("@/components/ai-elements/response", () => ({
	Response: ({ children }: any) => <div data-testid="response">{children}</div>,
}));
vi.mock("@/components/ai-elements/task", () => ({
	Task: ({ children }: any) => <div data-testid="task">{children}</div>,
	TaskTrigger: ({ title }: any) => (
		<div data-testid="task-trigger">{title}</div>
	),
	TaskContent: ({ children }: any) => (
		<div data-testid="task-content">{children}</div>
	),
	TaskItem: ({ children }: any) => (
		<div data-testid="task-item">{children}</div>
	),
}));
vi.mock("@/components/ai-elements/completion-card", () => ({
	CompletionCard: ({ status, title }: any) => (
		<div data-testid="completion-card" data-status={status}>
			{title}
		</div>
	),
}));
vi.mock("@/components/citations", () => ({
	Citations: () => <div data-testid="citations" />,
}));

// Mock date-utils to avoid locale-dependent output
vi.mock("@/lib/date-utils", () => ({
	formatAbsoluteTime: (date: Date) => `formatted:${date.toISOString()}`,
}));

import { ChatV2MessageRenderer } from "./ChatV2MessageRenderer";

// -- Helper factories --

function makeSimpleMessage(
	overrides: Partial<SimpleChatMessage> = {},
): SimpleChatMessage {
	return {
		id: "simple-1",
		role: "user",
		message: "Hello",
		isGroup: false,
		timestamp: new Date("2025-01-01T12:00:00Z"),
		...overrides,
	};
}

function makeGroupedMessage(
	overrides: Partial<GroupedChatMessage> & {
		parts?: GroupedChatMessage["parts"];
	} = {},
): GroupedChatMessage {
	return {
		id: "group-1",
		role: "assistant",
		isGroup: true,
		timestamp: new Date("2025-01-01T12:00:00Z"),
		parts: [
			{
				id: "part-1",
				message: "Grouped response",
				metadata: {},
			},
		],
		...overrides,
	};
}

// -- Tests --

describe("ChatV2MessageRenderer", () => {
	it("renders nothing when chatMessages is empty", () => {
		const { container } = render(<ChatV2MessageRenderer chatMessages={[]} />);
		expect(container.innerHTML).toBe("");
	});

	it("renders a simple user message", () => {
		const messages: ChatMessage[] = [
			makeSimpleMessage({ id: "u1", role: "user", message: "Hi there" }),
		];

		render(<ChatV2MessageRenderer chatMessages={messages} />);

		expect(screen.getByTestId("message-user")).toBeInTheDocument();
		const response = screen.getByTestId("response");
		expect(response).toHaveTextContent("Hi there");
	});

	it("renders a simple assistant message", () => {
		const messages: ChatMessage[] = [
			makeSimpleMessage({
				id: "a1",
				role: "assistant",
				message: "I can help",
			}),
		];

		render(<ChatV2MessageRenderer chatMessages={messages} />);

		expect(screen.getByTestId("message-assistant")).toBeInTheDocument();
		expect(screen.getByTestId("response")).toHaveTextContent("I can help");
	});

	it("renders grouped message with reasoning only (no actions area)", () => {
		const messages: ChatMessage[] = [
			makeGroupedMessage({
				id: "g1",
				parts: [
					{
						id: "p1",
						message: "",
						metadata: {
							reasoning: {
								content: "Thinking step",
								title: "Thinking...",
							},
						},
					},
				],
			}),
		];

		render(<ChatV2MessageRenderer chatMessages={messages} />);

		expect(screen.getByTestId("reasoning")).toBeInTheDocument();
		expect(screen.getByTestId("reasoning-trigger")).toHaveTextContent(
			"Thinking...",
		);
		expect(screen.getByTestId("reasoning-content")).toHaveTextContent(
			"Thinking step",
		);
		// reasoning-only messages suppress copy/actions area
		expect(screen.queryByTestId("actions")).not.toBeInTheDocument();
	});

	it("renders grouped message with reasoning + text response", () => {
		const messages: ChatMessage[] = [
			makeGroupedMessage({
				id: "g2",
				parts: [
					{
						id: "p1",
						message: "Here is the answer",
						metadata: {
							reasoning: {
								content: "Let me think...",
								title: "Thought for 3s",
							},
						},
					},
				],
			}),
		];

		render(<ChatV2MessageRenderer chatMessages={messages} />);

		expect(screen.getByTestId("reasoning")).toBeInTheDocument();
		expect(screen.getByTestId("reasoning-content")).toHaveTextContent(
			"Let me think...",
		);
		expect(screen.getByTestId("response")).toHaveTextContent(
			"Here is the answer",
		);
	});

	it("renders grouped message with reasoning + text + sources", () => {
		const messages: ChatMessage[] = [
			makeGroupedMessage({
				id: "g3",
				parts: [
					{
						id: "p1",
						message: "Answer with sources",
						metadata: {
							reasoning: {
								content: "Searching...",
								title: "Researching",
							},
							sources: [{ url: "https://example.com", title: "Example" }],
						},
					},
				],
			}),
		];

		render(<ChatV2MessageRenderer chatMessages={messages} />);

		expect(screen.getByTestId("reasoning")).toBeInTheDocument();
		expect(screen.getByTestId("response")).toHaveTextContent(
			"Answer with sources",
		);
		expect(screen.getByTestId("citations")).toBeInTheDocument();
	});

	it("renders grouped message with tasks", () => {
		const messages: ChatMessage[] = [
			makeGroupedMessage({
				id: "g4",
				parts: [
					{
						id: "p1",
						message: "",
						metadata: {
							tasks: [
								{
									title: "Setup steps",
									items: ["Install deps", "Run migrations"],
									defaultOpen: true,
								},
							],
						},
					},
				],
			}),
		];

		render(<ChatV2MessageRenderer chatMessages={messages} />);

		expect(screen.getByTestId("task")).toBeInTheDocument();
		expect(screen.getByTestId("task-trigger")).toHaveTextContent("Setup steps");
		const items = screen.getAllByTestId("task-item");
		expect(items).toHaveLength(2);
		expect(items[0]).toHaveTextContent("Install deps");
		expect(items[1]).toHaveTextContent("Run migrations");
	});

	it("renders grouped message with completion card (skips plain text)", () => {
		const messages: ChatMessage[] = [
			makeGroupedMessage({
				id: "g5",
				parts: [
					{
						id: "p1",
						message: "This text should be skipped",
						metadata: {
							completion: {
								status: "success",
								title: "Ticket Created",
							},
						},
					},
				],
			}),
		];

		render(<ChatV2MessageRenderer chatMessages={messages} />);

		const card = screen.getByTestId("completion-card");
		expect(card).toBeInTheDocument();
		expect(card).toHaveTextContent("Ticket Created");
		expect(card).toHaveAttribute("data-status", "success");
		// plain text is suppressed when completion metadata is present
		expect(screen.queryByTestId("response")).not.toBeInTheDocument();
	});

	it("renders mixed conversation in correct order", () => {
		const messages: ChatMessage[] = [
			makeSimpleMessage({
				id: "u1",
				role: "user",
				message: "First question",
			}),
			makeGroupedMessage({
				id: "g1",
				role: "assistant",
				parts: [
					{
						id: "p1",
						message: "First answer",
						metadata: {
							reasoning: {
								content: "Analyzing...",
								title: "Thinking",
							},
						},
					},
				],
			}),
			makeSimpleMessage({
				id: "u2",
				role: "user",
				message: "Follow-up",
			}),
			makeGroupedMessage({
				id: "g2",
				role: "assistant",
				parts: [
					{
						id: "p2",
						message: "",
						metadata: {
							tasks: [
								{
									title: "Action items",
									items: ["Do this"],
								},
							],
						},
					},
				],
			}),
		];

		render(<ChatV2MessageRenderer chatMessages={messages} />);

		const userMessages = screen.getAllByTestId("message-user");
		const assistantMessages = screen.getAllByTestId("message-assistant");
		expect(userMessages).toHaveLength(2);
		expect(assistantMessages).toHaveLength(2);

		// First assistant has reasoning
		const firstAssistant = assistantMessages[0];
		expect(within(firstAssistant).getByTestId("reasoning")).toBeInTheDocument();

		// Second assistant has tasks
		const secondAssistant = assistantMessages[1];
		expect(within(secondAssistant).getByTestId("task")).toBeInTheDocument();
	});

	describe("readOnly behavior", () => {
		it("does not render copy actions when readOnly=true", () => {
			const messages: ChatMessage[] = [
				makeSimpleMessage({
					id: "a1",
					role: "assistant",
					message: "Copyable text",
				}),
			];

			render(
				<ChatV2MessageRenderer
					chatMessages={messages}
					readOnly={true}
					onCopy={vi.fn()}
				/>,
			);

			expect(screen.queryByTestId("actions")).not.toBeInTheDocument();
		});

		it("renders copy actions when readOnly=false and onCopy provided", () => {
			const messages: ChatMessage[] = [
				makeSimpleMessage({
					id: "a1",
					role: "assistant",
					message: "Copyable text",
				}),
			];

			render(
				<ChatV2MessageRenderer
					chatMessages={messages}
					readOnly={false}
					onCopy={vi.fn()}
				/>,
			);

			expect(screen.getByTestId("actions")).toBeInTheDocument();
		});

		it("does not render copy actions for grouped reasoning-only even when readOnly=false", () => {
			const messages: ChatMessage[] = [
				makeGroupedMessage({
					id: "g1",
					parts: [
						{
							id: "p1",
							message: "",
							metadata: {
								reasoning: {
									content: "Thinking...",
									title: "Thought",
								},
							},
						},
					],
				}),
			];

			render(
				<ChatV2MessageRenderer
					chatMessages={messages}
					readOnly={false}
					onCopy={vi.fn()}
				/>,
			);

			// reasoning-only hides the actions area entirely
			expect(screen.queryByTestId("actions")).not.toBeInTheDocument();
		});

		it("renders copy actions for grouped assistant message with text when readOnly=false", () => {
			const messages: ChatMessage[] = [
				makeGroupedMessage({
					id: "g1",
					role: "assistant",
					parts: [
						{
							id: "p1",
							message: "Some real content",
							metadata: {},
						},
					],
				}),
			];

			render(
				<ChatV2MessageRenderer
					chatMessages={messages}
					readOnly={false}
					onCopy={vi.fn()}
				/>,
			);

			expect(screen.getByTestId("actions")).toBeInTheDocument();
		});
	});

	describe("isStreaming prop", () => {
		it("passes isStreaming to last assistant message when streaming", () => {
			const messages: ChatMessage[] = [
				makeSimpleMessage({
					id: "u1",
					role: "user",
					message: "Question",
				}),
				makeGroupedMessage({
					id: "g1",
					role: "assistant",
					parts: [
						{
							id: "p1",
							message: "",
							metadata: {
								reasoning: {
									content: "Working...",
									title: "Thinking",
								},
							},
						},
					],
				}),
			];

			render(
				<ChatV2MessageRenderer chatMessages={messages} isStreaming={true} />,
			);

			const reasoning = screen.getByTestId("reasoning");
			expect(reasoning).toHaveAttribute("data-streaming", "true");
		});

		it("does not pass isStreaming to non-last assistant messages", () => {
			const messages: ChatMessage[] = [
				makeGroupedMessage({
					id: "g1",
					role: "assistant",
					parts: [
						{
							id: "p1",
							message: "",
							metadata: {
								reasoning: {
									content: "First thought",
									title: "Thinking",
								},
							},
						},
					],
				}),
				makeSimpleMessage({
					id: "u1",
					role: "user",
					message: "Follow-up",
				}),
			];

			render(
				<ChatV2MessageRenderer chatMessages={messages} isStreaming={true} />,
			);

			// The assistant is not the last message, so isStreaming should be false
			const reasoning = screen.getByTestId("reasoning");
			expect(reasoning).toHaveAttribute("data-streaming", "false");
		});

		it("does not set isStreaming when isStreaming prop is false", () => {
			const messages: ChatMessage[] = [
				makeGroupedMessage({
					id: "g1",
					role: "assistant",
					parts: [
						{
							id: "p1",
							message: "",
							metadata: {
								reasoning: {
									content: "Done",
									title: "Thought",
								},
							},
						},
					],
				}),
			];

			render(
				<ChatV2MessageRenderer chatMessages={messages} isStreaming={false} />,
			);

			const reasoning = screen.getByTestId("reasoning");
			expect(reasoning).toHaveAttribute("data-streaming", "false");
		});
	});

	it("renders multiple grouped messages independently", () => {
		const messages: ChatMessage[] = [
			makeGroupedMessage({
				id: "g1",
				role: "assistant",
				parts: [
					{
						id: "p1",
						message: "First grouped response",
						metadata: {
							reasoning: {
								content: "Step 1",
								title: "First thought",
							},
						},
					},
				],
			}),
			makeGroupedMessage({
				id: "g2",
				role: "assistant",
				parts: [
					{
						id: "p2",
						message: "",
						metadata: {
							completion: {
								status: "error",
								title: "Something failed",
							},
						},
					},
				],
			}),
		];

		render(<ChatV2MessageRenderer chatMessages={messages} />);

		const assistantMessages = screen.getAllByTestId("message-assistant");
		expect(assistantMessages).toHaveLength(2);

		// First grouped message has reasoning + response
		const first = assistantMessages[0];
		expect(within(first).getByTestId("reasoning")).toBeInTheDocument();
		expect(within(first).getByTestId("response")).toHaveTextContent(
			"First grouped response",
		);

		// Second grouped message has completion card
		const second = assistantMessages[1];
		const card = within(second).getByTestId("completion-card");
		expect(card).toHaveAttribute("data-status", "error");
		expect(card).toHaveTextContent("Something failed");
	});
});
