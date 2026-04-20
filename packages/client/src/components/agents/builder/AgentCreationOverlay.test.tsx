import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExecutionStep } from "@/stores/agentCreationStore";
import { AgentCreationOverlay } from "./AgentCreationOverlay";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

const noop = () => {};

const baseProps = {
	status: "creating" as const,
	inputMessage: null,
	agentName: null,
	agentId: null,
	error: null,
	onEditAgent: noop,
	onTestAgent: noop,
	onSendInput: noop,
	onRetry: noop,
	onCancel: noop,
};

function step(stepLabel: string, stepDetail: string): ExecutionStep {
	return {
		stepType: "agent_start",
		stepLabel,
		stepDetail,
		timestamp: new Date().toISOString(),
	};
}

describe("AgentCreationOverlay — progress steps", () => {
	it("collapses consecutive duplicate steps into a single row with xN badge", () => {
		const steps: ExecutionStep[] = [
			step("Starting", "Initializing agent builder..."),
			step("Analyzing", "Analyzing your requirements..."),
			step("Analyzing", "Analyzing your requirements..."),
			step("Building", "Creating agent and tasks..."),
			step("Building", "Creating agent and tasks..."),
			step("Building", "Creating agent and tasks..."),
		];

		render(<AgentCreationOverlay {...baseProps} executionSteps={steps} />);

		// Each unique phase rendered exactly once.
		expect(screen.getAllByText(/Starting/)).toHaveLength(1);
		expect(screen.getAllByText(/Analyzing/)).toHaveLength(1);
		expect(screen.getAllByText(/Building/)).toHaveLength(1);

		// Duplicates surface as count badges instead of extra rows.
		expect(screen.getByLabelText("repeated 2 times")).toBeInTheDocument(); // Analyzing ×2
		expect(screen.getByLabelText("repeated 3 times")).toBeInTheDocument(); // Building ×3
	});

	it("renders a single row per unique step when no duplicates", () => {
		const steps: ExecutionStep[] = [
			step("Starting", "Initializing agent builder..."),
			step("Analyzing", "Analyzing your requirements..."),
			step("Requirements", "Requirements analysis complete"),
		];

		render(<AgentCreationOverlay {...baseProps} executionSteps={steps} />);

		expect(screen.queryByLabelText(/repeated/)).not.toBeInTheDocument();
		expect(screen.getByText(/Starting/)).toBeInTheDocument();
		expect(screen.getByText(/Analyzing/)).toBeInTheDocument();
		expect(screen.getByText(/Requirements/)).toBeInTheDocument();
	});

	it("shows an initial spinner when no steps have arrived yet", () => {
		const { container } = render(
			<AgentCreationOverlay {...baseProps} executionSteps={[]} />,
		);
		// Loader2 animates with animate-spin — size-8 is the initial-wait variant.
		expect(container.querySelector(".animate-spin.size-8")).toBeInTheDocument();
	});

	it("renders the shell-first 'Saved' step before meta-agent phases", () => {
		const steps: ExecutionStep[] = [
			step("Saved", "Agent saved; generating instructions..."),
			step("Analyzing", "Analyzing your requirements..."),
		];

		render(<AgentCreationOverlay {...baseProps} executionSteps={steps} />);

		expect(screen.getByText(/Saved/)).toBeInTheDocument();
		expect(screen.getByText(/Analyzing/)).toBeInTheDocument();
	});
});

describe("AgentCreationOverlay — error state", () => {
	it("shows update-specific error title when mode is update", () => {
		render(
			<AgentCreationOverlay
				{...baseProps}
				status="error"
				mode="update"
				executionSteps={[]}
				error="Failed to update agent metadata: remote server returned HTTP 500 Internal Server Error"
			/>,
		);

		expect(screen.getByText("createWithAI.updateError")).toBeInTheDocument();
		expect(screen.queryByText("createWithAI.error")).not.toBeInTheDocument();
	});

	it("shows create error title when mode is create", () => {
		render(
			<AgentCreationOverlay
				{...baseProps}
				status="error"
				mode="create"
				executionSteps={[]}
				error="Something went wrong"
			/>,
		);

		expect(screen.getByText("createWithAI.error")).toBeInTheDocument();
		expect(
			screen.queryByText("createWithAI.updateError"),
		).not.toBeInTheDocument();
	});
});
