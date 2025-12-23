import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SharePointForm } from "./SharePointForm";
import { ConnectionSourceProvider } from "@/contexts/ConnectionSourceContext";
import { STATUS, SOURCES, type ConnectionSource } from "@/constants/connectionSources";
import type { DataSourceConnection } from "@/types/dataSource";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false, gcTime: 0 },
		mutations: { retry: false },
	},
});

const createMockBackendData = (
	overrides: Partial<DataSourceConnection> = {},
): DataSourceConnection => ({
	id: "sharepoint-123",
	organization_id: "org-123",
	type: "sharepoint",
	name: "SharePoint",
	description: null,
	status: "idle",
	enabled: false,
	settings: {},
	latest_options: null,
	last_sync_status: null,
	last_sync_at: null,
	last_sync_error: null,
	last_verification_at: null,
	last_verification_error: null,
	created_by: "user-123",
	updated_by: "user-123",
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	...overrides,
});

const createMockSource = (
	overrides: Partial<ConnectionSource> = {},
): ConnectionSource => ({
	id: "sharepoint-123",
	type: SOURCES.SHAREPOINT,
	title: "SharePoint",
	status: STATUS.NOT_CONNECTED,
	badges: [],
	settings: {},
	backendData: createMockBackendData(),
	...overrides,
});

// Pre-defined sources for different stories
const emptySource = createMockSource();

const existingDataSource = createMockSource({
	backendData: createMockBackendData({
		settings: {
			tenantId: "abc123-tenant-id",
			clientId: "xyz789-client-id",
			siteUrl: "https://company.sharepoint.com/sites/docs",
		},
	}),
});

const meta: Meta<typeof SharePointForm> = {
	component: SharePointForm,
	title: "Connection Sources/Forms/SharePointForm",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof SharePointForm>;

export const Empty: Story = {
	args: {
		onCancel: fn(),
	},
	decorators: [
		(Story) => (
			<QueryClientProvider client={queryClient}>
				<ConnectionSourceProvider source={emptySource}>
					<div className="w-full max-w-xl p-4">
						<Story />
					</div>
				</ConnectionSourceProvider>
			</QueryClientProvider>
		),
	],
};

export const WithExistingData: Story = {
	args: {
		onCancel: fn(),
	},
	decorators: [
		(Story) => (
			<QueryClientProvider client={queryClient}>
				<ConnectionSourceProvider source={existingDataSource}>
					<div className="w-full max-w-xl p-4">
						<Story />
					</div>
				</ConnectionSourceProvider>
			</QueryClientProvider>
		),
	],
};

export const WithoutCancelButton: Story = {
	args: {},
	decorators: [
		(Story) => (
			<QueryClientProvider client={queryClient}>
				<ConnectionSourceProvider source={emptySource}>
					<div className="w-full max-w-xl p-4">
						<Story />
					</div>
				</ConnectionSourceProvider>
			</QueryClientProvider>
		),
	],
};
