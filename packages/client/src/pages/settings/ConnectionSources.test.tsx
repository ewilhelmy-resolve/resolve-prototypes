/**
 * ConnectionSources.test.tsx - Unit tests for ConnectionSources component
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSourceConnection } from "@/types/dataSource";
import ConnectionSources from "./ConnectionSources";

// Mock hooks
const mockSeedMutation = {
	mutate: vi.fn(),
	isPending: false,
};

const mockDataSourcesQuery = {
	data: null as DataSourceConnection[] | null,
	isLoading: false,
	error: null as Error | null,
};

vi.mock("@/hooks/useDataSources", () => ({
	useSeedDataSources: vi.fn(() => mockSeedMutation),
	useDataSources: vi.fn(() => mockDataSourcesQuery),
}));

// Mock data
const createMockDataSource = (
	overrides?: Partial<DataSourceConnection>,
): DataSourceConnection => ({
	id: "source-123",
	organization_id: "org-123",
	type: "confluence",
	name: "Confluence",
	description: "Test description",
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

const renderWithRouter = (component: React.ReactElement) => {
	return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe("ConnectionSources", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSeedMutation.isPending = false;
		mockDataSourcesQuery.data = null;
		mockDataSourcesQuery.isLoading = false;
		mockDataSourcesQuery.error = null;
	});

	describe("Loading State", () => {
		it("should show loading state when data is loading", () => {
			mockDataSourcesQuery.isLoading = true;
			renderWithRouter(<ConnectionSources />);

			expect(screen.getByText("Loading connections...")).toBeInTheDocument();
		});

		it("should show loading state when seeding is in progress", () => {
			mockSeedMutation.isPending = true;
			renderWithRouter(<ConnectionSources />);

			expect(screen.getByText("Loading connections...")).toBeInTheDocument();
		});

		it("should call seedSources on mount", () => {
			renderWithRouter(<ConnectionSources />);
			expect(mockSeedMutation.mutate).toHaveBeenCalledTimes(1);
		});
	});

	describe("Error State", () => {
		it("should show error message when data fetch fails", () => {
			mockDataSourcesQuery.error = new Error("Failed to fetch");
			renderWithRouter(<ConnectionSources />);

			expect(
				screen.getByText("Failed to load data sources. Please try again."),
			).toBeInTheDocument();
		});

		it("should still show header when error occurs", () => {
			mockDataSourcesQuery.error = new Error("Failed to fetch");
			renderWithRouter(<ConnectionSources />);

			expect(screen.getByText("Connection Sources")).toBeInTheDocument();
		});
	});

	describe("Header", () => {
		it("should render header with title", () => {
			mockDataSourcesQuery.data = [];
			renderWithRouter(<ConnectionSources />);

			expect(screen.getByText("Connection Sources")).toBeInTheDocument();
		});

		it("should render header with description", () => {
			mockDataSourcesQuery.data = [];
			renderWithRouter(<ConnectionSources />);

			expect(
				screen.getByText(
					/Connect your knowledge and ticketing sources to help Rita resolve IT issues faster/,
				),
			).toBeInTheDocument();
		});
	});

	describe("Data Sources List", () => {
		it("should render empty list when no data sources", () => {
			mockDataSourcesQuery.data = [];
			renderWithRouter(<ConnectionSources />);

			expect(screen.getByText("Connection Sources")).toBeInTheDocument();
			// No source cards should be rendered
			expect(screen.queryByRole("link")).not.toBeInTheDocument();
		});

		it("should render single data source", () => {
			const source = createMockDataSource();
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			expect(screen.getByText("Confluence")).toBeInTheDocument();
		});

		it("should render multiple data sources", () => {
			const sources = [
				createMockDataSource({
					id: "1",
					type: "confluence",
					name: "Confluence",
				}),
				createMockDataSource({
					id: "2",
					type: "sharepoint",
					name: "SharePoint",
				}),
				createMockDataSource({
					id: "3",
					type: "servicenow",
					name: "ServiceNow",
				}),
			];
			mockDataSourcesQuery.data = sources;
			renderWithRouter(<ConnectionSources />);

			expect(screen.getByText("Confluence")).toBeInTheDocument();
			expect(screen.getByText("SharePoint")).toBeInTheDocument();
			expect(screen.getByText("ServiceNow")).toBeInTheDocument();
		});
	});

	describe("Source Ordering", () => {
		it("should sort sources in correct order: confluence, sharepoint, servicenow, websearch", () => {
			const sources = [
				createMockDataSource({
					id: "4",
					type: "websearch",
					name: "Web Search",
				}),
				createMockDataSource({
					id: "2",
					type: "sharepoint",
					name: "SharePoint",
				}),
				createMockDataSource({
					id: "3",
					type: "servicenow",
					name: "ServiceNow",
				}),
				createMockDataSource({
					id: "1",
					type: "confluence",
					name: "Confluence",
				}),
			];
			mockDataSourcesQuery.data = sources;
			renderWithRouter(<ConnectionSources />);

			const cards = screen.getAllByRole("link");
			const titles = cards.map((card) => card.textContent);

			// Verify order (titles will include status and other info)
			expect(titles[0]).toContain("Confluence");
			expect(titles[1]).toContain("SharePoint");
			expect(titles[2]).toContain("ServiceNow");
			expect(titles[3]).toContain("Web Search");
		});
	});

	describe("Source Card Content", () => {
		it("should display source title from SOURCES constant", () => {
			const source = createMockDataSource({ type: "confluence" });
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			// Title comes from SOURCES constant, not the name field
			expect(screen.getByText("Confluence")).toBeInTheDocument();
		});

		it("should not display description in list view", () => {
			const source = createMockDataSource({ type: "confluence" });
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			// Description is only shown on detail page, not in list view
			// The component uses source.description which comes from mapDataSourceToUI
			// but the ConnectionSources component has a conditional that checks for it
			expect(screen.queryByText(/Integrate with/)).not.toBeInTheDocument();
		});

		it("should show last sync when available", () => {
			const source = createMockDataSource({
				last_sync_at: "2024-01-02T00:00:00Z",
			});
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			// Last sync should be shown
			expect(screen.getByText(/Last sync:/)).toBeInTheDocument();
		});

		it("should display status badge", () => {
			const source = createMockDataSource({ status: "idle" });
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			// Status badge should be rendered (Connected for idle status)
			expect(screen.getByText("Connected")).toBeInTheDocument();
		});

		it("should display last sync information when available", () => {
			const source = createMockDataSource({
				last_sync_at: "2024-01-02T00:00:00Z",
			});
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			// Last sync text should be present
			expect(screen.getByText(/Last sync:/)).toBeInTheDocument();
		});

		it("should display badges", () => {
			const source = createMockDataSource({
				settings: { spaces: "ENG,PROD" },
			});
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			expect(screen.getByText("ENG")).toBeInTheDocument();
			expect(screen.getByText("PROD")).toBeInTheDocument();
		});
	});

	describe("Source Icons", () => {
		it("should display icon for Confluence", () => {
			const source = createMockDataSource({ type: "confluence" });
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			const icon = screen.getByAltText("Confluence icon");
			expect(icon).toHaveAttribute("src", "/connections/icon_confluence.svg");
		});

		it("should display icon for SharePoint", () => {
			const source = createMockDataSource({
				type: "sharepoint",
				name: "SharePoint",
			});
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			const icon = screen.getByAltText("SharePoint icon");
			expect(icon).toHaveAttribute("src", "/connections/icon_sharepoint.svg");
		});

		it("should display Globe icon for Web Search", () => {
			const source = createMockDataSource({
				type: "websearch",
				name: "Web Search",
			});
			mockDataSourcesQuery.data = [source];
			const { container } = renderWithRouter(<ConnectionSources />);

			// Globe component should be rendered (Lucide icon)
			const globeIcon = container.querySelector(".lucide-globe");
			expect(globeIcon).toBeInTheDocument();
		});
	});

	describe("Source Actions", () => {
		it('should show "Configure" button for not connected sources', () => {
			const source = createMockDataSource({
				status: "idle",
				last_verification_at: null,
			});
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			expect(screen.getByText("Configure")).toBeInTheDocument();
		});

		it('should show "Manage" button for connected sources', () => {
			const source = createMockDataSource({
				status: "idle",
				last_verification_at: "2024-01-01T00:00:00Z",
			});
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			expect(screen.getByText("Manage")).toBeInTheDocument();
		});
	});

	describe("Navigation", () => {
		it("should link to source detail page", () => {
			const source = createMockDataSource({ id: "source-123" });
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("href", "/settings/connections/source-123");
		});

		it("should create separate links for each source", () => {
			const sources = [
				createMockDataSource({ id: "1", type: "confluence" }),
				createMockDataSource({ id: "2", type: "sharepoint" }),
			];
			mockDataSourcesQuery.data = sources;
			renderWithRouter(<ConnectionSources />);

			const links = screen.getAllByRole("link");
			expect(links).toHaveLength(2);
			expect(links[0]).toHaveAttribute("href", "/settings/connections/1");
			expect(links[1]).toHaveAttribute("href", "/settings/connections/2");
		});
	});

	describe("Status Variations", () => {
		it("should render source with VERIFYING status", () => {
			const source = createMockDataSource({ status: "verifying" });
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			expect(screen.getByText("Verifying...")).toBeInTheDocument();
		});

		it("should render source with SYNCING status", () => {
			const source = createMockDataSource({ status: "syncing" });
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			expect(screen.getByText("Syncing...")).toBeInTheDocument();
		});

		it("should render source with error last_sync_status", () => {
			const source = createMockDataSource({
				status: "idle",
				last_sync_status: "failed",
				last_sync_error: "Connection timeout",
			});
			mockDataSourcesQuery.data = [source];
			renderWithRouter(<ConnectionSources />);

			// Should show Failed status
			expect(screen.getByText("Failed")).toBeInTheDocument();
		});
	});
});
