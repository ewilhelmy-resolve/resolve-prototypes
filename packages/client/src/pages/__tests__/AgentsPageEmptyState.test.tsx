import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TestProviders } from "@/test/mocks/providers";

const mockUseInfiniteAgents = vi.fn();
const mockDeleteAgent = { mutate: vi.fn(), isPending: false };

vi.mock("@/hooks/api/useAgents", () => ({
	useInfiniteAgents: (...args: unknown[]) => mockUseInfiniteAgents(...args),
	useDeleteAgent: () => mockDeleteAgent,
}));

vi.mock("@/hooks/useAuth", () => ({
	useAuth: () => ({
		getUserEmail: () => "test@example.com",
		user: { email: "test@example.com", roles: [], name: "Test" },
		isAuthenticated: true,
	}),
}));

vi.mock("@/lib/toast", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/components/agents/DeleteAgentModal", () => ({
	DeleteAgentModal: () => null,
}));

vi.mock("@/components/WelcomeDialog", () => ({
	default: () => null,
}));

import AgentsPage from "@/pages/AgentsPage";

function infiniteReturn(agents: Record<string, unknown>[] = []) {
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

describe("AgentsPage empty state", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the empty state when no agents are returned", () => {
		mockUseInfiniteAgents.mockReturnValue(infiniteReturn([]));

		render(
			<TestProviders>
				<AgentsPage />
			</TestProviders>,
		);

		expect(screen.getByText("list.empty.heading")).toBeInTheDocument();
		expect(screen.getByText("list.empty.description")).toBeInTheDocument();
		// Header's "Create agent" button is still shown, plus the one inside the
		// empty state — so we expect at least one with the empty-state key.
		expect(
			screen.getByRole("button", { name: /list\.empty\.createAgent/ }),
		).toBeInTheDocument();
	});

	it("does NOT render the empty state when agents are present", () => {
		mockUseInfiniteAgents.mockReturnValue(
			infiniteReturn([
				{
					id: "a1",
					name: "Agent One",
					description: "desc",
					state: "DRAFT",
					skills: [],
					updatedBy: "test@example.com",
					owner: "test@example.com",
					lastUpdated: "2026-04-20",
				},
			]),
		);

		render(
			<TestProviders>
				<AgentsPage />
			</TestProviders>,
		);

		expect(screen.queryByText("list.empty.heading")).not.toBeInTheDocument();
	});
});
