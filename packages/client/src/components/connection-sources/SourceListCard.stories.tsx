import type { Meta, StoryObj } from "@storybook/react";
import { Globe } from "lucide-react";
import {
	type ConnectionSource,
	SOURCES,
	STATUS,
} from "@/constants/connectionSources";
import { SourceListCard } from "./SourceListCard";

const createMockSource = (
	overrides: Partial<ConnectionSource> = {},
): ConnectionSource => ({
	id: "source-123",
	type: SOURCES.CONFLUENCE,
	title: "Confluence",
	status: STATUS.CONNECTED,
	lastSync: "5 minutes ago",
	badges: [],
	settings: {
		url: "https://company.atlassian.net/wiki",
		email: "user@company.com",
	},
	...overrides,
});

const meta: Meta<typeof SourceListCard> = {
	component: SourceListCard,
	title: "Features/Connections/Source List Card",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => (
			<div className="w-full max-w-xl p-4">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof SourceListCard>;

export const Default: Story = {
	args: {
		source: createMockSource(),
		isEnabled: true,
		actionLabel: "Manage",
		lastSyncLabel: "Last synced {time}",
	},
};

export const Enabled: Story = {
	args: {
		source: createMockSource({ status: STATUS.CONNECTED }),
		isEnabled: true,
		actionLabel: "Manage",
		lastSyncLabel: "Last synced {time}",
	},
};

export const Disabled: Story = {
	args: {
		source: createMockSource({ status: STATUS.NOT_CONNECTED }),
		isEnabled: false,
		disabledLabel: "Coming Soon",
	},
};

export const Placeholder: Story = {
	args: {
		source: createMockSource({
			id: "placeholder-jira",
			type: SOURCES.JIRA,
			title: "Jira",
			status: STATUS.NOT_CONNECTED,
			description: "Import tickets from Jira for autopilot clustering.",
		}),
		isEnabled: false,
		isPlaceholder: true,
		disabledLabel: "Coming Soon",
	},
};

export const NotConnected: Story = {
	args: {
		source: createMockSource({
			status: STATUS.NOT_CONNECTED,
			lastSync: undefined,
		}),
		isEnabled: true,
		actionLabel: "Configure",
	},
};

export const WithBadges: Story = {
	args: {
		source: createMockSource({
			badges: ["Engineering", "Product", "Design"],
		}),
		isEnabled: true,
		actionLabel: "Manage",
		lastSyncLabel: "Last synced {time}",
	},
};

export const WithDescription: Story = {
	args: {
		source: createMockSource({
			description:
				"Use web results to supplement answers when knowledge isn't found.",
		}),
		isEnabled: true,
		actionLabel: "Manage",
	},
};

export const ServiceNow: Story = {
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
		isEnabled: true,
		actionLabel: "Manage",
		lastSyncLabel: "Last synced {time}",
	},
};

export const WebSearch: Story = {
	args: {
		source: createMockSource({
			type: SOURCES.WEB_SEARCH,
			title: "Web Search (LGA)",
			status: STATUS.CONNECTED,
			description:
				"Use web results to supplement answers when knowledge isn't found.",
		}),
		isEnabled: false,
		disabledLabel: "Coming Soon",
		icon: <Globe className="h-5 w-5 flex-shrink-0" />,
	},
};

export const Syncing: Story = {
	args: {
		source: createMockSource({ status: STATUS.SYNCING }),
		isEnabled: true,
		actionLabel: "Manage",
	},
};

export const ErrorStatus: Story = {
	args: {
		source: createMockSource({ status: STATUS.ERROR }),
		isEnabled: true,
		actionLabel: "Manage",
	},
};

export const Freshdesk: Story = {
	args: {
		source: createMockSource({
			id: "placeholder-freshdesk",
			type: SOURCES.FRESHDESK,
			title: "Freshdesk",
			status: STATUS.NOT_CONNECTED,
			description: "Import tickets from Freshdesk for autopilot clustering.",
		}),
		isEnabled: false,
		isPlaceholder: true,
		disabledLabel: "Coming Soon",
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="space-y-4">
			<div>
				<p className="text-sm text-muted-foreground mb-2">Enabled + Connected</p>
				<SourceListCard
					source={createMockSource({ status: STATUS.CONNECTED })}
					isEnabled={true}
					actionLabel="Manage"
					lastSyncLabel="Last synced {time}"
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">
					Enabled + Not Connected
				</p>
				<SourceListCard
					source={createMockSource({
						status: STATUS.NOT_CONNECTED,
						lastSync: undefined,
					})}
					isEnabled={true}
					actionLabel="Configure"
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Disabled</p>
				<SourceListCard
					source={createMockSource({ status: STATUS.NOT_CONNECTED })}
					isEnabled={false}
					disabledLabel="Coming Soon"
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Placeholder (Jira)</p>
				<SourceListCard
					source={createMockSource({
						id: "placeholder-jira",
						type: SOURCES.JIRA,
						title: "Jira",
						status: STATUS.NOT_CONNECTED,
						description: "Import tickets from Jira for autopilot clustering.",
					})}
					isEnabled={false}
					isPlaceholder={true}
					disabledLabel="Coming Soon"
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Placeholder (Freshdesk)</p>
				<SourceListCard
					source={createMockSource({
						id: "placeholder-freshdesk",
						type: SOURCES.FRESHDESK,
						title: "Freshdesk",
						status: STATUS.NOT_CONNECTED,
						description: "Import tickets from Freshdesk for autopilot clustering.",
					})}
					isEnabled={false}
					isPlaceholder={true}
					disabledLabel="Coming Soon"
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">With Badges</p>
				<SourceListCard
					source={createMockSource({
						badges: ["Engineering", "Product"],
					})}
					isEnabled={true}
					actionLabel="Manage"
					lastSyncLabel="Last synced {time}"
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">
					Web Search (Custom Icon)
				</p>
				<SourceListCard
					source={createMockSource({
						type: SOURCES.WEB_SEARCH,
						title: "Web Search (LGA)",
						status: STATUS.CONNECTED,
						description:
							"Use web results to supplement answers when knowledge isn't found.",
					})}
					isEnabled={false}
					disabledLabel="Coming Soon"
					icon={<Globe className="h-5 w-5 flex-shrink-0" />}
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Error Status</p>
				<SourceListCard
					source={createMockSource({ status: STATUS.ERROR })}
					isEnabled={true}
					actionLabel="Manage"
				/>
			</div>
		</div>
	),
};
