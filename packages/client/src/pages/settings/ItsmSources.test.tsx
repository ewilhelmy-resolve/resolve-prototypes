/**
 * ItsmSources.test.tsx - Unit tests for ITSM Sources page
 *
 * Focuses on status-based sorting behavior (4-tier hierarchy):
 *   Error (0) > Syncing/Verifying (1) > Connected (2) > Cancelled/Not connected (3)
 * Within the same priority, sources maintain the fixed order from ITSM_SOURCES_ORDER.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { DataSourceConnection } from "@/types/dataSource";
import ItsmSources from "./ItsmSources";

// Mock hooks
const mockSeedMutation = { mutate: vi.fn(), isPending: false };
const mockDataSourcesQuery = {
	data: null as DataSourceConnection[] | null,
	isLoading: false,
	error: null as Error | null,
};

vi.mock("@/hooks/useDataSources", () => ({
	useSeedDataSources: vi.fn(() => mockSeedMutation),
	useDataSources: vi.fn(() => mockDataSourcesQuery),
}));

vi.mock("@/hooks/useFeatureFlags", () => ({
	useFeatureFlag: vi.fn(() => true),
}));

vi.mock("@/hooks/useActiveModel", () => ({
	useActiveModel: vi.fn(() => ({ data: null })),
}));

vi.mock("@/hooks/api/useProfile", () => ({
	useProfile: vi.fn(() => ({ data: null, isLoading: false, error: null })),
	useProfilePermissions: vi.fn(() => ({
		isOwner: () => true,
		isAdmin: () => true,
		isOwnerOrAdmin: () => true,
		canManageInvitations: () => true,
	})),
}));

// Helper to create mock data sources
const createMockDataSource = (
	overrides?: Partial<DataSourceConnection>,
): DataSourceConnection => ({
	id: "source-123",
	organization_id: "org-123",
	type: "servicenow_itsm",
	name: "ServiceNow ITSM",
	description: "Test",
	settings: {},
	latest_options: null,
	status: "idle",
	last_sync_status: null,
	enabled: true,
	auto_sync: false,
	last_verification_at: "2024-01-01T00:00:00Z",
	last_verification_error: null,
	last_sync_at: null,
	last_sync_error: null,
	created_by: "user-123",
	updated_by: "user-123",
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
	...overrides,
});

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

const renderWithRouter = (component: React.ReactElement) => {
	const queryClient = createTestQueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<SidebarProvider>{component}</SidebarProvider>
			</MemoryRouter>
		</QueryClientProvider>,
	);
};

/**
 * Extract ordered source titles from the rendered DOM.
 * SourceListCard renders the title in a <p> with class "font-bold".
 */
function getRenderedTitles(): string[] {
	const paragraphs = document.querySelectorAll("p.font-bold");
	return Array.from(paragraphs).map((el) => el.textContent ?? "");
}

