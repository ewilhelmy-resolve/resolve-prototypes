import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestProviders } from "@/test/mocks/providers";
import type { AgentTableRow } from "@/types/agent";
import { AgentsTable } from "./AgentsTable";

function makeRow(overrides: Partial<AgentTableRow> = {}): AgentTableRow {
	return {
		id: "eid-1",
		name: "Agent One",
		description: "desc",
		state: "DRAFT",
		skills: [],
		updatedBy: "someone@else.com",
		owner: "someone@else.com",
		lastUpdated: "2026-04-20",
		...overrides,
	};
}

describe('AgentsTable — "Me" rendering in Updated by column', () => {
	it('renders the "Me" translation when updatedBy matches currentUserEmail', () => {
		const currentUserEmail = "me@example.com";
		const agents: AgentTableRow[] = [
			makeRow({ id: "a1", updatedBy: "me@example.com" }),
		];

		render(
			<TestProviders>
				<AgentsTable agents={agents} currentUserEmail={currentUserEmail} />
			</TestProviders>,
		);

		// Translation stub surfaces the key verbatim
		expect(screen.getByText("table.updatedByMe")).toBeInTheDocument();
		expect(screen.queryByText("me@example.com")).not.toBeInTheDocument();
	});

	it("renders the raw email when updatedBy does not match currentUserEmail", () => {
		const currentUserEmail = "me@example.com";
		const agents: AgentTableRow[] = [
			makeRow({ id: "a2", updatedBy: "other@example.com" }),
		];

		render(
			<TestProviders>
				<AgentsTable agents={agents} currentUserEmail={currentUserEmail} />
			</TestProviders>,
		);

		expect(screen.getByText("other@example.com")).toBeInTheDocument();
		expect(screen.queryByText("table.updatedByMe")).not.toBeInTheDocument();
	});

	it('does not render "Me" when currentUserEmail is undefined, even if updatedBy is set', () => {
		const agents: AgentTableRow[] = [
			makeRow({ id: "a3", updatedBy: "someone@example.com" }),
		];

		render(
			<TestProviders>
				<AgentsTable agents={agents} />
			</TestProviders>,
		);

		expect(screen.getByText("someone@example.com")).toBeInTheDocument();
		expect(screen.queryByText("table.updatedByMe")).not.toBeInTheDocument();
	});
});
