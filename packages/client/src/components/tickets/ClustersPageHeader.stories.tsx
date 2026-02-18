import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../../i18n";
import { ClustersPageHeader } from "./ClustersPageHeader";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false, gcTime: 0 },
	},
});

const meta = {
	title: "Features/Tickets/ClustersPageHeader",
	component: ClustersPageHeader,
	parameters: {
		layout: "padded",
	},
	args: {
		onPeriodChange: fn(),
		onSettingsClick: fn(),
		showSkeletons: false,
		hasNoModel: false,
	},
	decorators: [
		(Story) => (
			<QueryClientProvider client={queryClient}>
				<Story />
			</QueryClientProvider>
		),
	],
} satisfies Meta<typeof ClustersPageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		totalTickets: 1234,
		period: "last90",
	},
};

export const Loading: Story = {
	args: {
		showSkeletons: true,
		totalTickets: 0,
		period: "last90",
	},
};

export const NoModel: Story = {
	args: {
		hasNoModel: true,
		totalTickets: 0,
		showSkeletons: false,
		period: "last90",
	},
};

export const Last30Days: Story = {
	args: {
		period: "last30",
		totalTickets: 567,
	},
};