describe("ItsmSources", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSeedMutation.isPending = false;
		mockDataSourcesQuery.data = null;
		mockDataSourcesQuery.isLoading = false;
		mockDataSourcesQuery.error = null;
	});

	describe("Status-Based Sorting", () => {
		it("should sort Connected sources before Not connected placeholders", () => {
			// ServiceNow is Connected (idle + verified, no error)
			// Jira has no backend entry, so it becomes a placeholder (Not connected)
			mockDataSourcesQuery.data = [
				createMockDataSource({
					id: "sn-1",
					type: "servicenow_itsm",
					name: "ServiceNow ITSM",
					status: "idle",
					enabled: true,
					last_verification_at: "2024-01-01T00:00:00Z",
					last_verification_error: null,
				}),
			];
			renderWithRouter(<ItsmSources />);

			const titles = getRenderedTitles();
			const snIndex = titles.indexOf("ServiceNow ITSM");
			const jiraIndex = titles.indexOf("Jira");

			expect(snIndex).toBeGreaterThanOrEqual(0);
			expect(jiraIndex).toBeGreaterThanOrEqual(0);
			expect(snIndex).toBeLessThan(jiraIndex);
		});

		it("should sort Error sources before Connected sources", () => {
			mockDataSourcesQuery.data = [
				// ServiceNow: Connected
				createMockDataSource({
					id: "sn-1",
					type: "servicenow_itsm",
					name: "ServiceNow ITSM",
					status: "idle",
					enabled: true,
					last_verification_at: "2024-01-01T00:00:00Z",
					last_verification_error: null,
				}),
				// Freshservice: Error (has verification error)
				createMockDataSource({
					id: "fd-1",
					type: "freshservice_itsm",
					name: "Freshservice",
					status: "idle",
					enabled: true,
					last_verification_at: "2024-01-01T00:00:00Z",
					last_verification_error: "Connection timeout",
				}),
			];
			renderWithRouter(<ItsmSources />);

			const titles = getRenderedTitles();
			const fdIndex = titles.indexOf("Freshservice");
			const snIndex = titles.indexOf("ServiceNow ITSM");

			expect(fdIndex).toBeGreaterThanOrEqual(0);
			expect(snIndex).toBeGreaterThanOrEqual(0);
			expect(fdIndex).toBeLessThan(snIndex);
		});

		it("should sort Verifying sources before Connected sources", () => {
			mockDataSourcesQuery.data = [
				// ServiceNow: Connected
				createMockDataSource({
					id: "sn-1",
					type: "servicenow_itsm",
					name: "ServiceNow ITSM",
					status: "idle",
					enabled: true,
					last_verification_at: "2024-01-01T00:00:00Z",
					last_verification_error: null,
				}),
				// Freshservice: Verifying
				createMockDataSource({
					id: "fd-1",
					type: "freshservice_itsm",
					name: "Freshservice",
					status: "verifying",
					enabled: true,
					last_verification_at: null,
					last_verification_error: null,
				}),
			];
			renderWithRouter(<ItsmSources />);

			const titles = getRenderedTitles();
			const fdIndex = titles.indexOf("Freshservice");
			const snIndex = titles.indexOf("ServiceNow ITSM");

			expect(fdIndex).toBeGreaterThanOrEqual(0);
			expect(snIndex).toBeGreaterThanOrEqual(0);
			expect(fdIndex).toBeLessThan(snIndex);
		});

		it("should sort by full status hierarchy: Error, Verifying, Connected, Not connected", () => {
			mockDataSourcesQuery.data = [
				// ServiceNow: Connected (priority 2)
				createMockDataSource({
					id: "sn-1",
					type: "servicenow_itsm",
					name: "ServiceNow ITSM",
					status: "idle",
					enabled: true,
					last_verification_at: "2024-01-01T00:00:00Z",
					last_verification_error: null,
				}),
				// Ivanti: Verifying (priority 1)
				createMockDataSource({
					id: "iv-1",
					type: "ivanti_itsm",
					name: "Ivanti",
					status: "verifying",
					enabled: true,
					last_verification_at: null,
					last_verification_error: null,
				}),
				// Freshservice: Error (priority 0)
				createMockDataSource({
					id: "fd-1",
					type: "freshservice_itsm",
					name: "Freshservice",
					status: "idle",
					enabled: true,
					last_verification_at: "2024-01-01T00:00:00Z",
					last_verification_error: "Auth failed",
				}),
				// Jira: no backend entry -> placeholder Not connected (priority 3)
			];
			renderWithRouter(<ItsmSources />);

			const titles = getRenderedTitles();
			expect(titles).toEqual([
				"Freshservice", // Error (0)
				"Ivanti", // Verifying (1)
				"ServiceNow ITSM", // Connected (2)
				"Jira", // Not connected placeholder (3)
			]);
		});

		it("should treat Syncing and Verifying as same priority", () => {
			// Both priority 1; tiebreaker is ITSM_SOURCES_ORDER:
			// servicenow_itsm (0), jira_itsm (1), ivanti_itsm (2), freshservice_itsm (3)
			mockDataSourcesQuery.data = [
				// Freshservice: Verifying (priority 1, order index 3)
				createMockDataSource({
					id: "fd-1",
					type: "freshservice_itsm",
					name: "Freshservice",
					status: "verifying",
					enabled: true,
					last_verification_at: null,
					last_verification_error: null,
				}),
				// ServiceNow: Syncing (priority 1, order index 0)
				createMockDataSource({
					id: "sn-1",
					type: "servicenow_itsm",
					name: "ServiceNow ITSM",
					status: "syncing",
					enabled: true,
					last_verification_at: "2024-01-01T00:00:00Z",
					last_verification_error: null,
				}),
			];
			renderWithRouter(<ItsmSources />);

			const titles = getRenderedTitles();
			const snIndex = titles.indexOf("ServiceNow ITSM");
			const fdIndex = titles.indexOf("Freshservice");

			// Same priority, so tiebreaker puts ServiceNow first
			expect(snIndex).toBeLessThan(fdIndex);
		});

		it("should use ITSM_SOURCES_ORDER as tiebreaker when statuses match", () => {
			// Both Connected, but ITSM_SOURCES_ORDER is:
			// servicenow_itsm (0), jira_itsm (1), ivanti_itsm (2), freshservice_itsm (3)
			mockDataSourcesQuery.data = [
				// Jira: Connected (index 1 in ITSM_SOURCES_ORDER)
				createMockDataSource({
					id: "jira-1",
					type: "jira_itsm",
					name: "Jira",
					status: "idle",
					enabled: true,
					last_verification_at: "2024-01-01T00:00:00Z",
					last_verification_error: null,
				}),
				// ServiceNow: Connected (index 0 in ITSM_SOURCES_ORDER)
				createMockDataSource({
					id: "sn-1",
					type: "servicenow_itsm",
					name: "ServiceNow ITSM",
					status: "idle",
					enabled: true,
					last_verification_at: "2024-01-01T00:00:00Z",
					last_verification_error: null,
				}),
			];
			renderWithRouter(<ItsmSources />);

			const titles = getRenderedTitles();
			const snIndex = titles.indexOf("ServiceNow ITSM");
			const jiraIndex = titles.indexOf("Jira");

			expect(snIndex).toBeLessThan(jiraIndex);
		});

		it("should sort placeholders (Not connected) after all backend sources with active statuses", () => {
			// Only ServiceNow and Freshservice have backend entries.
			// Jira and Ivanti are placeholders (Not connected).
			mockDataSourcesQuery.data = [
				// Freshservice: Syncing (priority 1)
				createMockDataSource({
					id: "fd-1",
					type: "freshservice_itsm",
					name: "Freshservice",
					status: "syncing",
					enabled: true,
					last_verification_at: "2024-01-01T00:00:00Z",
					last_verification_error: null,
				}),
				// ServiceNow: Connected (priority 3)
				createMockDataSource({
					id: "sn-1",
					type: "servicenow_itsm",
					name: "ServiceNow ITSM",
					status: "idle",
					enabled: true,
					last_verification_at: "2024-01-01T00:00:00Z",
					last_verification_error: null,
				}),
			];
			renderWithRouter(<ItsmSources />);

			const titles = getRenderedTitles();
			expect(titles).toEqual([
				"Freshservice", // Syncing (1)
				"ServiceNow ITSM", // Connected (2)
				"Jira", // Not connected placeholder (3) - order index 1
				"Ivanti", // Not connected placeholder (3) - order index 2
			]);
		});
	});
});
