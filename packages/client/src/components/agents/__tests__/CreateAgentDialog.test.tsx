import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateAgentDialog } from "../CreateAgentDialog";

// Mock the agent API
vi.mock("@/services/api", () => ({
	agentApi: {
		checkName: vi.fn(),
	},
}));

import { agentApi } from "@/services/api";

const mockedCheckName = vi.mocked(agentApi.checkName);

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

function renderDialog(
	props?: Partial<Parameters<typeof CreateAgentDialog>[0]>,
) {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		onCreateAgent: vi.fn(),
		...props,
	};
	return {
		...render(<CreateAgentDialog {...defaultProps} />, {
			wrapper: createWrapper(),
		}),
		...defaultProps,
	};
}

describe("CreateAgentDialog", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		mockedCheckName.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("shows required error when input is touched then cleared", async () => {
		mockedCheckName.mockResolvedValue({ available: true });
		renderDialog();

		const input = screen.getByLabelText("Name of agent");
		await userEvent.type(input, "x");
		await userEvent.clear(input);
		fireEvent.blur(input);

		expect(screen.getByText("Agent name is required")).toBeInTheDocument();
	});

	it("shows name taken error when API returns unavailable", async () => {
		mockedCheckName.mockResolvedValue({ available: false });
		renderDialog();

		const input = screen.getByLabelText("Name of agent");
		await userEvent.type(input, "ExistingAgent");

		// Advance past debounce
		vi.advanceTimersByTime(300);

		await waitFor(() => {
			expect(
				screen.getByText("An agent with this name already exists"),
			).toBeInTheDocument();
		});
	});

	it("shows available confirmation when API returns available", async () => {
		mockedCheckName.mockResolvedValue({ available: true });
		renderDialog();

		const input = screen.getByLabelText("Name of agent");
		await userEvent.type(input, "UniqueAgent");

		vi.advanceTimersByTime(300);

		await waitFor(() => {
			expect(screen.getByText("Name is available")).toBeInTheDocument();
		});
	});

	it("disables submit when name is empty", () => {
		renderDialog();

		const submitBtn = screen.getByRole("button", { name: "Create agent" });
		expect(submitBtn).toBeDisabled();
	});

	it("disables submit when name is taken", async () => {
		mockedCheckName.mockResolvedValue({ available: false });
		renderDialog();

		const input = screen.getByLabelText("Name of agent");
		await userEvent.type(input, "TakenName");

		vi.advanceTimersByTime(300);

		await waitFor(() => {
			const submitBtn = screen.getByRole("button", { name: "Create agent" });
			expect(submitBtn).toBeDisabled();
		});
	});

	it("enables submit when name is available", async () => {
		mockedCheckName.mockResolvedValue({ available: true });
		renderDialog();

		const input = screen.getByLabelText("Name of agent");
		await userEvent.type(input, "NewAgent");

		vi.advanceTimersByTime(300);

		await waitFor(() => {
			const submitBtn = screen.getByRole("button", { name: "Create agent" });
			expect(submitBtn).toBeEnabled();
		});
	});

	it("does not show required error before interaction", () => {
		renderDialog();

		expect(
			screen.queryByText("Agent name is required"),
		).not.toBeInTheDocument();
	});
});
