/**
 * Phase 0b: Baseline tests for message rendering behavior.
 *
 * Captures current groupMessages() logic and ChatV1Content rendering
 * BEFORE any refactoring. These serve as regression guards.
 */

import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type GroupedChatMessage,
	groupMessages,
	type Message,
	type SimpleChatMessage,
} from "@/stores/conversationStore";

// ---------------------------------------------------------------------------
// Mocks shared by ChatV1Content snapshot tests
// ---------------------------------------------------------------------------

let mockChatMessages: any[] = [];

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/hooks/api/useProfile", () => ({
	useProfilePermissions: vi.fn(() => ({
		isOwnerOrAdmin: () => false,
		hasRole: vi.fn(),
		isOwner: vi.fn(),
		isAdmin: vi.fn(),
		canManageInvitations: vi.fn(),
		canManageMembers: vi.fn(),
		canManageOrganization: vi.fn(),
		canDeleteConversations: vi.fn(),
		canManageFiles: vi.fn(),
	})),
}));

vi.mock("@/hooks/useDragAndDrop", () => ({
	useDragAndDrop: vi.fn(() => ({ isDragging: false, enabled: false })),
}));

vi.mock("@/hooks/api/useFiles", () => ({
	useFiles: vi.fn(() => ({ data: { documents: [] }, isLoading: false })),
	useUploadFile: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/stores/conversationStore", async () => {
	const actual = await vi.importActual("@/stores/conversationStore");
	return {
		...actual,
		useConversationStore: vi.fn(() => ({
			chatMessages: mockChatMessages,
			currentConversationId: "test-conv-id",
		})),
	};
});

vi.mock("@/hooks/useChatPagination", () => ({
	useChatPagination: vi.fn(() => ({
		displayedMessages: [],
		hasMore: false,
		isLoading: false,
		loadMore: vi.fn(),
		containerRef: { current: null },
	})),
}));

vi.mock("@/components/citations", () => ({
	Citations: ({ children }: any) => (
		<div data-testid="citations">{children}</div>
	),
}));

vi.mock("@/hooks/useKnowledgeBase", () => ({
	useKnowledgeBase: () => ({
		openDocumentSelector: vi.fn(),
		files: [],
		filesLoading: false,
		totalFiles: 0,
		documentInputRef: { current: null },
		handleDocumentUpload: vi.fn(),
		isUploading: false,
		isError: false,
		isSuccess: false,
		error: null,
		uploadingFiles: new Set(),
		navigateToKnowledgeArticles: vi.fn(),
		navigateToFiles: vi.fn(),
	}),
}));

vi.mock("@/hooks/useConversations", () => ({
	useConversations: vi.fn(() => ({
		conversations: [],
		conversationsLoading: false,
	})),
}));

vi.mock("@/hooks/useUser", () => ({
	useUser: vi.fn(() => ({
		user: { id: "test-user", username: "testuser" },
	})),
}));

vi.mock("@/hooks/useFeatureFlags", () => ({
	useFeatureFlag: vi.fn(() => false),
}));

vi.mock("../ResponseWithInlineCitations", () => ({
	ResponseWithInlineCitations: ({ children }: any) => (
		<div data-testid="inline-citations">{children}</div>
	),
}));

vi.mock("../DragDropOverlay", () => ({
	DragDropOverlay: () => null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(overrides: Partial<Message>): Message {
	return {
		id: `msg-${Math.random().toString(36).slice(2, 8)}`,
		role: "assistant",
		message: "",
		timestamp: new Date("2025-01-01T00:00:00Z"),
		conversation_id: "conv-1",
		status: "completed",
		...overrides,
	};
}

// ===================================================================
// 1. groupMessages() — diverse message scenarios
// ===================================================================

describe("groupMessages", () => {
	describe("mixed message types in a single response group", () => {
		it("groups user text, assistant reasoning, assistant text+sources, assistant tasks", () => {
			const messages: Message[] = [
				makeMessage({
					id: "u1",
					role: "user",
					message: "How do I reset my password?",
					status: "sent",
				}),
				makeMessage({
					id: "a1",
					message: "",
					response_group_id: "grp-1",
					timestamp: new Date("2025-01-01T00:00:01Z"),
					metadata: { reasoning: { content: "Checking docs..." } },
				}),
				makeMessage({
					id: "a2",
					message: "Here are the steps to reset your password.",
					response_group_id: "grp-1",
					timestamp: new Date("2025-01-01T00:00:02Z"),
					metadata: {
						sources: [
							{
								url: "https://docs.example.com/reset",
								title: "Password Reset Guide",
							},
						],
					},
				}),
				makeMessage({
					id: "a3",
					message: "",
					response_group_id: "grp-1",
					timestamp: new Date("2025-01-01T00:00:03Z"),
					metadata: {
						tasks: [
							{
								title: "Reset steps",
								items: ["Go to settings", "Click reset", "Check email"],
							},
						],
					},
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(2);

			const userMsg = result[0] as SimpleChatMessage;
			expect(userMsg.isGroup).toBe(false);
			expect(userMsg.role).toBe("user");

			const grouped = result[1] as GroupedChatMessage;
			expect(grouped.isGroup).toBe(true);
			expect(grouped.id).toBe("grp-1");
			expect(grouped.parts.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("standalone messages with metadata become GroupedChatMessage", () => {
		it("wraps a standalone message with reasoning as isGroup: true", () => {
			const messages: Message[] = [
				makeMessage({
					id: "s1",
					metadata: { reasoning: { content: "Thinking..." } },
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(true);
			const grouped = result[0] as GroupedChatMessage;
			expect(grouped.parts).toHaveLength(1);
			expect(grouped.parts[0].metadata.reasoning.content).toBe("Thinking...");
		});

		it("wraps a standalone message with sources as isGroup: true", () => {
			const messages: Message[] = [
				makeMessage({
					id: "s2",
					message: "Here is info.",
					metadata: {
						sources: [{ url: "https://example.com", title: "Example" }],
					},
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(true);
		});

		it("wraps a standalone message with tasks as isGroup: true", () => {
			const messages: Message[] = [
				makeMessage({
					id: "s3",
					metadata: {
						tasks: [{ title: "TODO", items: ["item 1"] }],
					},
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(true);
		});

		it("wraps a standalone message with files as isGroup: true", () => {
			const messages: Message[] = [
				makeMessage({
					id: "s4",
					metadata: {
						files: [
							{
								url: "https://cdn.example.com/f.pdf",
								mediaType: "application/pdf",
							},
						],
					},
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(true);
		});
	});

	describe("standalone messages without metadata become SimpleChatMessage", () => {
		it("returns isGroup: false for plain text user message", () => {
			const messages: Message[] = [
				makeMessage({
					id: "p1",
					role: "user",
					message: "Hello",
					status: "sent",
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(false);
			expect((result[0] as SimpleChatMessage).message).toBe("Hello");
		});

		it("returns isGroup: false for plain text assistant message", () => {
			const messages: Message[] = [
				makeMessage({ id: "p2", message: "Hi there!" }),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(false);
			expect((result[0] as SimpleChatMessage).message).toBe("Hi there!");
		});

		it("returns isGroup: false when metadata has no rich fields", () => {
			const messages: Message[] = [
				makeMessage({
					id: "p3",
					message: "Done",
					metadata: { turn_complete: true },
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(false);
		});
	});

	describe("messages with response_group_id are grouped together", () => {
		it("groups messages sharing the same response_group_id", () => {
			const messages: Message[] = [
				makeMessage({
					id: "g1",
					response_group_id: "grp-A",
					message: "Part 1",
					timestamp: new Date("2025-01-01T00:00:00Z"),
				}),
				makeMessage({
					id: "g2",
					response_group_id: "grp-A",
					message: "Part 2",
					timestamp: new Date("2025-01-01T00:00:01Z"),
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].isGroup).toBe(true);
			expect((result[0] as GroupedChatMessage).parts).toHaveLength(2);
		});

		it("keeps separate groups for different response_group_ids", () => {
			const messages: Message[] = [
				makeMessage({
					id: "g1",
					response_group_id: "grp-A",
					message: "A",
					timestamp: new Date("2025-01-01T00:00:00Z"),
				}),
				makeMessage({
					id: "g2",
					response_group_id: "grp-B",
					message: "B",
					timestamp: new Date("2025-01-01T00:00:01Z"),
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("grp-A");
			expect(result[1].id).toBe("grp-B");
		});
	});

	describe("timestamp ordering within groups", () => {
		it("sorts parts by timestamp ascending regardless of input order", () => {
			const messages: Message[] = [
				makeMessage({
					id: "late",
					response_group_id: "grp-T",
					message: "Second",
					timestamp: new Date("2025-01-01T00:00:05Z"),
				}),
				makeMessage({
					id: "early",
					response_group_id: "grp-T",
					message: "First",
					timestamp: new Date("2025-01-01T00:00:01Z"),
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(1);
			const grouped = result[0] as GroupedChatMessage;
			expect(grouped.parts[0].id).toBe("early");
			expect(grouped.parts[1].id).toBe("late");
		});
	});

	describe("interleaved grouped and standalone messages", () => {
		it("preserves order: standalone, grouped, standalone", () => {
			const messages: Message[] = [
				makeMessage({
					id: "s1",
					role: "user",
					message: "Question 1",
					status: "sent",
					timestamp: new Date("2025-01-01T00:00:00Z"),
				}),
				makeMessage({
					id: "g1",
					response_group_id: "grp-1",
					message: "Grouped part 1",
					timestamp: new Date("2025-01-01T00:00:01Z"),
				}),
				makeMessage({
					id: "g2",
					response_group_id: "grp-1",
					message: "Grouped part 2",
					timestamp: new Date("2025-01-01T00:00:02Z"),
				}),
				makeMessage({
					id: "s2",
					role: "user",
					message: "Question 2",
					status: "sent",
					timestamp: new Date("2025-01-01T00:00:03Z"),
				}),
			];

			const result = groupMessages(messages);

			expect(result).toHaveLength(3);
			expect(result[0].isGroup).toBe(false);
			expect(result[1].isGroup).toBe(true);
			expect(result[2].isGroup).toBe(false);
		});
	});
});

// ===================================================================
// 2. ChatV1Content snapshot tests
// ===================================================================

describe("ChatV1Content rendering", () => {
	let ChatV1Content: typeof import("../ChatV1Content").default;
	let createProps: () => import("../ChatV1Content").ChatV1ContentProps;

	beforeEach(async () => {
		vi.clearAllMocks();
		mockChatMessages = [];

		const mod = await import("../ChatV1Content");
		ChatV1Content = mod.default;

		createProps = () => ({
			messages: [],
			messagesLoading: false,
			isSending: false,
			currentConversationId: null,
			messageValue: "",
			handleSendMessage: vi.fn(),
			handleMessageChange: vi.fn(),
			handleFileUpload: vi.fn(),
			uploadStatus: { isUploading: false, isError: false, isSuccess: false },
			fileInputRef: { current: null },
		});
	});

	function renderChat(
		propOverrides: Partial<import("../ChatV1Content").ChatV1ContentProps> = {},
	) {
		const props = { ...createProps(), ...propOverrides };
		return render(
			<MemoryRouter>
				<ChatV1Content {...props} />
			</MemoryRouter>,
		);
	}

	describe("empty conversation", () => {
		it("renders without messages", () => {
			const { container } = renderChat();
			expect(container).toMatchSnapshot();
		});
	});

	describe("simple text exchange", () => {
		it("renders user + assistant plain text", () => {
			mockChatMessages = [
				{
					id: "u1",
					role: "user",
					message: "What is Kubernetes?",
					isGroup: false,
					timestamp: new Date("2025-01-01T00:00:00Z"),
				} satisfies SimpleChatMessage,
				{
					id: "a1",
					role: "assistant",
					message: "Kubernetes is a container orchestration platform.",
					isGroup: false,
					timestamp: new Date("2025-01-01T00:00:01Z"),
				} satisfies SimpleChatMessage,
			];

			const { container } = renderChat({
				currentConversationId: "conv-1",
				messages: [
					{
						id: "u1",
						role: "user",
						message: "What is Kubernetes?",
						timestamp: Date.now() - 1000,
						status: "sent",
						conversationId: "conv-1",
					},
					{
						id: "a1",
						role: "assistant",
						message: "Kubernetes is a container orchestration platform.",
						timestamp: Date.now(),
						status: "sent",
						conversationId: "conv-1",
						metadata: { turn_complete: true },
					},
				],
			});

			expect(container).toMatchSnapshot();
		});
	});

	describe("assistant message with reasoning accordion", () => {
		it("renders reasoning-only grouped message", () => {
			mockChatMessages = [
				{
					id: "grp-r",
					role: "assistant",
					isGroup: true,
					timestamp: new Date("2025-01-01T00:00:00Z"),
					parts: [
						{
							id: "r1",
							message: "",
							metadata: {
								reasoning: {
									content: "Let me think about this step by step...",
									title: "Research & Analysis",
								},
							},
						},
					],
				} satisfies GroupedChatMessage,
			];

			const { container } = renderChat({
				currentConversationId: "conv-1",
				messages: [
					{
						id: "r1",
						role: "assistant",
						message: "",
						timestamp: Date.now(),
						status: "completed",
						conversationId: "conv-1",
						metadata: {
							reasoning: {
								content: "Let me think about this step by step...",
								title: "Research & Analysis",
							},
						},
					},
				],
			});

			expect(container).toMatchSnapshot();
		});
	});

	describe("assistant message with reasoning + text + sources", () => {
		it("renders full multi-part response", () => {
			mockChatMessages = [
				{
					id: "grp-full",
					role: "assistant",
					isGroup: true,
					timestamp: new Date("2025-01-01T00:00:00Z"),
					parts: [
						{
							id: "f1",
							message: "Based on the documentation, here is the answer.",
							metadata: {
								reasoning: {
									content:
										"Checking KB articles for password reset procedures.",
									title: "Planning",
								},
							},
						},
						{
							id: "f2",
							message: "",
							metadata: {
								sources: [
									{
										url: "https://kb.example.com/reset",
										title: "Password Reset",
										snippet: "Steps to reset your password...",
									},
								],
							},
						},
					],
				} satisfies GroupedChatMessage,
			];

			const { container } = renderChat({
				currentConversationId: "conv-1",
				messages: [
					{
						id: "f1",
						role: "assistant",
						message: "Based on the documentation, here is the answer.",
						timestamp: Date.now(),
						status: "completed",
						conversationId: "conv-1",
						metadata: {
							reasoning: {
								content: "Checking KB articles for password reset procedures.",
								title: "Planning",
							},
							turn_complete: true,
						},
					},
				],
			});

			expect(container).toMatchSnapshot();
		});
	});

	describe("assistant message with tasks", () => {
		it("renders task accordion", () => {
			mockChatMessages = [
				{
					id: "grp-tasks",
					role: "assistant",
					isGroup: true,
					timestamp: new Date("2025-01-01T00:00:00Z"),
					parts: [
						{
							id: "t1",
							message: "",
							metadata: {
								tasks: [
									{
										title: "Prerequisites",
										items: ["Install Node.js", "Install pnpm"],
										defaultOpen: true,
									},
									{
										title: "Setup",
										items: ["Clone repo", "Run pnpm install", "Run pnpm dev"],
									},
								],
							},
						},
					],
				} satisfies GroupedChatMessage,
			];

			const { container } = renderChat({
				currentConversationId: "conv-1",
				messages: [
					{
						id: "t1",
						role: "assistant",
						message: "",
						timestamp: Date.now(),
						status: "completed",
						conversationId: "conv-1",
						metadata: {
							tasks: [
								{
									title: "Prerequisites",
									items: ["Install Node.js", "Install pnpm"],
									defaultOpen: true,
								},
								{
									title: "Setup",
									items: ["Clone repo", "Run pnpm install", "Run pnpm dev"],
								},
							],
							turn_complete: true,
						},
					},
				],
			});

			expect(container).toMatchSnapshot();
		});
	});

	describe("full mixed conversation", () => {
		it("renders user text, assistant reasoning, assistant text+sources, user text, assistant tasks", () => {
			mockChatMessages = [
				{
					id: "u1",
					role: "user",
					message: "How do I set up the project?",
					isGroup: false,
					timestamp: new Date("2025-01-01T00:00:00Z"),
				} satisfies SimpleChatMessage,
				{
					id: "grp-mix",
					role: "assistant",
					isGroup: true,
					timestamp: new Date("2025-01-01T00:00:01Z"),
					parts: [
						{
							id: "m1",
							message: "Here is how to set up the project.",
							metadata: {
								reasoning: {
									content: "Looking up setup documentation...",
									title: "Research",
								},
							},
						},
						{
							id: "m2",
							message: "",
							metadata: {
								sources: [
									{
										url: "https://docs.example.com/setup",
										title: "Setup Guide",
									},
								],
							},
						},
					],
				} satisfies GroupedChatMessage,
				{
					id: "u2",
					role: "user",
					message: "Can you break that down into tasks?",
					isGroup: false,
					timestamp: new Date("2025-01-01T00:00:02Z"),
				} satisfies SimpleChatMessage,
				{
					id: "grp-tasks",
					role: "assistant",
					isGroup: true,
					timestamp: new Date("2025-01-01T00:00:03Z"),
					parts: [
						{
							id: "m3",
							message: "",
							metadata: {
								tasks: [
									{
										title: "Environment",
										items: ["Install deps", "Configure .env"],
									},
									{ title: "Run", items: ["pnpm dev"] },
								],
							},
						},
					],
				} satisfies GroupedChatMessage,
			];

			const { container } = renderChat({
				currentConversationId: "conv-1",
				messages: [
					{
						id: "u1",
						role: "user",
						message: "How do I set up the project?",
						timestamp: Date.now() - 3000,
						status: "sent",
						conversationId: "conv-1",
					},
					{
						id: "m1",
						role: "assistant",
						message: "Here is how to set up the project.",
						timestamp: Date.now() - 2000,
						status: "completed",
						conversationId: "conv-1",
						metadata: {
							reasoning: {
								content: "Looking up setup documentation...",
								title: "Research",
							},
							turn_complete: true,
						},
					},
					{
						id: "u2",
						role: "user",
						message: "Can you break that down into tasks?",
						timestamp: Date.now() - 1000,
						status: "sent",
						conversationId: "conv-1",
					},
					{
						id: "m3",
						role: "assistant",
						message: "",
						timestamp: Date.now(),
						status: "completed",
						conversationId: "conv-1",
						metadata: {
							tasks: [
								{
									title: "Environment",
									items: ["Install deps", "Configure .env"],
								},
								{ title: "Run", items: ["pnpm dev"] },
							],
							turn_complete: true,
						},
					},
				],
			});

			expect(container).toMatchSnapshot();
		});
	});
});
