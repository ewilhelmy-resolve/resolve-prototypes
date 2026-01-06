import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { MemoryRouter } from "react-router-dom";
import {
	type ConnectionSource,
	SOURCES,
	STATUS,
} from "@/constants/connectionSources";
import { ConnectionStatusCard } from "./ConnectionStatusCard";

const createMockSource = (
	overrides: Partial<ConnectionSource> = {},
): ConnectionSource => ({
	id: "source-123",
	type: SOURCES.CONFLUENCE,
	title: "Confluence",
	status: STATUS.CONNECTED,
	lastSync: "5 minutes ago",
	badges: ["Engineering", "Product"],
	settings: {
		url: "https://company.atlassian.net/wiki",
		email: "user@company.com",
	},
	...overrides,
});

const meta: Meta<typeof ConnectionStatusCard> = {
	component: ConnectionStatusCard,
	title: "Features/Connections/Status Card",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => (
			<MemoryRouter>
				<div className="w-full max-w-xl p-4">
					<Story />
				</div>
			</MemoryRouter>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ConnectionStatusCard>;

export const Connected: Story = {
	args: {
		source: createMockSource({ status: STATUS.CONNECTED }),
	},
};

export const Syncing: Story = {
	args: {
		source: createMockSource({ status: STATUS.SYNCING }),
	},
};

export const Verifying: Story = {
	args: {
		source: createMockSource({ status: STATUS.VERIFYING }),
	},
};

export const ErrorStatus: Story = {
	args: {
		source: createMockSource({ status: STATUS.ERROR }),
		onRetry: fn(),
	},
};

export const Cancelled: Story = {
	args: {
		source: createMockSource({ status: STATUS.CANCELLED }),
	},
};

export const NotConnected: Story = {
	args: {
		source: createMockSource({ status: STATUS.NOT_CONNECTED }),
	},
};

export const ServiceNowSource: Story = {
	args: {
		source: createMockSource({
			type: SOURCES.SERVICENOW,
			title: "ServiceNow",
			status: STATUS.CONNECTED,
			settings: {
				instanceUrl: "https://company.service-now.com",
				username: "admin",
			},
		}),
	},
};

export const WithTicketSync: Story = {
	args: {
		source: createMockSource({
			type: SOURCES.SERVICENOW,
			title: "ServiceNow",
			status: STATUS.CONNECTED,
		}),
		ticketSyncInfo: {
			lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
			recordsProcessed: 150,
			isTicketSyncing: false,
		},
	},
};

export const TicketSyncInProgress: Story = {
	args: {
		source: createMockSource({
			type: SOURCES.SERVICENOW,
			title: "ServiceNow",
			status: STATUS.CONNECTED,
		}),
		ticketSyncInfo: {
			lastSyncAt: null,
			recordsProcessed: 45,
			isTicketSyncing: true,
			totalEstimated: 150,
		},
	},
};

export const TicketSyncNoTotal: Story = {
	args: {
		source: createMockSource({
			type: SOURCES.SERVICENOW,
			title: "ServiceNow",
			status: STATUS.CONNECTED,
		}),
		ticketSyncInfo: {
			lastSyncAt: null,
			recordsProcessed: 45,
			isTicketSyncing: true,
		},
	},
};

export const AllStatuses: Story = {
	render: () => (
		<div className="space-y-4">
			<div>
				<p className="text-sm text-muted-foreground mb-2">Connected</p>
				<ConnectionStatusCard
					source={createMockSource({ status: STATUS.CONNECTED })}
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Syncing</p>
				<ConnectionStatusCard
					source={createMockSource({ status: STATUS.SYNCING })}
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Verifying</p>
				<ConnectionStatusCard
					source={createMockSource({ status: STATUS.VERIFYING })}
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Error</p>
				<ConnectionStatusCard
					source={createMockSource({ status: STATUS.ERROR })}
					onRetry={fn()}
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Cancelled</p>
				<ConnectionStatusCard
					source={createMockSource({ status: STATUS.CANCELLED })}
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Not Connected</p>
				<ConnectionStatusCard
					source={createMockSource({ status: STATUS.NOT_CONNECTED })}
				/>
			</div>
		</div>
	),
};
