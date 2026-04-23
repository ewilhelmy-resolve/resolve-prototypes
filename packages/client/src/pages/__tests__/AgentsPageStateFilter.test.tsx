import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function defaultInfiniteReturn() {
	return {
		data: {
			pages: [{ agents: [], limit: 20, offset: 0, hasMore: false }],
			pageParams: [0],
		},
		isLoading: false,
		isFetchingNextPage: false,
		hasNextPage: false,
		fetchNextPage: vi.fn(),
		error: null,
	};
}

describe("AgentsPage state filter dropdown", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseInfiniteAgents.mockReturnValue(defaultInfiniteReturn());
	});

	it("shows only All, Published, and Draft options — Testing and Retired are removed", async () => {
		// Radix dropdowns rely on pointer events; disable the default check so
		// userEvent can open the menu in jsdom.
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<TestProviders>
				<AgentsPage />
			</TestProviders>,
		);

		// i18n test stub returns translation keys verbatim, but button accessible
		// name may drop interpolation. Find by text descendant instead.
		const buttons = screen.getAllByRole("button");
		const trigger = buttons.find((b) =>
			b.textContent?.toLowerCase().includes("state"),
		);
		if (!trigger) {
			throw new Error(
				`State trigger not found. Buttons: ${buttons
					.map((b) => JSON.stringify(b.textContent))
					.join(", ")}`,
			);
		}
		await user.click(trigger);

		const options = (await screen.findAllByRole("menuitemcheckbox")).map(
			(el) => el.textContent?.trim() ?? "",
		);

		// Should include All / Published / Draft only — translation keys surface
		// through i18next-react test stub as the key string.
		expect(options).toContain("list.filters.all");
		expect(options).toContain("list.filters.published");
		expect(options).toContain("list.filters.draft");
		expect(options).not.toContain("list.filters.testing");
		expect(options).not.toContain("list.filters.retired");
	});
});
