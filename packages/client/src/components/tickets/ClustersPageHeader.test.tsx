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

// Mock the ticket settings store with known defaults
vi.mock("@/stores/ticketSettingsStore", () => ({
	useTicketSettingsStore: () => ({
		blendedRatePerHour: 30,
		timeToTake: 12,
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

// With defaults: blendedRatePerHour=30, timeToTake=12
// moneySaved = 30 * (12/60) * totalTickets = 6 * totalTickets
// timeSavedMins = 12 * totalTickets
// timeSavedHrs = Math.floor(timeSavedMins / 60)

describe("ClustersPageHeader", () => {
	it("calculates stats from totalTickets", () => {
		// totalTickets=200: money=6*200=1200 -> "$1.2k", time=12*200=2400min -> 40hr
		renderHeader({ totalTickets: 200 });

		expect(screen.getByText("200")).toBeInTheDocument();
		expect(screen.getByText("$1.2k")).toBeInTheDocument();
		expect(screen.getByText("40hr")).toBeInTheDocument();
	});

	it("shows zero stats when totalTickets is 0", () => {
		// totalTickets=0: money=0 -> "$0", time=0min -> 0hr
		renderHeader({ totalTickets: 0 });

		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.getByText("$0")).toBeInTheDocument();
		expect(screen.getByText("0hr")).toBeInTheDocument();
	});

	it("formats money under $1000 without k suffix", () => {
		// totalTickets=100: money=6*100=600 -> "$600"
		renderHeader({ totalTickets: 100 });

		expect(screen.getByText("$600")).toBeInTheDocument();
	});

	it("formats money over $1000 with k suffix", () => {
		// totalTickets=200: money=6*200=1200 -> "$1.2k"
		renderHeader({ totalTickets: 200 });

		expect(screen.getByText("$1.2k")).toBeInTheDocument();
	});

	it("shows skeletons when loading", () => {
		renderHeader({
			totalTickets: 100,
			showSkeletons: true,
		});

		// All 3 stat cards have loading=true, so no h3 headings are rendered
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

	it("shows last synced label when provided", () => {
		renderHeader({ totalTickets: 100, lastSynced: "5 minutes ago" });

		expect(screen.getByText("header.lastSynced")).toBeInTheDocument();
	});

	it("does not show last synced label when not provided", () => {
		renderHeader({ totalTickets: 100 });

		expect(screen.queryByText("header.lastSynced")).not.toBeInTheDocument();
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
