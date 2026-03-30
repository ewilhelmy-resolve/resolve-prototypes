import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/test/mocks/providers";
import { ClustersPageHeader } from "./ClustersPageHeader";

vi.mock("@/stores/ticketSettingsStore", () => ({
	useTicketSettingsStore: () => ({
		blendedRatePerHour: 25,
		avgMinutesPerTicket: 15,
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
	it("calculates stats using all tickets", () => {
		renderHeader({ totalTickets: 200 });

		// Total tickets
		expect(screen.getByText("200")).toBeInTheDocument();
		// Money: 200 × $25/hr × (15/60) = $1,250 → "$1.3k"
		expect(screen.getByText("$1.3k")).toBeInTheDocument();
		// Time: 200 × 15min = 3000min → "50hr"
		expect(screen.getByText("50hr")).toBeInTheDocument();
		// MTTR and reassignment show "--"
		const dashes = screen.getAllByText("--");
		expect(dashes).toHaveLength(2);
	});

	it("shows zero values when totalTickets is 0", () => {
		renderHeader({ totalTickets: 0 });

		expect(screen.getByText("$0")).toBeInTheDocument();
		expect(screen.getByText("0min")).toBeInTheDocument();
		expect(screen.queryByText("NaN")).not.toBeInTheDocument();
	});

	it("formats money under $1000 without k suffix", () => {
		// 100 tickets × $25/hr × (15/60) = $625
		renderHeader({ totalTickets: 100 });

		expect(screen.getByText("$625")).toBeInTheDocument();
	});

	it("formats time under 60min without hr suffix", () => {
		// 3 tickets × 15min = 45min
		renderHeader({ totalTickets: 3 });

		expect(screen.getByText("45min")).toBeInTheDocument();
	});

	it("shows skeletons when loading", () => {
		renderHeader({
			totalTickets: 100,
			showSkeletons: true,
		});

		// MTTR and Reassignment always render (no loading prop), so 2 headings remain
		expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(2);
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
		await user.click(await screen.findByText("groups.periods.last90Days"));
		expect(onPeriodChange).toHaveBeenCalledWith("last90");
	});

	it("renders all five stat labels", () => {
		renderHeader({ totalTickets: 100 });

		expect(screen.getByText("header.stats.totalTickets")).toBeInTheDocument();
		expect(screen.getByText("header.stats.estMoneySaved")).toBeInTheDocument();
		expect(screen.getByText("header.stats.estTimeSaved")).toBeInTheDocument();
		expect(screen.getByText("header.stats.mttr")).toBeInTheDocument();
		expect(
			screen.getByText("header.stats.avgReassignmentRate"),
		).toBeInTheDocument();
	});
});
