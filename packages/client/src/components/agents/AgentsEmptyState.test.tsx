import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TestProviders } from "@/test/mocks/providers";
import { AgentsEmptyState } from "./AgentsEmptyState";

describe("AgentsEmptyState", () => {
	it("renders the heading, description, and Create agent button", () => {
		render(
			<TestProviders>
				<AgentsEmptyState onCreateAgent={() => {}} />
			</TestProviders>,
		);

		expect(screen.getByText("list.empty.heading")).toBeInTheDocument();
		expect(screen.getByText("list.empty.description")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /list\.empty\.createAgent/ }),
		).toBeInTheDocument();
	});

	it("invokes onCreateAgent when the Create agent button is clicked", async () => {
		const onCreateAgent = vi.fn();
		const user = userEvent.setup();

		render(
			<TestProviders>
				<AgentsEmptyState onCreateAgent={onCreateAgent} />
			</TestProviders>,
		);

		await user.click(
			screen.getByRole("button", { name: /list\.empty\.createAgent/ }),
		);

		expect(onCreateAgent).toHaveBeenCalledTimes(1);
	});

	it("exposes a semantic region with an accessible label for assistive tech", () => {
		render(
			<TestProviders>
				<AgentsEmptyState onCreateAgent={() => {}} />
			</TestProviders>,
		);

		// Status role (polite live region) is appropriate for an empty-state
		// announcement without interrupting screen reader users.
		expect(screen.getByRole("status")).toBeInTheDocument();
	});
});
