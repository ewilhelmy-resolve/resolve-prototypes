import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/test/mocks/providers";
import { ClustersPageHeader } from "./ClustersPageHeader";

vi.mock("@/hooks/api/useAutopilotSettings", () => ({
	useAutopilotSettings: () => ({
		data: { cost_per_ticket: 25, avg_time_per_ticket_minutes: 15 },
	}),
}));

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
	Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

const defaultProps = {
	period: "last30" as const,
	onPeriodChange: vi.fn(),
	showSkeletons: false,
	hasNoModel: false,
	onSettingsClick: vi.fn(),
};

function renderHeader(
	props: Partial<Parameters<typeof ClustersPageHeader>[0]> = {},
) {
	return render(
		<QueryWrapper>
			<ClustersPageHeader {...defaultProps} totalTickets={0} {...props} />
		</QueryWrapper>,
	);
}

describe("ClustersPageHeader", () => {
	it("calculates stats with automated tickets", () => {
		renderHeader({ totalTickets: 200, automatedTickets: 50 });

		expect(screen.getByText("200")).toBeInTheDocument();
		expect(screen.getByText("50")).toBeInTheDocument();
		expect(screen.getByText("25%")).toBeInTheDocument();
		expect(screen.getByText("$1.3k")).toBeInTheDocument();
		expect(screen.getByText("12.5hr")).toBeInTheDocument();
	});

	it("defaults automatedTickets to 0", () => {
		renderHeader({ totalTickets: 100 });

		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.getByText("0%")).toBeInTheDocument();
		expect(screen.getByText("$0")).toBeInTheDocument();
		expect(screen.getByText("0min")).toBeInTheDocument();
	});

	it("avoids division by zero when totalTickets is 0", () => {
		renderHeader({ totalTickets: 0, automatedTickets: 0 });

		expect(screen.getByText("0%")).toBeInTheDocument();
		expect(screen.queryByText("NaN")).not.toBeInTheDocument();
	});

	it("formats money under $1000 without k suffix", () => {
		renderHeader({ totalTickets: 100, automatedTickets: 10 });

		expect(screen.getByText("$250")).toBeInTheDocument();
	});

	it("formats time under 60min without hr suffix", () => {
		renderHeader({ totalTickets: 100, automatedTickets: 3 });

		expect(screen.getByText("45min")).toBeInTheDocument();
	});

	it("shows skeletons when loading", () => {
		renderHeader({
			totalTickets: 100,
			automatedTickets: 50,
			showSkeletons: true,
		});

		expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
	});

	it("calls onSettingsClick when settings button is clicked", async () => {
		const onSettingsClick = vi.fn();
		const user = userEvent.setup();
		renderHeader({ totalTickets: 100, onSettingsClick });

		const btn = screen.getByRole("button", { name: "ticketSettings.title" });
		await user.click(btn);
		expect(onSettingsClick).toHaveBeenCalledTimes(1);
	});

	it("calls onPeriodChange with selected period", async () => {
		const onPeriodChange = vi.fn();
		const user = userEvent.setup();
		renderHeader({ totalTickets: 100, period: "last30", onPeriodChange });

		await user.click(
			screen.getByRole("button", { name: "groups.periods.last30Days" }),
		);
		await user.click(screen.getByText("groups.periods.last90Days"));
		expect(onPeriodChange).toHaveBeenCalledWith("last90");
	});
});
