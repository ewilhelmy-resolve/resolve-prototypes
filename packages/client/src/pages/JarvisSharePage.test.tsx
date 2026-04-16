/**
 * JarvisSharePage.test.tsx - Unit tests for the public share page (snapshot model)
 *
 * Tests:
 * - Loading state
 * - Successful load with title, renderer, footer
 * - Error states (404, other errors)
 * - Message metadata parsing (string → object, object passthrough)
 * - readOnly always true on renderer
 * - No token query param (snapshot model)
 */

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock react-router-dom
const mockUseParams = vi.fn(() => ({
	shareId: "abc123def456abc123def456abc123de",
}));

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useParams: () => mockUseParams(),
	};
});

// Mock ChatV2MessageRenderer
vi.mock("@/components/chat/ChatV2MessageRenderer", () => ({
	ChatV2MessageRenderer: ({ chatMessages, readOnly }: any) => (
		<div
			data-testid="chat-renderer"
			data-readonly={readOnly}
			data-count={chatMessages.length}
		/>
	),
}));

// Mock messageGrouping — pass through with isGroup marker
const mockGroupMessages = vi.fn((msgs: any[]) =>
	msgs.map((m: any) => ({ ...m, isGroup: false })),
);
vi.mock("@/lib/messageGrouping", () => ({
	groupMessages: (msgs: any[]) => mockGroupMessages(msgs),
}));

import JarvisSharePage from "./JarvisSharePage";

// -- Helpers --

function makeShareResponse(overrides: Record<string, any> = {}) {
	return {
		conversation: {
			id: "test-conv-id",
			title: "Test Conversation",
			created_at: "2025-01-01T00:00:00Z",
		},
		messages: [
			{
				id: "msg-1",
				role: "user",
				message: "Hello",
				metadata: null,
				response_group_id: null,
				created_at: "2025-01-01T12:00:00Z",
			},
			{
				id: "msg-2",
				role: "assistant",
				message: "Hi there",
				metadata: null,
				response_group_id: null,
				created_at: "2025-01-01T12:01:00Z",
			},
		],
		...overrides,
	};
}

function mockFetchSuccess(data: any) {
	global.fetch = vi.fn(() =>
		Promise.resolve({
			ok: true,
			status: 200,
			json: () => Promise.resolve(data),
		} as Response),
	);
}

function mockFetchError(status: number) {
	global.fetch = vi.fn(() =>
		Promise.resolve({
			ok: false,
			status,
			json: () => Promise.resolve({}),
		} as Response),
	);
}

// -- Tests --

