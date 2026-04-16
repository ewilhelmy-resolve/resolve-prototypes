import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
	useGenerateAgent: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useImproveInstructionsMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
	}),
	useGenerateConversationStartersMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
	}),
}));

const mockAgentCreationCreate = vi.fn();
const mockAgentCreationReset = vi.fn();

vi.mock("@/hooks/useAgentCreation", () => ({
	useAgentCreation: () => ({
		create: mockAgentCreationCreate,
		status: "idle",
		creationId: null,
		executionId: null,
		executionSteps: [],
		inputMessage: null,
		agentId: null,
		agentName: null,
		error: null,
		isCreating: false,
		reset: mockAgentCreationReset,
	}),
}));

vi.mock("@/hooks/useImproveInstructions", () => ({
	useImproveInstructions: () => ({
		improve: vi.fn(),
		status: "idle",
		isImproving: false,
		reset: vi.fn(),
	}),
}));

vi.mock("@/hooks/useGenerateConversationStarters", () => ({
	useGenerateConversationStarters: () => ({
		generate: vi.fn(),
		status: "idle",
		isGenerating: false,
		generatedStarters: null,
		reset: vi.fn(),
	}),
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

vi.mock("@/hooks/useDebounce", () => ({
	useDebounce: (val: string) => val,
}));

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

vi.mock("@/lib/toast", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/agents/builder", () => ({
	AddSkillModal: () => null,
	AddToolsModal: () => null,
	AgentConversationStarters: () => null,
	AgentCreationOverlay: () => null,
	AgentGuardrailsSection: () => null,
	AgentIconPicker: () => null,
	ChangeAgentTypeModal: () => null,
	ConfirmTypeChangeModal: () => null,
	CreateWorkflowModal: () => null,
	ImproveInstructionsDialog: () => null,
	InstructionsExpandedModal: () => null,
	PublishModal: () => null,
	UnlinkWorkflowModal: () => null,
	UnpublishModal: () => null,
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
	tools: [],
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

	it("shows 'Draft' badge when editing a draft agent", async () => {
		mockedUseAgent.mockReturnValue({
			data: draftAgent,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/agent-draft-1");

		await waitFor(() => {
			const badges = screen.getAllByText("builder.statusDraft");
			expect(badges.length).toBeGreaterThanOrEqual(1);
		});

		expect(
			screen.queryByText("builder.statusPublished"),
		).not.toBeInTheDocument();
	});

	it("shows 'Published' badge with checkmark when editing a published agent", async () => {
		mockedUseAgent.mockReturnValue({
			data: publishedAgent,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/agent-pub-1");

		await waitFor(() => {
			expect(screen.getByText("builder.statusPublished")).toBeInTheDocument();
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
			const badges = screen.getAllByText("builder.statusDraft");
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
			screen.getByRole("button", { name: /^builder\.publish$/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /builder\.unpublish/i }),
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
			screen.getByRole("button", { name: /builder\.unpublish/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /builder\.publishChanges/i }),
		).toBeInTheDocument();
	});
});

describe("AgentBuilderPage - Create Agent Button", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateAgent.mutateAsync.mockResolvedValue({ id: "new-draft-1" });
	});

	it("does NOT call createAgent on mount for new agents", async () => {
		mockedUseAgent.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/create");

		// Wait for render to settle
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /builder\.createAgent/i }),
			).toBeInTheDocument();
		});

		expect(mockCreateAgent.mutateAsync).not.toHaveBeenCalled();
	});

	it("shows 'Create agent' button in create mode", async () => {
		mockedUseAgent.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/create");

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /builder\.createAgent/i }),
			).toBeInTheDocument();
		});

		// Should not show Publish in create mode
		expect(
			screen.queryByRole("button", { name: /^builder\.publish$/i }),
		).not.toBeInTheDocument();
	});

	it("calls agentCreation.create (AI flow) on click, NOT the old createAgent", async () => {
		const user = userEvent.setup();

		mockedUseAgent.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/create");

		// Fill required fields: name + instructions
		const nameInput = await screen.findByPlaceholderText(
			/builder\.form\.namePlaceholder/i,
		);
		await user.clear(nameInput);
		await user.type(nameInput, "Test Agent");

		const instructionsArea = document.getElementById(
			"instructions",
		) as HTMLTextAreaElement;
		await user.type(instructionsArea, "Be helpful");

		const createBtn = screen.getByRole("button", {
			name: /builder\.createAgent/i,
		});
		await user.click(createBtn);

		await waitFor(() => {
			expect(mockAgentCreationCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					name: expect.any(String),
				}),
			);
		});

		// Must NOT call the old direct LLM Service metadata endpoint
		expect(mockCreateAgent.mutateAsync).not.toHaveBeenCalled();
	});

	it("does NOT show 'Create agent' button when editing existing agent", async () => {
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
			screen.queryByRole("button", { name: /builder\.createAgent/i }),
		).not.toBeInTheDocument();
		expect(mockCreateAgent.mutateAsync).not.toHaveBeenCalled();
	});

	it("disables 'Create agent' when name is empty (default state)", async () => {
		mockedUseAgent.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/create");

		const createBtn = await screen.findByRole("button", {
			name: /builder\.createAgent/i,
		});
		expect(createBtn).toBeDisabled();
	});

	it("disables 'Create agent' when name is filled but instructions are empty", async () => {
		const user = userEvent.setup();

		mockedUseAgent.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useAgent>);

		renderPage("/agents/create");

		// Fill in the name
		const nameInput = await screen.findByPlaceholderText(
			/builder\.form\.namePlaceholder/i,
		);
		await user.clear(nameInput);
		await user.type(nameInput, "My Test Agent");

		const createBtn = screen.getByRole("button", {
			name: /builder\.createAgent/i,
		});
		// Should still be disabled because instructions are empty
		expect(createBtn).toBeDisabled();
	});
});
