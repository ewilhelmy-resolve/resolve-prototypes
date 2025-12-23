import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WebSearchForm } from "./WebSearchForm";
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
	id: "websearch-123",
	organization_id: "org-123",
	type: "websearch",
	name: "Web Search",
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
	id: "websearch-123",
	type: SOURCES.WEB_SEARCH,
	title: "Web Search",
	status: STATUS.NOT_CONNECTED,
	badges: [],
	settings: {},
	backendData: createMockBackendData(),
	...overrides,
});

// Pre-defined source
const emptySource = createMockSource();

const meta: Meta<typeof WebSearchForm> = {
	component: WebSearchForm,
	title: "Connection Sources/Forms/WebSearchForm",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof WebSearchForm>;

export const NotConnected: Story = {
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
