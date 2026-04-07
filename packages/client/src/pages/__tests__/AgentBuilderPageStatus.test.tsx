import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TestProviders } from "@/test/mocks/providers";
import type { AgentConfig } from "@/types/agent";

// --- Mocks ---

const mockNavigate = vi.fn();
const mockCreateAgent = {
	mutateAsync: vi.fn(),
	isPending: false,
};
const mockUpdateAgent = {
	mutateAsync: vi.fn(),
	isPending: false,
};

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

vi.mock("@/hooks/api/useAgents", () => ({
	useAgent: vi.fn(),
	useCreateAgent: () => mockCreateAgent,
	useUpdateAgent: () => mockUpdateAgent,
	useCheckAgentName: () => ({ data: { available: true } }),
}));

vi.mock("@/hooks/useAutoSave", () => ({
	useAutoSave: () => ({
		status: "idle" as const,
		isDirty: false,
		saveNow: vi.fn(),
		resetDirty: vi.fn(),
		lastSavedAt: null,
		error: null,
	}),
}));

vi.mock("@/hooks/useClickOutside", () => ({
	useClickOutside: vi.fn(),
}));

vi.mock("@/hooks/useDebouncedValue", () => ({
	useDebouncedValue: (val: string) => val,
}));

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

vi.mock("@/lib/toast", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/agents/builder", () => ({
	AddSkillModal: () => null,
	ChangeAgentTypeModal: () => null,
	ConfirmTypeChangeModal: () => null,
	CreateWorkflowModal: () => null,
	InstructionsExpandedModal: () => null,
	PublishModal: () => null,
	UnlinkWorkflowModal: () => null,
	UnpublishModal: () => null,
}));

vi.mock("@/components/agents/SaveStatusIndicator", () => ({
	SaveStatusIndicator: () => <span data-testid="save-status" />,
}));

import { useAgent } from "@/hooks/api/useAgents";
import AgentBuilderPage from "@/pages/AgentBuilderPage";

const mockedUseAgent = vi.mocked(useAgent);

// --- Helpers ---

const draftAgent: AgentConfig = {
	id: "agent-draft-1",
	name: "Store Hours Manager",
	description: "Handles store hours queries",
	instructions: "Help with store hours",
	role: "assistant",
	iconId: "bot",
	iconColorId: "slate",
	agentType: "answer",
	status: "draft",
	conversationStarters: [],
	knowledgeSources: [],
	workflows: [],
	guardrails: [],
	capabilities: {
		webSearch: true,
		imageGeneration: false,
		useAllWorkspaceContent: false,
	},
};

const publishedAgent: AgentConfig = {
	...draftAgent,
	id: "agent-pub-1",
	status: "published",
};

function createWrapper(initialPath: string) {
	return ({ children }: { children: ReactNode }) => (
		<TestProviders initialEntries={[initialPath]}>
			<Routes>
				<Route path="/agents/create" element={children} />
				<Route path="/agents/:id" element={children} />
			</Routes>
		</TestProviders>
	);
}

function renderPage(path: string) {
	return render(<AgentBuilderPage />, { wrapper: createWrapper(path) });
}

// --- Tests ---

describe("AgentBuilderPage - Status Badge", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateAgent.mutateAsync.mockResolvedValue({ id: "new-1" });
	});

	it("does not call replaceState during draft creation", async () => {
		// replaceState triggers React Router v7 re-match → changes agentId → wrong badge
		const spy = vi.spyOn(window.history, "replaceState");

		mockedUseAgent.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/create");

		await waitFor(() => {
			expect(mockCreateAgent.mutateAsync).toHaveBeenCalled();
		});

		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it("shows 'Draft' badge when editing a draft agent", async () => {
		mockedUseAgent.mockReturnValue({
			data: draftAgent,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/agent-draft-1");

		await waitFor(() => {
			const badges = screen.getAllByText("Draft");
			expect(badges.length).toBeGreaterThanOrEqual(1);
		});

		expect(screen.queryByText("Published")).not.toBeInTheDocument();
	});

	it("shows 'Published' badge with checkmark when editing a published agent", async () => {
		mockedUseAgent.mockReturnValue({
			data: publishedAgent,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/agent-pub-1");

		await waitFor(() => {
			expect(screen.getByText("Published")).toBeInTheDocument();
		});
	});

	it("shows 'Draft' badge for new agent during wizard", async () => {
		mockedUseAgent.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/create");

		await waitFor(() => {
			const badges = screen.getAllByText("Draft");
			expect(badges.length).toBeGreaterThanOrEqual(1);
		});
	});
});

describe("AgentBuilderPage - Action Buttons", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateAgent.mutateAsync.mockResolvedValue({ id: "new-1" });
	});

	it("shows single 'Publish' button for draft agents (no Unpublish)", async () => {
		mockedUseAgent.mockReturnValue({
			data: draftAgent,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/agent-draft-1");

		await waitFor(() => {
			expect(screen.getByText("Store Hours Manager")).toBeInTheDocument();
		});

		expect(
			screen.getByRole("button", { name: /^Publish$/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Unpublish/i }),
		).not.toBeInTheDocument();
	});

	it("shows 'Unpublish' and 'Publish changes' for published agents", async () => {
		mockedUseAgent.mockReturnValue({
			data: publishedAgent,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/agent-pub-1");

		await waitFor(() => {
			expect(screen.getByText("Store Hours Manager")).toBeInTheDocument();
		});

		expect(
			screen.getByRole("button", { name: /Unpublish/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Publish changes/i }),
		).toBeInTheDocument();
	});
});

describe("AgentBuilderPage - Draft on Create", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateAgent.mutateAsync.mockResolvedValue({ id: "new-draft-1" });
	});

	it("calls createAgent on mount for new agents", async () => {
		mockedUseAgent.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/create");

		await waitFor(() => {
			expect(mockCreateAgent.mutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({ status: "draft" }),
			);
		});
	});

	it("does NOT call createAgent when editing existing agent", async () => {
		mockedUseAgent.mockReturnValue({
			data: draftAgent,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/agent-draft-1");

		await waitFor(() => {
			expect(screen.getByText("Store Hours Manager")).toBeInTheDocument();
		});

		expect(mockCreateAgent.mutateAsync).not.toHaveBeenCalled();
	});

	it("clears 'Saving...' even when API hangs (safety timeout)", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		// Simulate a mutation that never resolves (API hanging)
		mockCreateAgent.mutateAsync.mockReturnValue(new Promise(() => {}));

		mockedUseAgent.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/create");

		// "Saving..." should appear initially
		await waitFor(() => {
			expect(screen.getByText("Saving...")).toBeInTheDocument();
		});

		// Advance past safety timeout (5s)
		vi.advanceTimersByTime(6000);

		// "Saving..." should disappear even though mutation never resolved
		await waitFor(() => {
			expect(screen.queryByText("Saving...")).not.toBeInTheDocument();
		});

		vi.useRealTimers();
	});
});
