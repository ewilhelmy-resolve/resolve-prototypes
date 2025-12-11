/**
 * ChatV1Page.test.tsx - Unit tests for ChatV1Page
 *
 * Tests the modern chat page that:
 * - Syncs URL parameters with conversation store
 * - Handles SSE real-time message updates
 * - Integrates RitaLayout with ChatV1Content
 * - Manages conversation state via useRitaChat
 * - Responds to route parameter changes
 */

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatV1Page from "./ChatV1Page";

// Mock all dependencies
vi.mock("../contexts/SSEContext", () => ({
	SSEProvider: ({ children }: any) => children,
	useSSEContext: vi.fn(() => ({
		latestUpdate: null,
		connectionState: "open",
	})),
}));

vi.mock("../stores/conversationStore", () => ({
	useConversationStore: vi.fn(() => ({
		updateMessage: vi.fn(),
		setCurrentConversation: vi.fn(),
		clearCurrentConversation: vi.fn(),
		currentConversationId: null,
		messages: [],
	})),
}));

vi.mock("../hooks/useRitaChat", () => ({
	useRitaChat: vi.fn(() => ({
		conversations: [],
		currentConversationId: null,
		conversationsLoading: false,
		filteredConversations: [],
		messages: [],
		messagesLoading: false,
		isSending: false,
		searchValue: "",
		messageValue: "",
		handleNewChat: vi.fn(),
		handleConversationClick: vi.fn(),
		handleSendMessage: vi.fn(),
		handleSearchChange: vi.fn(),
		handleMessageChange: vi.fn(),
		handleKeyPress: vi.fn(),
		handleFileUpload: vi.fn(),
		openFileSelector: vi.fn(),
		uploadStatus: {
			isUploading: false,
			isError: false,
			isSuccess: false,
		},
		handleDocumentUpload: vi.fn(),
		openDocumentSelector: vi.fn(),
		navigateToKnowledgeArticles: vi.fn(),
		navigateToFiles: vi.fn(),
		documentUploadStatus: {
			isUploading: false,
			isError: false,
			isSuccess: false,
		},
		knowledgeBaseFiles: [],
		knowledgeBaseFilesLoading: false,
		totalKnowledgeBaseFiles: 0,
		fileInputRef: { current: null },
		documentInputRef: { current: null },
		messagesEndRef: { current: null },
	})),
}));

vi.mock("../components/layouts/RitaLayout", () => ({
	default: ({ children, activePage }: any) => (
		<div data-testid="rita-layout" data-active-page={activePage}>
			<div data-testid="layout-content">{children}</div>
		</div>
	),
}));

vi.mock("../components/chat/ChatV1Content", () => ({
	default: (props: any) => (
		<div data-testid="chat-content">
			<span data-testid="current-conversation-id">
				{props.currentConversationId || "none"}
			</span>
			<span data-testid="message-count">{props.messages?.length || 0}</span>
		</div>
	),
}));

// Test wrapper with router
function TestWrapper({
	children,
	initialEntries = ["/chat"],
}: {
	children: React.ReactNode;
	initialEntries?: string[];
}) {
	return (
		<MemoryRouter initialEntries={initialEntries}>
			<Routes>
				<Route path="/chat" element={children} />
				<Route path="/chat/:conversationId" element={children} />
			</Routes>
		</MemoryRouter>
	);
}

