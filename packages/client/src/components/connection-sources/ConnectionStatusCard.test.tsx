/**
 * ConnectionStatusCard.test.tsx - Unit tests for connection status card component
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ConnectionSource } from "@/constants/connectionSources";
import { STATUS } from "@/constants/connectionSources";
import { ConnectionStatusCard } from "./ConnectionStatusCard";

// Mock connection sources
const createMockSource = (
	overrides?: Partial<ConnectionSource>,
): ConnectionSource => ({
	id: "source-123",
	type: "confluence",
	title: "Confluence",
	status: STATUS.CONNECTED,
	lastSync: "2 hours ago",
	description: "Confluence workspace connection",
	badges: ["ENG", "PROD"],
	settings: {
		url: "https://company.atlassian.net",
		email: "user@company.com",
		token: "secret-token-123",
	},
	backendData: {
		id: "source-123",
		organization_id: "org-123",
		type: "confluence",
		name: "Confluence",
		description: null,
		settings: {
			url: "https://company.atlassian.net",
			email: "user@company.com",
			token: "secret-token-123",
		},
		latest_options: null,
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
	},
	...overrides,
});

describe("ConnectionStatusCard", () => {
	describe("Status Badge Rendering", () => {
		it("should render status badge for CONNECTED status", () => {
			const source = createMockSource({ status: STATUS.CONNECTED });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("Connected")).toBeInTheDocument();
		});

		it("should render status badge for VERIFYING status", () => {
			const source = createMockSource({ status: STATUS.VERIFYING });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("Verifying...")).toBeInTheDocument();
		});

		it("should render status badge for SYNCING status", () => {
			const source = createMockSource({ status: STATUS.SYNCING });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("Syncing...")).toBeInTheDocument();
		});

		it("should render status badge for ERROR status", () => {
			const source = createMockSource({ status: STATUS.ERROR });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("Failed")).toBeInTheDocument();
		});

		it("should render status badge for NOT_CONNECTED status", () => {
			const source = createMockSource({ status: STATUS.NOT_CONNECTED });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("Not connected")).toBeInTheDocument();
		});
	});

	describe("Connection Details Display", () => {
		it("should display URL when available", () => {
			const source = createMockSource({
				settings: { url: "https://company.atlassian.net" },
			});
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("URL")).toBeInTheDocument();
			expect(
				screen.getByText("https://company.atlassian.net"),
			).toBeInTheDocument();
		});

		it("should display email when available", () => {
			const source = createMockSource({
				settings: { email: "user@company.com" },
			});
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("Email")).toBeInTheDocument();
			expect(screen.getByText("user@company.com")).toBeInTheDocument();
		});

		it("should always display masked API token", () => {
			const source = createMockSource({
				settings: { token: "secret-token" },
			});
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("API")).toBeInTheDocument();
			expect(screen.getByText(/••••••••••••••••••••/)).toBeInTheDocument();
		});

		it("should display masked API token even when token is not set", () => {
			const source = createMockSource({
				settings: { url: "https://example.com", email: "test@example.com" },
			});
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("API")).toBeInTheDocument();
			// API should always show masked value, never "—"
			expect(screen.getByText(/••••••••••••••••••••/)).toBeInTheDocument();
		});

		it('should display "—" when URL is missing', () => {
			const source = createMockSource({ settings: {} });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("URL")).toBeInTheDocument();
			expect(screen.getAllByText("—").length).toBeGreaterThan(0);
		});
	});

	describe("Status Messages", () => {
		it("should show last sync time for CONNECTED status", () => {
			const source = createMockSource({
				status: STATUS.CONNECTED,
				lastSync: "2 hours ago",
			});
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("Last synced 2 hours ago")).toBeInTheDocument();
		});

		it('should show "Connected" when no lastSync available', () => {
			const source = createMockSource({
				status: STATUS.CONNECTED,
				lastSync: undefined,
			});
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			// There are two "Connected" texts: one in badge, one in status message
			expect(screen.getAllByText("Connected").length).toBe(2);
		});

		it('should show "Syncing connection..." for SYNCING status', () => {
			const source = createMockSource({ status: STATUS.SYNCING });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("Syncing connection...")).toBeInTheDocument();
		});

		it('should show "Verifying connection..." for VERIFYING status', () => {
			const source = createMockSource({ status: STATUS.VERIFYING });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("Verifying connection...")).toBeInTheDocument();
		});

		it('should show "Not configured" for NOT_CONNECTED status', () => {
			const source = createMockSource({ status: STATUS.NOT_CONNECTED });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText("Not configured")).toBeInTheDocument();
		});
	});

	describe("Error Handling", () => {
		it('should show "Connection failed" message for ERROR status', () => {
			const source = createMockSource({ status: STATUS.ERROR });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
		});

		it("should show Retry button for ERROR status", () => {
			const source = createMockSource({ status: STATUS.ERROR });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(
				screen.getByRole("button", { name: /Retry/i }),
			).toBeInTheDocument();
		});

		it("should call onRetry when Retry button is clicked", () => {
			const mockOnRetry = vi.fn();
			const source = createMockSource({ status: STATUS.ERROR });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} onRetry={mockOnRetry} />
				</MemoryRouter>,
			);

			const retryButton = screen.getByRole("button", { name: /Retry/i });
			fireEvent.click(retryButton);

			expect(mockOnRetry).toHaveBeenCalledTimes(1);
		});

		it("should show retry count after first retry", async () => {
			const source = createMockSource({ status: STATUS.ERROR });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);

			const retryButton = screen.getByRole("button", { name: /Retry/i });
			fireEvent.click(retryButton);

			// Wait for retry state to complete
			await waitFor(() => {
				expect(screen.getByText(/\(1\/3\)/)).toBeInTheDocument();
			});
		});

		it("should show Get Help button after 3 retries", async () => {
			const source = createMockSource({ status: STATUS.ERROR });
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);

			const retryButton = screen.getByRole("button", { name: /Retry/i });

			// Click retry 3 times
			act(() => {
				fireEvent.click(retryButton);
			});
			act(() => {
				fireEvent.click(retryButton);
			});
			act(() => {
				fireEvent.click(retryButton);
			});

			// After third click, retryCount = 3, help button should appear
			await waitFor(() =>
				expect(
					screen.getByRole("button", { name: /Get Help/i }),
				).toBeInTheDocument(),
			);
		});

		it("should show Retrying... when retry is clicked and status changes to SYNCING", () => {
			// Start with ERROR status
			const source = createMockSource({ status: STATUS.ERROR });
			const { rerender } = render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);

			const retryButton = screen.getByRole("button", { name: /Retry/i });
			fireEvent.click(retryButton);

			// After clicking retry, parent would update status to SYNCING via backend
			// Simulate this by re-rendering with SYNCING status
			const syncingSource = createMockSource({ status: STATUS.SYNCING });
			rerender(
				<MemoryRouter>
					<ConnectionStatusCard source={syncingSource} />
				</MemoryRouter>,
			);

			expect(screen.getByText(/Retrying\.\.\./)).toBeInTheDocument();
		});
	});

	describe("Card Structure", () => {
		it("should render card container", () => {
			const source = createMockSource();
			const { container } = render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			// Card should have proper structure
			expect(container.querySelector(".border")).toBeInTheDocument();
		});

		it("should display status badge in the card", () => {
			const source = createMockSource();
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			// Badge should be present (will have 2 "Connected" texts)
			expect(screen.getAllByText("Connected").length).toBeGreaterThan(0);
		});
	});

	describe("Different Connection Types", () => {
		it("should work with Confluence connection", () => {
			const source = createMockSource({
				type: "confluence",
				title: "Confluence",
			});
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getAllByText("Connected").length).toBeGreaterThan(0);
		});

		it("should work with ServiceNow connection", () => {
			const source = createMockSource({
				type: "servicenow",
				title: "ServiceNow",
			});
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getAllByText("Connected").length).toBeGreaterThan(0);
		});

		it("should work with SharePoint connection", () => {
			const source = createMockSource({
				type: "sharepoint",
				title: "SharePoint",
			});
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getAllByText("Connected").length).toBeGreaterThan(0);
		});

		it("should work with WebSearch connection", () => {
			const source = createMockSource({
				type: "websearch",
				title: "Web Search",
			});
			render(
				<MemoryRouter>
					<ConnectionStatusCard source={source} />
				</MemoryRouter>,
			);
			expect(screen.getAllByText("Connected").length).toBeGreaterThan(0);
		});
	});
});
