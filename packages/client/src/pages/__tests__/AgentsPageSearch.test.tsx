import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TestProviders } from "@/test/mocks/providers";

// --- Mocks ---

const mockUseInfiniteAgents = vi.fn();
const mockDeleteAgent = { mutate: vi.fn(), isPending: false };

vi.mock("@/hooks/api/useAgents", () => ({
	useInfiniteAgents: (...args: unknown[]) => mockUseInfiniteAgents(...args),
	useDeleteAgent: () => mockDeleteAgent,
}));

vi.mock("@/hooks/useAuth", () => ({
	useAuth: () => ({
		getUserEmail: () => "test@example.com",
	}),
}));

vi.mock("@/lib/toast", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/components/agents/DeleteAgentModal", () => ({
	DeleteAgentModal: () => null,
}));

import AgentsPage from "@/pages/AgentsPage";

function defaultInfiniteReturn(agents: Record<string, unknown>[] = []) {
	return {
		data: {
			pages: [{ agents, limit: 20, offset: 0, hasMore: false }],
			pageParams: [0],
		},
		isLoading: false,
		isFetchingNextPage: false,
		hasNextPage: false,
		fetchNextPage: vi.fn(),
		error: null,
	};
}

describe("AgentsPage search", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		mockUseInfiniteAgents.mockReturnValue(defaultInfiniteReturn());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("passes search to useInfiniteAgents after debounce", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

		render(
			<TestProviders>
				<AgentsPage />
			</TestProviders>,
		);

		const searchInput = screen.getByPlaceholderText("Search agents...");
		await user.type(searchInput, "HR Bot");

		// Before debounce: no search filter
		const callBeforeDebounce =
			mockUseInfiniteAgents.mock.calls[
				mockUseInfiniteAgents.mock.calls.length - 1
			][0];
		expect(callBeforeDebounce?.search).toBeUndefined();

		// After debounce (300ms)
		act(() => {
			vi.advanceTimersByTime(300);
		});

		const callAfterDebounce =
			mockUseInfiniteAgents.mock.calls[
				mockUseInfiniteAgents.mock.calls.length - 1
			][0];
		expect(callAfterDebounce).toEqual(
			expect.objectContaining({ search: "HR Bot" }),
		);
	});

	it("does not pass search when input is empty", () => {
		render(
			<TestProviders>
				<AgentsPage />
			</TestProviders>,
		);

		const lastCall =
			mockUseInfiniteAgents.mock.calls[
				mockUseInfiniteAgents.mock.calls.length - 1
			][0];
		expect(lastCall).toBeUndefined();
	});

	it("clears search filter when input is cleared after typing", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

		render(
			<TestProviders>
				<AgentsPage />
			</TestProviders>,
		);

		const searchInput = screen.getByPlaceholderText("Search agents...");

		// Type search
		await user.type(searchInput, "bot");
		act(() => {
			vi.advanceTimersByTime(300);
		});

		let lastCall =
			mockUseInfiniteAgents.mock.calls[
				mockUseInfiniteAgents.mock.calls.length - 1
			][0];
		expect(lastCall).toEqual(expect.objectContaining({ search: "bot" }));

		// Clear search
		await user.clear(searchInput);
		act(() => {
			vi.advanceTimersByTime(300);
		});

		lastCall =
			mockUseInfiniteAgents.mock.calls[
				mockUseInfiniteAgents.mock.calls.length - 1
			][0];
		expect(lastCall?.search).toBeUndefined();
	});
});