describe("ChatV1Page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Page Structure", () => {
		it("renders RitaLayout with chat active page", () => {
			render(
				<TestWrapper>
					<ChatV1Page />
				</TestWrapper>,
			);

			const layout = screen.getByTestId("rita-layout");
			expect(layout).toBeInTheDocument();
			expect(layout.getAttribute("data-active-page")).toBe("chat");
		});

		it("renders ChatV1Content within layout", () => {
			render(
				<TestWrapper>
					<ChatV1Page />
				</TestWrapper>,
			);

			expect(screen.getByTestId("layout-content")).toBeInTheDocument();
			expect(screen.getByTestId("chat-content")).toBeInTheDocument();
		});

		it("passes rita chat state to ChatV1Content", () => {
			render(
				<TestWrapper>
					<ChatV1Page />
				</TestWrapper>,
			);

			// Verify ChatV1Content receives the state
			expect(screen.getByTestId("chat-content")).toBeInTheDocument();
			expect(screen.getByTestId("current-conversation-id").textContent).toBe(
				"none",
			);
			expect(screen.getByTestId("message-count").textContent).toBe("0");
		});
	});

	describe("URL Parameter Sync", () => {
		it("syncs conversationId from URL to store on mount", async () => {
			const mockSetCurrentConversation = vi.fn();
			const { useConversationStore } = await import(
				"../stores/conversationStore"
			);

			vi.mocked(useConversationStore).mockReturnValue({
				updateMessage: vi.fn(),
				setCurrentConversation: mockSetCurrentConversation,
				clearCurrentConversation: vi.fn(),
				currentConversationId: null,
				messages: [],
			} as any);

			const { useRitaChat } = await import("../hooks/useRitaChat");
			vi.mocked(useRitaChat).mockReturnValue({
				currentConversationId: null,
				conversations: [],
				conversationsLoading: false,
				filteredConversations: [],
				messages: [],
				messagesLoading: false,
				isSending: false,
				searchValue: "",
				messageValue: "",
				handleNewChat: vi.fn(),
				handleConversationClick: vi.fn(),
				handleSendMessage: vi.fn(),
				handleSearchChange: vi.fn(),
				handleMessageChange: vi.fn(),
				handleKeyPress: vi.fn(),
				handleFileUpload: vi.fn(),
				openFileSelector: vi.fn(),
				uploadStatus: {
					isUploading: false,
					isError: false,
					isSuccess: false,
				},
				handleDocumentUpload: vi.fn(),
				openDocumentSelector: vi.fn(),
				navigateToKnowledgeArticles: vi.fn(),
				navigateToFiles: vi.fn(),
				documentUploadStatus: {
					isUploading: false,
					isError: false,
					isSuccess: false,
				},
				knowledgeBaseFiles: [],
				knowledgeBaseFilesLoading: false,
				totalKnowledgeBaseFiles: 0,
				fileInputRef: { current: null },
				documentInputRef: { current: null },
				messagesEndRef: { current: null },
			} as any);

			render(
				<TestWrapper initialEntries={["/chat/conv-123"]}>
					<ChatV1Page />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(mockSetCurrentConversation).toHaveBeenCalledWith("conv-123");
			});
		});

		it("clears conversation when navigating to root chat page", async () => {
			const mockSetCurrentConversation = vi.fn();
			const { useConversationStore } = await import(
				"../stores/conversationStore"
			);

			vi.mocked(useConversationStore).mockReturnValue({
				updateMessage: vi.fn(),
				setCurrentConversation: mockSetCurrentConversation,
				clearCurrentConversation: vi.fn(),
				currentConversationId: "conv-123",
				messages: [],
			} as any);

			const { useRitaChat } = await import("../hooks/useRitaChat");
			vi.mocked(useRitaChat).mockReturnValue({
				currentConversationId: "conv-123",
				conversations: [],
				conversationsLoading: false,
				filteredConversations: [],
				messages: [],
				messagesLoading: false,
				isSending: false,
				searchValue: "",
				messageValue: "",
				handleNewChat: vi.fn(),
				handleConversationClick: vi.fn(),
				handleSendMessage: vi.fn(),
				handleSearchChange: vi.fn(),
				handleMessageChange: vi.fn(),
				handleKeyPress: vi.fn(),
				handleFileUpload: vi.fn(),
				openFileSelector: vi.fn(),
				uploadStatus: {
					isUploading: false,
					isError: false,
					isSuccess: false,
				},
				handleDocumentUpload: vi.fn(),
				openDocumentSelector: vi.fn(),
				navigateToKnowledgeArticles: vi.fn(),
				navigateToFiles: vi.fn(),
				documentUploadStatus: {
					isUploading: false,
					isError: false,
					isSuccess: false,
				},
				knowledgeBaseFiles: [],
				knowledgeBaseFilesLoading: false,
				totalKnowledgeBaseFiles: 0,
				fileInputRef: { current: null },
				documentInputRef: { current: null },
				messagesEndRef: { current: null },
			} as any);

			render(
				<TestWrapper initialEntries={["/chat"]}>
					<ChatV1Page />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(mockSetCurrentConversation).toHaveBeenCalledWith(null);
			});
		});

		it("does not update store if conversationId matches current", async () => {
			const mockSetCurrentConversation = vi.fn();
			const { useConversationStore } = await import(
				"../stores/conversationStore"
			);

			vi.mocked(useConversationStore).mockReturnValue({
				updateMessage: vi.fn(),
				setCurrentConversation: mockSetCurrentConversation,
				clearCurrentConversation: vi.fn(),
				currentConversationId: "conv-123",
				messages: [],
			} as any);

			const { useRitaChat } = await import("../hooks/useRitaChat");
			vi.mocked(useRitaChat).mockReturnValue({
				currentConversationId: "conv-123",
				conversations: [],
				conversationsLoading: false,
				filteredConversations: [],
				messages: [],
				messagesLoading: false,
				isSending: false,
				searchValue: "",
				messageValue: "",
				handleNewChat: vi.fn(),
				handleConversationClick: vi.fn(),
				handleSendMessage: vi.fn(),
				handleSearchChange: vi.fn(),
				handleMessageChange: vi.fn(),
				handleKeyPress: vi.fn(),
				handleFileUpload: vi.fn(),
				openFileSelector: vi.fn(),
				uploadStatus: {
					isUploading: false,
					isError: false,
					isSuccess: false,
				},
				handleDocumentUpload: vi.fn(),
				openDocumentSelector: vi.fn(),
				navigateToKnowledgeArticles: vi.fn(),
				navigateToFiles: vi.fn(),
				documentUploadStatus: {
					isUploading: false,
					isError: false,
					isSuccess: false,
				},
				knowledgeBaseFiles: [],
				knowledgeBaseFilesLoading: false,
				totalKnowledgeBaseFiles: 0,
				fileInputRef: { current: null },
				documentInputRef: { current: null },
				messagesEndRef: { current: null },
			} as any);

			render(
				<TestWrapper initialEntries={["/chat/conv-123"]}>
					<ChatV1Page />
				</TestWrapper>,
			);

			// Wait a bit to ensure effect runs
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Should not call setCurrentConversation because IDs already match
			expect(mockSetCurrentConversation).not.toHaveBeenCalled();
		});
	});

	describe("SSE Message Updates", () => {
		it("applies SSE updates to conversation store", async () => {
			const mockUpdateMessage = vi.fn();
			const { useConversationStore } = await import(
				"../stores/conversationStore"
			);
			const { useSSEContext } = await import("../contexts/SSEContext");

			vi.mocked(useConversationStore).mockReturnValue({
				updateMessage: mockUpdateMessage,
				setCurrentConversation: vi.fn(),
				clearCurrentConversation: vi.fn(),
				currentConversationId: null,
				messages: [],
			} as any);

			vi.mocked(useSSEContext).mockReturnValue({
				latestUpdate: {
					messageId: "msg-456",
					status: "completed",
					errorMessage: null,
				},
				connectionState: "open",
			} as any);

			render(
				<TestWrapper>
					<ChatV1Page />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(mockUpdateMessage).toHaveBeenCalledWith("msg-456", {
					status: "completed",
					error_message: null,
				});
			});
		});

		it("handles SSE updates with error messages", async () => {
			const mockUpdateMessage = vi.fn();
			const { useConversationStore } = await import(
				"../stores/conversationStore"
			);
			const { useSSEContext } = await import("../contexts/SSEContext");

			vi.mocked(useConversationStore).mockReturnValue({
				updateMessage: mockUpdateMessage,
				setCurrentConversation: vi.fn(),
				clearCurrentConversation: vi.fn(),
				currentConversationId: null,
				messages: [],
			} as any);

			vi.mocked(useSSEContext).mockReturnValue({
				latestUpdate: {
					messageId: "msg-789",
					status: "error",
					errorMessage: "Processing failed",
				},
				connectionState: "open",
			} as any);

			render(
				<TestWrapper>
					<ChatV1Page />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(mockUpdateMessage).toHaveBeenCalledWith("msg-789", {
					status: "error",
					error_message: "Processing failed",
				});
			});
		});

		it("does not update store when no SSE update present", async () => {
			const mockUpdateMessage = vi.fn();
			const { useConversationStore } = await import(
				"../stores/conversationStore"
			);
			const { useSSEContext } = await import("../contexts/SSEContext");

			vi.mocked(useConversationStore).mockReturnValue({
				updateMessage: mockUpdateMessage,
				setCurrentConversation: vi.fn(),
				clearCurrentConversation: vi.fn(),
				currentConversationId: null,
				messages: [],
			} as any);

			vi.mocked(useSSEContext).mockReturnValue({
				latestUpdate: null,
				connectionState: "open",
			} as any);

			render(
				<TestWrapper>
					<ChatV1Page />
				</TestWrapper>,
			);

			// Wait a bit to ensure effect runs
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockUpdateMessage).not.toHaveBeenCalled();
		});
	});

	describe("Hook Integration", () => {
		it("uses useRitaChat hook for state management", async () => {
			const { useRitaChat } = await import("../hooks/useRitaChat");

			render(
				<TestWrapper>
					<ChatV1Page />
				</TestWrapper>,
			);

			expect(useRitaChat).toHaveBeenCalled();
		});

		it("uses useSSEContext for real-time updates", async () => {
			const { useSSEContext } = await import("../contexts/SSEContext");

			render(
				<TestWrapper>
					<ChatV1Page />
				</TestWrapper>,
			);

			expect(useSSEContext).toHaveBeenCalled();
		});

		it("uses useConversationStore for state management", async () => {
			const { useConversationStore } = await import(
				"../stores/conversationStore"
			);

			render(
				<TestWrapper>
					<ChatV1Page />
				</TestWrapper>,
			);

			expect(useConversationStore).toHaveBeenCalled();
		});
	});

	describe("Component Composition", () => {
		it("passes all ritaChatState props to ChatV1Content", async () => {
			const { useRitaChat } = await import("../hooks/useRitaChat");

			const mockState = {
				currentConversationId: "conv-test",
				conversations: [{ id: "conv-test", title: "Test" }],
				conversationsLoading: false,
				filteredConversations: [],
				messages: [{ id: "msg-1", content: "Hello" }],
				messagesLoading: false,
				isSending: false,
				searchValue: "test search",
				messageValue: "test message",
				handleNewChat: vi.fn(),
				handleConversationClick: vi.fn(),
				handleSendMessage: vi.fn(),
				handleSearchChange: vi.fn(),
				handleMessageChange: vi.fn(),
				handleKeyPress: vi.fn(),
				handleFileUpload: vi.fn(),
				openFileSelector: vi.fn(),
				uploadStatus: {
					isUploading: false,
					isError: false,
					isSuccess: false,
				},
				handleDocumentUpload: vi.fn(),
				openDocumentSelector: vi.fn(),
				navigateToKnowledgeArticles: vi.fn(),
				navigateToFiles: vi.fn(),
				documentUploadStatus: {
					isUploading: false,
					isError: false,
					isSuccess: false,
				},
				knowledgeBaseFiles: [],
				knowledgeBaseFilesLoading: false,
				totalKnowledgeBaseFiles: 0,
				fileInputRef: { current: null },
				documentInputRef: { current: null },
				messagesEndRef: { current: null },
			};

			vi.mocked(useRitaChat).mockReturnValue(mockState as any);

			render(
				<TestWrapper>
					<ChatV1Page />
				</TestWrapper>,
			);

			// Verify props are passed to ChatV1Content
			expect(screen.getByTestId("current-conversation-id").textContent).toBe(
				"conv-test",
			);
			expect(screen.getByTestId("message-count").textContent).toBe("1");
		});
	});
});