describe("JarvisSharePage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseParams.mockReturnValue({
			shareId: "abc123def456abc123def456abc123de",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("shows loading state while fetching", () => {
		// fetch that never resolves
		global.fetch = vi.fn(() => new Promise(() => {})) as any;

		render(<JarvisSharePage />);

		expect(screen.getByText("Loading conversation...")).toBeInTheDocument();
	});

	it("renders header, renderer, and footer on successful load", async () => {
		mockFetchSuccess(makeShareResponse());

		render(<JarvisSharePage />);

		await waitFor(() => {
			expect(screen.getByText("Jarvis")).toBeInTheDocument();
		});

		expect(screen.getByText("Shared conversation")).toBeInTheDocument();
		expect(screen.getByTestId("chat-renderer")).toBeInTheDocument();
		expect(screen.getByText("Powered by Rita")).toBeInTheDocument();
	});

	it("shows 'Shared conversation not found' on 404", async () => {
		mockFetchError(404);

		render(<JarvisSharePage />);

		await waitFor(() => {
			expect(
				screen.getByText("Shared conversation not found"),
			).toBeInTheDocument();
		});
	});

	it("shows 'Failed to load' on other errors", async () => {
		mockFetchError(500);

		render(<JarvisSharePage />);

		await waitFor(() => {
			expect(screen.getByText("Failed to load")).toBeInTheDocument();
		});
	});

	it("shows 'Failed to load' on network error", async () => {
		global.fetch = vi.fn(() => Promise.reject(new Error("Failed to load")));

		render(<JarvisSharePage />);

		await waitFor(() => {
			expect(screen.getByText("Failed to load")).toBeInTheDocument();
		});
	});

	it("fetches /api/share/{shareId} with no token param", async () => {
		mockFetchSuccess(makeShareResponse());

		render(<JarvisSharePage />);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalled();
		});

		const fetchUrl = (global.fetch as any).mock.calls[0][0] as string;
		expect(fetchUrl).toContain("/api/share/abc123def456abc123def456abc123de");
		expect(fetchUrl).not.toContain("token=");
	});

	it("maps messages correctly — passes metadata through and converts timestamps", async () => {
		const data = makeShareResponse({
			messages: [
				{
					id: "msg-1",
					role: "assistant",
					message: "Response text",
					metadata: {
						reasoning: { content: "step", title: "Thinking" },
					},
					response_group_id: "grp-1",
					created_at: "2025-06-15T10:30:00Z",
				},
			],
		});
		mockFetchSuccess(data);

		render(<JarvisSharePage />);

		await waitFor(() => {
			expect(mockGroupMessages).toHaveBeenCalled();
		});

		const groupedInput = mockGroupMessages.mock.calls[0][0];
		expect(groupedInput).toHaveLength(1);

		const msg = groupedInput[0];
		// metadata parsed from JSON string
		expect(msg.metadata).toEqual({
			reasoning: { content: "step", title: "Thinking" },
		});
		// timestamp is a Date object
		expect(msg.timestamp).toBeInstanceOf(Date);
		expect(msg.timestamp.toISOString()).toBe("2025-06-15T10:30:00.000Z");
		// response_group_id mapped (null → undefined)
		expect(msg.response_group_id).toBe("grp-1");
		expect(msg.conversation_id).toBe("test-conv-id");
		expect(msg.status).toBe("completed");
	});

	it("passes readOnly=true to ChatV2MessageRenderer", async () => {
		mockFetchSuccess(makeShareResponse());

		render(<JarvisSharePage />);

		await waitFor(() => {
			expect(screen.getByTestId("chat-renderer")).toBeInTheDocument();
		});

		const renderer = screen.getByTestId("chat-renderer");
		expect(renderer).toHaveAttribute("data-readonly", "true");
	});

	it("passes grouped messages count to renderer", async () => {
		mockFetchSuccess(makeShareResponse());

		render(<JarvisSharePage />);

		await waitFor(() => {
			expect(screen.getByTestId("chat-renderer")).toBeInTheDocument();
		});

		const renderer = screen.getByTestId("chat-renderer");
		// 2 messages in default makeShareResponse
		expect(renderer).toHaveAttribute("data-count", "2");
	});

	it("handles metadata that is already an object (not stringified)", async () => {
		const data = makeShareResponse({
			messages: [
				{
					id: "msg-1",
					role: "assistant",
					message: "text",
					metadata: { sources: [{ url: "https://x.com", title: "X" }] },
					response_group_id: null,
					created_at: "2025-01-01T00:00:00Z",
				},
			],
		});
		mockFetchSuccess(data);

		render(<JarvisSharePage />);

		await waitFor(() => {
			expect(mockGroupMessages).toHaveBeenCalled();
		});

		const msg = mockGroupMessages.mock.calls[0][0][0];
		expect(msg.metadata).toEqual({
			sources: [{ url: "https://x.com", title: "X" }],
		});
	});

	it("always shows Jarvis as header title", async () => {
		mockFetchSuccess(
			makeShareResponse({
				conversation: {
					id: "test-conv-id",
					title: "",
					created_at: "2025-01-01T00:00:00Z",
				},
			}),
		);

		render(<JarvisSharePage />);

		await waitFor(() => {
			expect(screen.getByText("Jarvis")).toBeInTheDocument();
		});
	});
});
