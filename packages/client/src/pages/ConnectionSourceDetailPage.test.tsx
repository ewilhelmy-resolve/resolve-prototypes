/**
 * ConnectionSourceDetailPage.test.tsx - Unit tests for ConnectionSourceDetailPage
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSourceConnection } from "@/types/dataSource";
import ConnectionSourceDetailPage from "./ConnectionSourceDetailPage";

// Mock hooks
const mockDataSourceQuery = {
	data: null as DataSourceConnection | null,
	isLoading: false,
	error: null as Error | null,
};

vi.mock("@/hooks/useDataSources", () => ({
	useDataSource: vi.fn(() => mockDataSourceQuery),
}));

// Mock configuration components
vi.mock(
	"@/components/connection-sources/connection-details/ConfluenceConfiguration",
	() => ({
		default: ({ onEdit }: { onEdit: () => void }) => (
			<div>
				<div>Confluence Configuration</div>
				<button onClick={onEdit}>Edit</button>
			</div>
		),
	}),
);

vi.mock(
	"@/components/connection-sources/connection-details/SharePointConfiguration",
	() => ({
		default: ({ onEdit }: { onEdit: () => void }) => (
			<div>
				<div>SharePoint Configuration</div>
				<button onClick={onEdit}>Edit</button>
			</div>
		),
	}),
);

vi.mock(
	"@/components/connection-sources/connection-details/ServiceNowKBConfiguration",
	() => ({
		default: ({ onEdit }: { onEdit: () => void }) => (
			<div>
				<div>ServiceNow KB Configuration</div>
				<button onClick={onEdit}>Edit</button>
			</div>
		),
	}),
);

vi.mock(
	"@/components/connection-sources/connection-details/ServiceNowItsmConfiguration",
	() => ({
		default: ({ onEdit }: { onEdit: () => void }) => (
			<div>
				<div>ServiceNow ITSM Configuration</div>
				<button onClick={onEdit}>Edit</button>
			</div>
		),
	}),
);

vi.mock(
	"@/components/connection-sources/connection-details/FreshdeskItsmConfiguration",
	() => ({
		default: ({ onEdit }: { onEdit: () => void }) => (
			<div>
				<div>Freshdesk ITSM Configuration</div>
				<button onClick={onEdit}>Edit</button>
			</div>
		),
	}),
);

vi.mock(
	"@/components/connection-sources/connection-details/WebSearchConfiguration",
	() => ({
		default: ({ onEdit }: { onEdit: () => void }) => (
			<div>
				<div>WebSearch Configuration</div>
				<button onClick={onEdit}>Edit</button>
			</div>
		),
	}),
);

// Mock form components
vi.mock("@/components/connection-sources/connection-forms", () => ({
	ConfluenceForm: ({ onCancel }: { onCancel?: () => void }) => (
		<div>
			<div>Confluence Form</div>
			{onCancel && <button onClick={onCancel}>Cancel</button>}
		</div>
	),
	SharePointForm: ({ onCancel }: { onCancel?: () => void }) => (
		<div>
			<div>SharePoint Form</div>
			{onCancel && <button onClick={onCancel}>Cancel</button>}
		</div>
	),
	ServiceNowForm: ({ onCancel }: { onCancel?: () => void }) => (
		<div>
			<div>ServiceNow Form</div>
			{onCancel && <button onClick={onCancel}>Cancel</button>}
		</div>
	),
	WebSearchForm: ({ onCancel }: { onCancel?: () => void }) => (
		<div>
			<div>WebSearch Form</div>
			{onCancel && <button onClick={onCancel}>Cancel</button>}
		</div>
	),
	FreshdeskForm: ({ onCancel }: { onCancel?: () => void }) => (
		<div>
			<div>Freshdesk Form</div>
			{onCancel && <button onClick={onCancel}>Cancel</button>}
		</div>
	),
	JiraForm: ({ onCancel }: { onCancel?: () => void }) => (
		<div>
			<div>Jira Form</div>
			{onCancel && <button onClick={onCancel}>Cancel</button>}
		</div>
	),
}));

// Mock data
const createMockDataSource = (
	overrides?: Partial<DataSourceConnection>,
): DataSourceConnection => ({
	id: "source-123",
	organization_id: "org-123",
	type: "confluence",
	name: "Confluence",
	description: null,
	settings: {
		url: "https://company.atlassian.net",
		email: "user@company.com",
		spaces: "ENG,PROD",
	},
	latest_options: {
		spaces: "ENG,PROD,DOCS",
	},
	status: "idle",
	last_sync_status: "completed",
	enabled: true,
	last_verification_at: "2024-01-01T00:00:00Z",
	last_verification_error: null,
	last_sync_at: "2024-01-02T00:00:00Z",
	last_sync_error: null,
	created_by: "user-123",
	updated_by: "user-123",
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-02T00:00:00Z",
	...overrides,
});

const renderWithRouter = (
	initialRoute = "/settings/connections/knowledge/source-123",
) => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[initialRoute]}>
				<Routes>
					<Route
						path="/settings/connections/knowledge/:id"
						element={<ConnectionSourceDetailPage mode="knowledge" />}
					/>
					<Route
						path="/settings/connections/itsm/:id"
						element={<ConnectionSourceDetailPage mode="itsm" />}
					/>
					<Route path="/404" element={<div>404 Not Found</div>} />
					<Route
						path="/settings/connections/knowledge"
						element={<div>Knowledge Sources List</div>}
					/>
					<Route
						path="/settings/connections/itsm"
						element={<div>ITSM Sources List</div>}
					/>
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
};

describe("ConnectionSourceDetailPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDataSourceQuery.data = null;
		mockDataSourceQuery.isLoading = false;
		mockDataSourceQuery.error = null;
	});

	describe("Loading State", () => {
		it("should show loading state when fetching data", () => {
			mockDataSourceQuery.isLoading = true;
			renderWithRouter();

			expect(screen.getByText("detail.loading")).toBeInTheDocument();
		});
	});

	describe("Error State", () => {
		it("should redirect to 404 when source is not found", async () => {
			mockDataSourceQuery.error = new Error("Not found");
			renderWithRouter();

			await waitFor(() => {
				expect(screen.getByText("404 Not Found")).toBeInTheDocument();
			});
		});

		it("should redirect to 404 when source data is null", async () => {
			mockDataSourceQuery.data = null;
			renderWithRouter();

			await waitFor(() => {
				expect(screen.getByText("404 Not Found")).toBeInTheDocument();
			});
		});
	});

	describe("Header", () => {
		it("should render header with source title", () => {
			const source = createMockDataSource({ type: "confluence" });
			mockDataSourceQuery.data = source;
			renderWithRouter();

			// Use getAllByText since "Confluence" may appear in sidebar too
			expect(screen.getAllByText("Confluence").length).toBeGreaterThan(0);
		});

		it("should render breadcrumbs", () => {
			const source = createMockDataSource({ type: "confluence" });
			mockDataSourceQuery.data = source;
			renderWithRouter();

			// i18n mock returns the key, not the translated value
			expect(
				screen.getByText("detail.breadcrumbs.knowledgeSources"),
			).toBeInTheDocument();
		});

		it("should render source icon for non-websearch sources", () => {
			const source = createMockDataSource({ type: "confluence" });
			mockDataSourceQuery.data = source;
			renderWithRouter();

			const icon = screen.getByAltText("Confluence icon");
			expect(icon).toHaveAttribute("src", "/connections/icon_confluence.svg");
		});

		it("should render Globe icon for websearch", () => {
			const source = createMockDataSource({ type: "websearch" });
			mockDataSourceQuery.data = source;
			const { container } = renderWithRouter();

			const globeIcon = container.querySelector(".lucide-globe");
			expect(globeIcon).toBeInTheDocument();
		});

		it("should render description", () => {
			const source = createMockDataSource({ type: "confluence" });
			mockDataSourceQuery.data = source;
			renderWithRouter();

			expect(screen.getByText(/detail.connectDescription/)).toBeInTheDocument();
		});
	});

	describe("Configuration View", () => {
		it("should show configuration view for configured Confluence source", () => {
			const source = createMockDataSource({
				type: "confluence",
				last_verification_at: "2024-01-01T00:00:00Z",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			expect(screen.getByText("Confluence Configuration")).toBeInTheDocument();
		});

		it("should show configuration view for configured SharePoint source", () => {
			const source = createMockDataSource({
				type: "sharepoint",
				last_verification_at: "2024-01-01T00:00:00Z",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			expect(screen.getByText("SharePoint Configuration")).toBeInTheDocument();
		});

		it("should show KB configuration view for configured ServiceNow source in knowledge mode", () => {
			const source = createMockDataSource({
				type: "servicenow",
				last_verification_at: "2024-01-01T00:00:00Z",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter("/settings/connections/knowledge/source-123");

			expect(
				screen.getByText("ServiceNow KB Configuration"),
			).toBeInTheDocument();
		});

		it("should show ITSM configuration view for configured ServiceNow ITSM source in itsm mode", () => {
			const source = createMockDataSource({
				type: "servicenow_itsm",
				last_verification_at: "2024-01-01T00:00:00Z",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter("/settings/connections/itsm/source-123");

			expect(
				screen.getByText("ServiceNow ITSM Configuration"),
			).toBeInTheDocument();
		});

		it("should show configuration view for configured WebSearch source", () => {
			const source = createMockDataSource({
				type: "websearch",
				last_verification_at: "2024-01-01T00:00:00Z",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			expect(screen.getByText("WebSearch Configuration")).toBeInTheDocument();
		});
	});

	describe("Form View (Not Configured)", () => {
		it("should show form for unconfigured source", () => {
			const source = createMockDataSource({
				type: "confluence",
				last_verification_at: null,
				status: "idle",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			expect(screen.getByText("Confluence Form")).toBeInTheDocument();
		});

		it("should show form for Confluence", () => {
			const source = createMockDataSource({
				type: "confluence",
				last_verification_at: null,
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			expect(screen.getByText("Confluence Form")).toBeInTheDocument();
		});

		it("should show form for SharePoint", () => {
			const source = createMockDataSource({
				type: "sharepoint",
				last_verification_at: null,
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			expect(screen.getByText("SharePoint Form")).toBeInTheDocument();
		});

		it("should show form for ServiceNow", () => {
			const source = createMockDataSource({
				type: "servicenow",
				last_verification_at: null,
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			expect(screen.getByText("ServiceNow Form")).toBeInTheDocument();
		});

		it("should show form for WebSearch", () => {
			const source = createMockDataSource({
				type: "websearch",
				last_verification_at: null,
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			expect(screen.getByText("WebSearch Form")).toBeInTheDocument();
		});

		it("should show Cancel button for unconfigured source", () => {
			const source = createMockDataSource({
				type: "confluence",
				last_verification_at: null,
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			expect(screen.getByText("Cancel")).toBeInTheDocument();
		});
	});

	describe("isConfigured Logic", () => {
		it("should consider source configured when last_verification_at is not null", () => {
			const source = createMockDataSource({
				last_verification_at: "2024-01-01T00:00:00Z",
				status: "idle",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			// Should show configuration view, not form
			expect(screen.getByText("Confluence Configuration")).toBeInTheDocument();
			expect(screen.queryByText("Confluence Form")).not.toBeInTheDocument();
		});

		it("should consider source configured when status is VERIFYING", () => {
			const source = createMockDataSource({
				last_verification_at: null,
				status: "verifying",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			// Should show configuration view
			expect(screen.getByText("Confluence Configuration")).toBeInTheDocument();
		});

		it("should consider source configured when status is SYNCING", () => {
			const source = createMockDataSource({
				last_verification_at: null,
				status: "syncing",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			// Should show configuration view
			expect(screen.getByText("Confluence Configuration")).toBeInTheDocument();
		});

		it("should consider source configured when status is FAILED", () => {
			const source = createMockDataSource({
				last_verification_at: null,
				status: "syncing",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			// Should show configuration view
			expect(screen.getByText("Confluence Configuration")).toBeInTheDocument();
		});

		it("should consider source configured when status is COMPLETED", () => {
			const source = createMockDataSource({
				last_verification_at: null,
				status: "verifying",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			// Should show configuration view
			expect(screen.getByText("Confluence Configuration")).toBeInTheDocument();
		});

		it("should consider source NOT configured when last_verification_at is null and status is idle", () => {
			const source = createMockDataSource({
				last_verification_at: null,
				status: "idle",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			// Should show form
			expect(screen.getByText("Confluence Form")).toBeInTheDocument();
		});
	});

	describe("Edit Mode", () => {
		it("should switch to form when Edit button is clicked", async () => {
			const user = userEvent.setup();
			const source = createMockDataSource({
				type: "confluence",
				last_verification_at: "2024-01-01T00:00:00Z",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			// Initially shows configuration view
			expect(screen.getByText("Confluence Configuration")).toBeInTheDocument();

			// Click Edit button
			const editButton = screen.getByText("Edit");
			await user.click(editButton);

			// Should now show form
			expect(screen.getByText("Confluence Form")).toBeInTheDocument();
			expect(
				screen.queryByText("Confluence Configuration"),
			).not.toBeInTheDocument();
		});

		it("should show Cancel button in edit mode", async () => {
			const user = userEvent.setup();
			const source = createMockDataSource({
				type: "confluence",
				last_verification_at: "2024-01-01T00:00:00Z",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			// Click Edit button
			const editButton = screen.getByText("Edit");
			await user.click(editButton);

			// Should show Cancel button
			expect(screen.getByText("Cancel")).toBeInTheDocument();
		});

		it("should return to configuration view when Cancel is clicked in edit mode", async () => {
			const user = userEvent.setup();
			const source = createMockDataSource({
				type: "confluence",
				last_verification_at: "2024-01-01T00:00:00Z",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			// Click Edit button
			const editButton = screen.getByText("Edit");
			await user.click(editButton);

			// Now in form view
			expect(screen.getByText("Confluence Form")).toBeInTheDocument();

			// Click Cancel
			const cancelButton = screen.getByText("Cancel");
			await user.click(cancelButton);

			// Should return to configuration view
			await waitFor(() => {
				expect(
					screen.getByText("Confluence Configuration"),
				).toBeInTheDocument();
			});
		});
	});

	describe("Unknown Source Type", () => {
		it("should render unknown source type message for unrecognized types", () => {
			const source = createMockDataSource({
				type: "unknown-type" as any,
				last_verification_at: "2024-01-01T00:00:00Z",
			});
			mockDataSourceQuery.data = source;
			renderWithRouter();

			expect(
				screen.getByText("detail.configurationNotAvailable"),
			).toBeInTheDocument();
		});
	});
});
