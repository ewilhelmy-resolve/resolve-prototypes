import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "./ChatMessage";

// Mock the SSE context
vi.mock("../contexts/SSEContext", () => ({
	useSSEContext: vi.fn(),
}));

import { useSSEContext } from "../contexts/SSEContext";

describe("ChatMessage", () => {
	const defaultProps = {
		id: "msg-123",
		message: "Hello, this is a test message",
		role: "user" as const,
		timestamp: new Date("2024-01-15T10:30:00"),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useSSEContext).mockReturnValue({
			messageUpdates: [],
			latestUpdate: null,
		} as any);
	});

	describe("Rendering", () => {
		it("renders message content", () => {
			render(<ChatMessage {...defaultProps} />);
			expect(screen.getByText("Hello, this is a test message")).toBeInTheDocument();
		});

		it("renders timestamp", () => {
			render(<ChatMessage {...defaultProps} />);
			// Time format depends on locale, just check something renders
			expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();
		});

		it("renders user label for user role", () => {
			render(<ChatMessage {...defaultProps} role="user" />);
			expect(screen.getByText("You")).toBeInTheDocument();
		});

		it("renders assistant label for assistant role", () => {
			render(<ChatMessage {...defaultProps} role="assistant" />);
			expect(screen.getByText("Assistant")).toBeInTheDocument();
		});
	});

	describe("User message styling", () => {
		it("applies user message styling", () => {
			const { container } = render(<ChatMessage {...defaultProps} role="user" />);
			const messageBubble = container.querySelector(".bg-blue-600");
			expect(messageBubble).toBeInTheDocument();
		});

		it("aligns user message to the right", () => {
			const { container } = render(<ChatMessage {...defaultProps} role="user" />);
			const alignment = container.querySelector(".justify-end");
			expect(alignment).toBeInTheDocument();
		});
	});

	describe("Assistant message styling", () => {
		it("applies assistant message styling", () => {
			const { container } = render(
				<ChatMessage {...defaultProps} role="assistant" />
			);
			const messageBubble = container.querySelector(".bg-white");
			expect(messageBubble).toBeInTheDocument();
		});

		it("aligns assistant message to the left", () => {
			const { container } = render(
				<ChatMessage {...defaultProps} role="assistant" />
			);
			const alignment = container.querySelector(".justify-start");
			expect(alignment).toBeInTheDocument();
		});
	});

	describe("Message status (user messages only)", () => {
		it("shows MessageStatus component for user messages", () => {
			render(<ChatMessage {...defaultProps} role="user" initialStatus="pending" />);
			expect(screen.getByText("Pending")).toBeInTheDocument();
		});

		it("does not show MessageStatus for assistant messages", () => {
			render(
				<ChatMessage {...defaultProps} role="assistant" initialStatus="pending" />
			);
			expect(screen.queryByText("Pending")).not.toBeInTheDocument();
		});

		it("shows processing animation when processing", () => {
			render(
				<ChatMessage {...defaultProps} role="user" initialStatus="processing" />
			);
			expect(screen.getByText("Processing...")).toBeInTheDocument();
		});

		it("shows error message when failed", () => {
			vi.mocked(useSSEContext).mockReturnValue({
				messageUpdates: [
					{
						messageId: "msg-123",
						status: "failed",
						errorMessage: "Connection timeout",
					},
				],
				latestUpdate: null,
			} as any);

			render(<ChatMessage {...defaultProps} role="user" />);
			expect(screen.getByText("Connection timeout")).toBeInTheDocument();
		});
	});

	describe("SSE updates", () => {
		it("updates status from SSE latestUpdate", () => {
			vi.mocked(useSSEContext).mockReturnValue({
				messageUpdates: [],
				latestUpdate: {
					messageId: "msg-123",
					status: "completed",
				},
			} as any);

			render(
				<ChatMessage {...defaultProps} role="user" initialStatus="pending" />
			);
			expect(screen.getByText("Completed")).toBeInTheDocument();
		});

		it("updates status from messageUpdates on mount", () => {
			vi.mocked(useSSEContext).mockReturnValue({
				messageUpdates: [
					{
						messageId: "msg-123",
						status: "processing",
					},
				],
				latestUpdate: null,
			} as any);

			render(
				<ChatMessage {...defaultProps} role="user" initialStatus="pending" />
			);
			expect(screen.getByText("Processing")).toBeInTheDocument();
		});

		it("ignores SSE updates for different message IDs", () => {
			vi.mocked(useSSEContext).mockReturnValue({
				messageUpdates: [],
				latestUpdate: {
					messageId: "different-msg",
					status: "completed",
				},
			} as any);

			render(
				<ChatMessage {...defaultProps} role="user" initialStatus="pending" />
			);
			expect(screen.getByText("Pending")).toBeInTheDocument();
		});

		it("ignores SSE updates for assistant messages", () => {
			vi.mocked(useSSEContext).mockReturnValue({
				messageUpdates: [],
				latestUpdate: {
					messageId: "msg-123",
					status: "completed",
				},
			} as any);

			render(
				<ChatMessage {...defaultProps} role="assistant" initialStatus="pending" />
			);
			// Assistant messages don't show status at all
			expect(screen.queryByText("Completed")).not.toBeInTheDocument();
		});
	});

	describe("Props", () => {
		it("applies custom className", () => {
			const { container } = render(
				<ChatMessage {...defaultProps} className="custom-class" />
			);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper).toHaveClass("custom-class");
		});

		it("defaults to pending status", () => {
			render(<ChatMessage {...defaultProps} role="user" />);
			expect(screen.getByText("Pending")).toBeInTheDocument();
		});
	});
});
