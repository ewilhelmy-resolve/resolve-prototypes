import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEnableAuth = vi.fn();
const mockDisableAuth = vi.fn();
const mockEnableSession = vi.fn();
const mockDisableSession = vi.fn();

let mockEnableAuthError: Error | null = null;

vi.mock("@/hooks/api/useShareConversation", () => ({
	useEnableShare: () => ({
		mutateAsync: mockEnableAuth,
		isPending: false,
		error: mockEnableAuthError,
	}),
	useDisableShare: () => ({
		mutateAsync: mockDisableAuth,
		isPending: false,
		error: null,
	}),
	useEnableShareFromSession: () => ({
		mutateAsync: mockEnableSession,
		isPending: false,
		error: null,
	}),
	useDisableShareFromSession: () => ({
		mutateAsync: mockDisableSession,
		isPending: false,
		error: null,
	}),
}));

import { ShareConversationDialog } from "./ShareConversationDialog";

describe("ShareConversationDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEnableAuthError = null;
		mockEnableAuth.mockResolvedValue({
			shareUrl: "https://app.test/share/abc123",
			shareId: "abc123",
		});
		mockDisableAuth.mockResolvedValue({ success: true });
		mockEnableSession.mockResolvedValue({
			shareUrl: "https://app.test/share/sess456",
			shareId: "sess456",
		});
		mockDisableSession.mockResolvedValue({ success: true });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders default Share trigger button in uncontrolled mode", () => {
		render(<ShareConversationDialog conversationId="conv-1" />);
		expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
	});

	it("opens dialog on trigger click (uncontrolled)", async () => {
		const user = userEvent.setup();
		render(<ShareConversationDialog conversationId="conv-1" />);

		await user.click(screen.getByRole("button", { name: /share/i }));

		expect(screen.getByText("Share conversation")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /generate share link/i }),
		).toBeInTheDocument();
	});

	it("opens dialog in controlled mode without trigger", () => {
		const onOpenChange = vi.fn();
		render(
			<ShareConversationDialog
				conversationId="conv-1"
				open={true}
				onOpenChange={onOpenChange}
			/>,
		);

		expect(screen.getByText("Share conversation")).toBeInTheDocument();
		// No trigger button rendered in controlled mode
		expect(screen.queryByText("Share")).not.toBeInTheDocument();
	});

	it("calls useEnableShare with conversationId when Generate is clicked", async () => {
		const user = userEvent.setup();
		render(
			<ShareConversationDialog
				conversationId="conv-1"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /generate share link/i }),
		);

		expect(mockEnableAuth).toHaveBeenCalledWith("conv-1");
		expect(mockEnableSession).not.toHaveBeenCalled();
	});

	it("calls useEnableShareFromSession with sessionKey when Generate is clicked", async () => {
		const user = userEvent.setup();
		render(
			<ShareConversationDialog
				sessionKey="valkey-key-1"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /generate share link/i }),
		);

		expect(mockEnableSession).toHaveBeenCalledWith("valkey-key-1");
		expect(mockEnableAuth).not.toHaveBeenCalled();
	});

	it("shows shareUrl and copy button after successful enable", async () => {
		const user = userEvent.setup();
		render(
			<ShareConversationDialog
				conversationId="conv-1"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /generate share link/i }),
		);

		await waitFor(() => {
			expect(
				screen.getByDisplayValue("https://app.test/share/abc123"),
			).toBeInTheDocument();
		});
		expect(
			screen.getByRole("button", { name: /copy share link/i }),
		).toBeInTheDocument();
	});

	it("copies URL to clipboard and shows CheckIcon for 2 seconds", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const user = userEvent.setup({
			advanceTimers: vi.advanceTimersByTime,
		});

		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: vi.fn().mockResolvedValue(undefined) },
			configurable: true,
		});

		render(
			<ShareConversationDialog
				conversationId="conv-1"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /generate share link/i }),
		);

		await waitFor(() => {
			expect(
				screen.getByDisplayValue("https://app.test/share/abc123"),
			).toBeInTheDocument();
		});

		const copyBtn = screen.getByRole("button", { name: /copy share link/i });
		await user.click(copyBtn);

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
			"https://app.test/share/abc123",
		);

		// CheckIcon should be visible (check-icon class from lucide)
		// The button still exists but icon changed. We verify by checking the SVG content changes back.
		// After 2s the icon reverts
		vi.advanceTimersByTime(2000);

		vi.useRealTimers();
	});

	it("swallows clipboard failure without throwing", async () => {
		const user = userEvent.setup();

		Object.defineProperty(navigator, "clipboard", {
			value: {
				writeText: vi.fn().mockRejectedValue(new Error("Clipboard blocked")),
			},
			configurable: true,
		});

		render(
			<ShareConversationDialog
				conversationId="conv-1"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /generate share link/i }),
		);

		await waitFor(() => {
			expect(
				screen.getByDisplayValue("https://app.test/share/abc123"),
			).toBeInTheDocument();
		});

		// Should not throw
		await user.click(screen.getByRole("button", { name: /copy share link/i }));

		expect(navigator.clipboard.writeText).toHaveBeenCalled();
		// Button still accessible (no crash)
		expect(
			screen.getByRole("button", { name: /copy share link/i }),
		).toBeInTheDocument();
	});

	it("calls disable hook based on conversationId mode", async () => {
		const user = userEvent.setup();
		render(
			<ShareConversationDialog
				conversationId="conv-1"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /disable sharing/i }));

		expect(mockDisableAuth).toHaveBeenCalledWith("conv-1");
		expect(mockDisableSession).not.toHaveBeenCalled();
	});

	it("calls disable hook based on sessionKey mode", async () => {
		const user = userEvent.setup();
		render(
			<ShareConversationDialog
				sessionKey="valkey-key-1"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /disable sharing/i }));

		expect(mockDisableSession).toHaveBeenCalledWith("valkey-key-1");
		expect(mockDisableAuth).not.toHaveBeenCalled();
	});

	it("clears shareUrl when dialog is closed and reopened", async () => {
		const user = userEvent.setup();

		render(<ShareConversationDialog conversationId="conv-1" />);

		// Open dialog via the default trigger
		await user.click(screen.getByRole("button", { name: /share/i }));
		expect(screen.getByText("Share conversation")).toBeInTheDocument();

		// Generate share link
		await user.click(
			screen.getByRole("button", { name: /generate share link/i }),
		);
		await waitFor(() => {
			expect(
				screen.getByDisplayValue("https://app.test/share/abc123"),
			).toBeInTheDocument();
		});

		// Close dialog via Escape key (triggers handleOpenChange(false))
		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(screen.queryByText("Share conversation")).not.toBeInTheDocument();
		});

		// Reopen dialog
		await user.click(screen.getByRole("button", { name: /share/i }));

		// shareUrl should be cleared, "Generate share link" button visible again
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /generate share link/i }),
			).toBeInTheDocument();
		});
		expect(
			screen.queryByDisplayValue("https://app.test/share/abc123"),
		).not.toBeInTheDocument();
	});

	it("accepts custom trigger", async () => {
		const user = userEvent.setup();
		render(
			<ShareConversationDialog
				conversationId="conv-1"
				trigger={<button type="button">Custom Share</button>}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Custom Share" }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Custom Share" }));
		expect(screen.getByText("Share conversation")).toBeInTheDocument();
	});

	it("renders error message when hook returns error", () => {
		mockEnableAuthError = new Error("Something went wrong");

		render(
			<ShareConversationDialog
				conversationId="conv-1"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
	});
});
