/**
 * ConnectionStatusCard.test.tsx - Unit tests for connection status card component
 */

import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
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

// Wrapper to provide Router context
const renderWithRouter = (ui: React.ReactElement) => {
	return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe("ConnectionStatusCard", () => {
	describe("Basic Rendering", () => {
		it("should render without crashing", () => {
			const source = createMockSource();
			renderWithRouter(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Connected")).toBeInTheDocument();
		});

		it("should render credentials section with URL", () => {
			const source = createMockSource({
				settings: {
					url: "https://company.atlassian.net",
					email: "user@company.com",
				},
			});
			renderWithRouter(<ConnectionStatusCard source={source} />);

			// Check URL label (i18n key)
			expect(screen.getByText("statusCard.labels.url")).toBeInTheDocument();
			// Check URL value
			expect(
				screen.getByText("https://company.atlassian.net"),
			).toBeInTheDocument();
		});

		it("should render credentials section with email", () => {
			const source = createMockSource({
				settings: {
					url: "https://company.atlassian.net",
					email: "user@company.com",
				},
			});
			renderWithRouter(<ConnectionStatusCard source={source} />);

			// Check email label (i18n key)
			expect(screen.getByText("statusCard.labels.email")).toBeInTheDocument();
			// Check email value
			expect(screen.getByText("user@company.com")).toBeInTheDocument();
		});

		it("should render credentials section with masked API token", () => {
			const source = createMockSource({
				settings: {
					url: "https://company.atlassian.net",
					email: "user@company.com",
					token: "secret-token-123",
				},
			});
			renderWithRouter(<ConnectionStatusCard source={source} />);

			// Check API label (i18n key)
			expect(
				screen.getByText("statusCard.labels.apiToken"),
			).toBeInTheDocument();
			// Check masked value
			expect(screen.getByText(/••••••••••••••••••••/)).toBeInTheDocument();
		});

		it("should render credentials section with ServiceNow-specific labels", () => {
			const source = createMockSource({
				type: "servicenow",
				settings: {
					instanceUrl: "https://company.service-now.com",
					username: "admin",
				},
			});
			renderWithRouter(<ConnectionStatusCard source={source} />);

			// ServiceNow uses username/password labels (i18n keys)
			expect(
				screen.getByText("statusCard.labels.username"),
			).toBeInTheDocument();
			expect(
				screen.getByText("statusCard.labels.password"),
			).toBeInTheDocument();
		});

		it("should show dash for missing URL", () => {
			const source = createMockSource({
				settings: {},
			});
			renderWithRouter(<ConnectionStatusCard source={source} />);

			// Check URL label (i18n key)
			expect(screen.getByText("statusCard.labels.url")).toBeInTheDocument();
			// Check dash for missing values (URL, email, etc.)
			expect(screen.getAllByText("—").length).toBeGreaterThan(0);
		});
	});

	describe("Status Messages", () => {
		it("should show last synced message for connected status", () => {
			const source = createMockSource({
				status: STATUS.CONNECTED,
				lastSync: "2 hours ago",
			});
			renderWithRouter(<ConnectionStatusCard source={source} />);

			// i18n key for last synced
			expect(screen.getByText("statusCard.lastSynced")).toBeInTheDocument();
		});

		it("should show syncing message for syncing status", () => {
			const source = createMockSource({ status: STATUS.SYNCING });
			renderWithRouter(<ConnectionStatusCard source={source} />);

			// i18n key
			expect(
				screen.getByText("statusCard.syncingConnection"),
			).toBeInTheDocument();
		});

		it("should show verifying message for verifying status", () => {
			const source = createMockSource({ status: STATUS.VERIFYING });
			renderWithRouter(<ConnectionStatusCard source={source} />);

			// i18n key
			expect(
				screen.getByText("statusCard.verifyingConnection"),
			).toBeInTheDocument();
		});

		it("should show not configured message for not connected status", () => {
			const source = createMockSource({ status: STATUS.NOT_CONNECTED });
			renderWithRouter(<ConnectionStatusCard source={source} />);

			// i18n key
			expect(screen.getByText("statusCard.notConfigured")).toBeInTheDocument();
		});

		it("should show connection failed message for error status", () => {
			const source = createMockSource({ status: STATUS.ERROR });
			renderWithRouter(<ConnectionStatusCard source={source} />);

			// i18n key
			expect(
				screen.getByText("statusCard.connectionFailed"),
			).toBeInTheDocument();
		});

		it("should hide status message when hideStatusMessage is true", () => {
			const source = createMockSource({ status: STATUS.CONNECTED });
			renderWithRouter(
				<ConnectionStatusCard source={source} hideStatusMessage />,
			);

			// Status message should not be visible
			expect(
				screen.queryByText("statusCard.lastSynced"),
			).not.toBeInTheDocument();
		});
	});

	describe("Retry Functionality", () => {
		it("should show retry button for error status", () => {
			const source = createMockSource({ status: STATUS.ERROR });
			renderWithRouter(<ConnectionStatusCard source={source} />);

			// i18n key for retry button
			const retryButton = screen.getByRole("button", {
				name: /statusCard.retry/i,
			});
			expect(retryButton).toBeInTheDocument();
		});

		it("should call onRetry when retry button is clicked", () => {
			const source = createMockSource({ status: STATUS.ERROR });
			const onRetry = vi.fn();
			renderWithRouter(
				<ConnectionStatusCard source={source} onRetry={onRetry} />,
			);

			const retryButton = screen.getByRole("button", {
				name: /statusCard.retry/i,
			});
			fireEvent.click(retryButton);

			expect(onRetry).toHaveBeenCalledTimes(1);
		});

		it("should show Get Help after 3 retries", async () => {
			const source = createMockSource({ status: STATUS.ERROR });
			renderWithRouter(<ConnectionStatusCard source={source} />);

			const retryButton = screen.getByRole("button", {
				name: /statusCard.retry/i,
			});

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

			// After third click, retryCount = 3, help button should appear (i18n key)
			await waitFor(() =>
				expect(
					screen.getByRole("button", { name: /statusCard.getHelp/i }),
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

			const retryButton = screen.getByRole("button", {
				name: /statusCard.retry/i,
			});
			fireEvent.click(retryButton);

			// After clicking retry, parent would update status to SYNCING via backend
			// Simulate this by re-rendering with SYNCING status
			const syncingSource = createMockSource({ status: STATUS.SYNCING });
			rerender(
				<MemoryRouter>
					<ConnectionStatusCard source={syncingSource} />
				</MemoryRouter>,
			);

			// i18n key for retrying
			expect(screen.getByText("statusCard.retrying")).toBeInTheDocument();
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
				settings: {
					instanceUrl: "https://company.service-now.com",
					username: "admin",
				},
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
	});

	describe("Ticket Sync Info", () => {
		it("should show ticket importing progress when isTicketSyncing is true", () => {
			const source = createMockSource({ status: STATUS.CONNECTED });
			const ticketSyncInfo = {
				lastSyncAt: null,
				recordsProcessed: 50,
				isTicketSyncing: true,
				totalEstimated: 100,
			};
			renderWithRouter(
				<ConnectionStatusCard
					source={source}
					ticketSyncInfo={ticketSyncInfo}
				/>,
			);

			// i18n key for progress
			expect(
				screen.getByText("statusCard.ticketsProgress"),
			).toBeInTheDocument();
		});

		it("should show importing tickets spinner when no total estimated", () => {
			const source = createMockSource({ status: STATUS.CONNECTED });
			const ticketSyncInfo = {
				lastSyncAt: null,
				recordsProcessed: 0,
				isTicketSyncing: true,
			};
			renderWithRouter(
				<ConnectionStatusCard
					source={source}
					ticketSyncInfo={ticketSyncInfo}
				/>,
			);

			// i18n key
			expect(
				screen.getByText("statusCard.importingTickets"),
			).toBeInTheDocument();
		});

		it("should show last sync info when not syncing", () => {
			const source = createMockSource({ status: STATUS.CONNECTED });
			const ticketSyncInfo = {
				lastSyncAt: "2024-01-02T00:00:00Z",
				recordsProcessed: 150,
				isTicketSyncing: false,
			};
			renderWithRouter(
				<ConnectionStatusCard
					source={source}
					ticketSyncInfo={ticketSyncInfo}
				/>,
			);

			// i18n key for last synced
			expect(screen.getByText("statusCard.lastSynced")).toBeInTheDocument();
		});
	});
});
