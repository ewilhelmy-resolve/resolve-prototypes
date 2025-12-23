import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfluenceForm } from "./ConfluenceForm";
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
	id: "confluence-123",
	organization_id: "org-123",
	type: "confluence",
	name: "Confluence",
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
	id: "confluence-123",
	type: SOURCES.CONFLUENCE,
	title: "Confluence",
	status: STATUS.NOT_CONNECTED,
	badges: [],
	settings: {},
	backendData: createMockBackendData(),
	...overrides,
});

// Pre-defined sources for different stories
const emptySource = createMockSource();

const existingDataSource = createMockSource({
	status: STATUS.CONNECTED,
	settings: {
		url: "https://company.atlassian.net/wiki",
		email: "admin@company.com",
	},
	backendData: createMockBackendData({
		enabled: true,
		settings: {
			url: "https://company.atlassian.net/wiki",
			email: "admin@company.com",
			spaces: "Engineering,Product,Design",
		},
		last_sync_status: "completed",
		last_sync_at: new Date().toISOString(),
		last_verification_at: new Date().toISOString(),
	}),
});

const errorSource = createMockSource({
	status: STATUS.ERROR,
	backendData: createMockBackendData({
		settings: {
			url: "https://company.atlassian.net/wiki",
			email: "admin@company.com",
		},
		last_verification_at: new Date().toISOString(),
		last_verification_error:
			"Invalid API token. Please check your credentials and try again.",
	}),
});

const meta: Meta<typeof ConfluenceForm> = {
	component: ConfluenceForm,
	title: "Connection Sources/Forms/ConfluenceForm",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof ConfluenceForm>;

export const Empty: Story = {
	args: {
		onCancel: fn(),
		onSuccess: fn(),
		onFailure: fn(),
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
		onSuccess: fn(),
		onFailure: fn(),
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

export const WithVerificationError: Story = {
	args: {
		onCancel: fn(),
		onSuccess: fn(),
		onFailure: fn(),
	},
	decorators: [
		(Story) => (
			<QueryClientProvider client={queryClient}>
				<ConnectionSourceProvider source={errorSource}>
					<div className="w-full max-w-xl p-4">
						<Story />
					</div>
				</ConnectionSourceProvider>
			</QueryClientProvider>
		),
	],
};

export const WithoutCancelButton: Story = {
	args: {
		onSuccess: fn(),
		onFailure: fn(),
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
