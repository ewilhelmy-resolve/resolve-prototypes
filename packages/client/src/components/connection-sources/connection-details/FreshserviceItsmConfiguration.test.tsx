/**
 * FreshserviceItsmConfiguration.test.tsx - Unit tests for Freshservice ITSM ticket sync configuration
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectionSource } from "@/constants/connectionSources";
import { STATUS } from "@/constants/connectionSources";
import { ConnectionSourceProvider } from "@/contexts/ConnectionSourceContext";
import FreshserviceItsmConfiguration from "./FreshserviceItsmConfiguration";

// Mock react-router-dom (needed by ConnectionStatusCard)
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
	useNavigate: () => mockNavigate,
}));

// Mock hooks
const mockSyncTicketsMutation = {
	mutateAsync: vi.fn().mockResolvedValue({}),
	isPending: false,
};

const mockCancelMutation = {
	mutateAsync: vi.fn().mockResolvedValue({}),
	isPending: false,
};

const mockUpdateMutation = {
	mutateAsync: vi.fn().mockResolvedValue({}),
	isPending: false,
};

const mockLatestIngestionRunQuery = {
	data: null as {
		status: string;
		records_processed: number;
		records_failed?: number;
		completed_at?: string | null;
		metadata: Record<string, unknown>;
	} | null,
};

vi.mock("@/hooks/useDataSources", () => ({
	useSyncTickets: vi.fn(() => mockSyncTicketsMutation),
	useLatestIngestionRun: vi.fn(() => mockLatestIngestionRunQuery),
	useCancelIngestion: vi.fn(() => mockCancelMutation),
	useUpdateDataSource: vi.fn(() => mockUpdateMutation),
}));

const mockActiveModelQuery = {
	data: null as {
		active?: boolean;
		metadata?: { training_state?: string };
	} | null,
};

vi.mock("@/hooks/useActiveModel", () => ({
	useActiveModel: vi.fn(() => mockActiveModelQuery),
}));

vi.mock("@/components/custom/rita-toast", () => ({
	ritaToast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("@/constants/connectionSources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/constants/connectionSources")>();
	return {
		...actual,
		formatRelativeTime: vi.fn(() => "2 hours ago"),
	};
});

// Mock connection source
const createMockSource = (
	overrides?: Partial<ConnectionSource>,
): ConnectionSource => ({
	id: "source-123",
	type: "freshservice_itsm",
	title: "Freshservice",
	status: STATUS.CONNECTED,
	lastSync: "2 hours ago",
	badges: [],
	backendData: {
		id: "source-123",
		organization_id: "org-123",
		type: "freshservice_itsm",
		name: "Freshservice",
		description: null,
		settings: {
			url: "https://company.freshservice.com",
			email: "user@company.com",
		},
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
		updated_at: "2024-01-02T00:00:00Z",
	},
	...overrides,
});

const renderWithProvider = (source: ConnectionSource, onEdit?: () => void) => {
	return render(
		<ConnectionSourceProvider source={source}>
			<FreshserviceItsmConfiguration onEdit={onEdit} />
		</ConnectionSourceProvider>,
	);
};

describe("FreshserviceItsmConfiguration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSyncTicketsMutation.mutateAsync = vi.fn().mockResolvedValue({});
		mockSyncTicketsMutation.isPending = false;
		mockCancelMutation.mutateAsync = vi.fn().mockResolvedValue({});
		mockCancelMutation.isPending = false;
		mockLatestIngestionRunQuery.data = null;
		mockActiveModelQuery.data = null;
	});

	it("should render configuration title", () => {
		const source = createMockSource();
		renderWithProvider(source);
		expect(
			screen.getByText("config.titles.freshserviceItsm"),
		).toBeInTheDocument();
	});

	it("should render ConnectionStatusCard", () => {
		const source = createMockSource();
		renderWithProvider(source);
		expect(screen.getByText("Connected")).toBeInTheDocument();
	});

	it("should render Import Tickets button when not syncing", () => {
		const source = createMockSource();
		renderWithProvider(source);
		expect(screen.getByText("config.sync.importTickets")).toBeInTheDocument();
	});

	it("should trigger syncTickets with correct params on Import Tickets click", async () => {
		const source = createMockSource();
		renderWithProvider(source);

		const importButton = screen.getByText("config.sync.importTickets");
		fireEvent.click(importButton);

		await waitFor(() => {
			expect(mockSyncTicketsMutation.mutateAsync).toHaveBeenCalledWith({
				id: "source-123",
				timeRangeDays: 30,
			});
		});
	});

	it("should show Cancel button when syncing", () => {
		mockLatestIngestionRunQuery.data = {
			status: "running",
			records_processed: 42,
			metadata: { progress: { total_estimated: 100 } },
		};

		const source = createMockSource();
		renderWithProvider(source);

		expect(screen.getByText("config.sync.cancelSync")).toBeInTheDocument();
		expect(
			screen.queryByText("config.sync.importTickets"),
		).not.toBeInTheDocument();
	});

	it("should trigger cancelMutation on Cancel button click", async () => {
		mockLatestIngestionRunQuery.data = {
			status: "running",
			records_processed: 0,
			metadata: {},
		};

		const source = createMockSource();
		renderWithProvider(source);

		const cancelButton = screen.getByText("config.sync.cancelSync");
		fireEvent.click(cancelButton);

		await waitFor(() => {
			expect(mockCancelMutation.mutateAsync).toHaveBeenCalledWith("source-123");
		});
	});

	it("should show progress bar when syncing with total_estimated", () => {
		mockLatestIngestionRunQuery.data = {
			status: "running",
			records_processed: 42,
			metadata: { progress: { total_estimated: 100 } },
		};

		const source = createMockSource();
		renderWithProvider(source);

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("should show ticketsOf text with correct counts when syncing with progress", () => {
		mockLatestIngestionRunQuery.data = {
			status: "running",
			records_processed: 42,
			metadata: { progress: { total_estimated: 100 } },
		};

		const source = createMockSource();
		renderWithProvider(source);

		expect(screen.getByText("config.sync.ticketsOf")).toBeInTheDocument();
	});

	it("should show loader and importingTickets text when syncing without progress estimate", () => {
		mockLatestIngestionRunQuery.data = {
			status: "running",
			records_processed: 0,
			metadata: {},
		};

		const source = createMockSource();
		renderWithProvider(source);

		expect(
			screen.getByText("config.sync.importingTickets"),
		).toBeInTheDocument();
	});

	it("should show lastSynced text when completed", () => {
		mockLatestIngestionRunQuery.data = {
			status: "completed",
			completed_at: "2024-01-02T00:00:00Z",
			records_processed: 1234,
			records_failed: 0,
			metadata: {},
		};

		const source = createMockSource();
		renderWithProvider(source);

		expect(screen.getByText("config.sync.lastSynced")).toBeInTheDocument();
	});

	it("should show ticket count when records_processed > 0", () => {
		mockLatestIngestionRunQuery.data = {
			status: "completed",
			completed_at: "2024-01-02T00:00:00Z",
			records_processed: 1234,
			records_failed: 0,
			metadata: {},
		};

		const source = createMockSource();
		renderWithProvider(source);

		// ticketsCount is rendered inside a <span> within the lastSynced <p>,
		// so we need a partial text match
		expect(screen.getByText(/config\.sync\.ticketsCount/)).toBeInTheDocument();
	});

	it("should show failed icon when records_failed > 0", () => {
		mockLatestIngestionRunQuery.data = {
			status: "completed",
			completed_at: "2024-01-02T00:00:00Z",
			records_processed: 1234,
			records_failed: 5,
			metadata: {},
		};

		const source = createMockSource();
		renderWithProvider(source);

		// AlertCircle icon is rendered inside a TooltipTrigger with cursor-help class
		const failedIcon = document.querySelector(".text-amber-500");
		expect(failedIcon).toBeInTheDocument();
	});

	it("should show noTicketsYet when no ingestion run", () => {
		mockLatestIngestionRunQuery.data = null;

		const source = createMockSource();
		renderWithProvider(source);

		expect(screen.getByText("config.sync.noTicketsYet")).toBeInTheDocument();
	});

	it("should show training banner when isTraining", () => {
		mockActiveModelQuery.data = {
			metadata: { training_state: "in_progress" },
		};

		const source = createMockSource();
		renderWithProvider(source);

		expect(screen.getByText("config.training.inProgress")).toBeInTheDocument();
		expect(screen.getByText("config.training.description")).toBeInTheDocument();
	});

	it("should not show training banner when not training", () => {
		mockActiveModelQuery.data = {
			metadata: { training_state: "complete" },
		};

		const source = createMockSource();
		renderWithProvider(source);

		expect(
			screen.queryByText("config.training.inProgress"),
		).not.toBeInTheDocument();
	});

	it("should disable sync button when syncing", () => {
		mockLatestIngestionRunQuery.data = {
			status: "pending",
			records_processed: 0,
			metadata: {},
		};

		const source = createMockSource();
		renderWithProvider(source);

		// When isTicketSyncing is true, the Cancel button is shown instead of Import
		// Verify Import Tickets is not rendered
		expect(
			screen.queryByText("config.sync.importTickets"),
		).not.toBeInTheDocument();
	});

	describe("Error and Verifying State Handling", () => {
		it("should hide sync section when status is ERROR", () => {
			const source = createMockSource({ status: STATUS.ERROR });
			renderWithProvider(source);

			expect(
				screen.queryByText("config.sync.importTickets"),
			).not.toBeInTheDocument();
			expect(
				screen.queryByText("config.labels.importFromLast"),
			).not.toBeInTheDocument();
		});

		it("should hide sync section when status is VERIFYING", () => {
			const source = createMockSource({ status: STATUS.VERIFYING });
			renderWithProvider(source);

			expect(
				screen.queryByText("config.sync.importTickets"),
			).not.toBeInTheDocument();
			expect(
				screen.queryByText("config.labels.importFromLast"),
			).not.toBeInTheDocument();
		});

		it("should still show ConnectionStatusCard when status is ERROR", () => {
			const source = createMockSource({ status: STATUS.ERROR });
			renderWithProvider(source);

			expect(screen.getByText("Failed")).toBeInTheDocument();
		});

		it("should still show title when status is ERROR", () => {
			const source = createMockSource({ status: STATUS.ERROR });
			renderWithProvider(source);

			expect(
				screen.getByText("config.titles.freshserviceItsm"),
			).toBeInTheDocument();
		});
	});

	describe("AutoSyncToggle", () => {
		it("should render AutoSyncToggle when backendData exists", () => {
			// AutoSyncToggle only renders when activeModel.active is truthy
			mockActiveModelQuery.data = { active: true };

			const source = createMockSource();
			renderWithProvider(source);

			expect(screen.getByRole("switch")).toBeInTheDocument();
		});

		it("should pass disabled=true to AutoSyncToggle when syncing", () => {
			mockActiveModelQuery.data = { active: true };
			mockLatestIngestionRunQuery.data = {
				status: "running",
				records_processed: 0,
				metadata: {},
			};

			const source = createMockSource();
			renderWithProvider(source);

			expect(screen.getByRole("switch")).toHaveAttribute(
				"aria-disabled",
				"true",
			);
		});

		it("should pass disabled=false to AutoSyncToggle when not syncing", () => {
			mockActiveModelQuery.data = { active: true };
			mockLatestIngestionRunQuery.data = null;

			const source = createMockSource();
			renderWithProvider(source);

			expect(screen.getByRole("switch")).not.toBeDisabled();
		});
	});

	describe("Toast Notifications", () => {
		it("should show success toast on sync start", async () => {
			const { ritaToast } = await import("@/components/custom/rita-toast");
			const source = createMockSource();
			renderWithProvider(source);

			const importButton = screen.getByText("config.sync.importTickets");
			fireEvent.click(importButton);

			await waitFor(() => {
				expect(ritaToast.success).toHaveBeenCalledWith({
					title: "config.toast.syncStarted",
					description: "config.toast.syncStartedFreshservice",
				});
			});
		});

		it("should show error toast on sync failure", async () => {
			const { ritaToast } = await import("@/components/custom/rita-toast");
			mockSyncTicketsMutation.mutateAsync = vi
				.fn()
				.mockRejectedValueOnce(new Error("Sync failed"));

			const source = createMockSource();
			renderWithProvider(source);

			const importButton = screen.getByText("config.sync.importTickets");
			fireEvent.click(importButton);

			await waitFor(() => {
				expect(ritaToast.error).toHaveBeenCalledWith({
					title: "config.toast.syncFailed",
					description: "Sync failed",
				});
			});
		});

		it("should show error toast when backendData is missing", async () => {
			const { ritaToast } = await import("@/components/custom/rita-toast");
			const source = createMockSource({ backendData: undefined });
			renderWithProvider(source);

			const importButton = screen.getByText("config.sync.importTickets");
			fireEvent.click(importButton);

			await waitFor(() => {
				expect(ritaToast.error).toHaveBeenCalledWith({
					title: "config.toast.configError",
					description: "config.toast.noBackendData",
				});
			});
		});

		it("should show success toast on cancel sync", async () => {
			const { ritaToast } = await import("@/components/custom/rita-toast");
			mockLatestIngestionRunQuery.data = {
				status: "running",
				records_processed: 10,
				metadata: {},
			};

			const source = createMockSource();
			renderWithProvider(source);

			const cancelButton = screen.getByText("config.sync.cancelSync");
			fireEvent.click(cancelButton);

			await waitFor(() => {
				expect(ritaToast.success).toHaveBeenCalledWith({
					title: "config.toast.syncCancelled",
					description: "config.toast.syncCancelledDesc",
				});
			});
		});
	});
});
